-- Comprehensive Inventory and Auto-Journal System
-- This script creates tables and functions for automatic journal entries and stock tracking

-- =====================================================
-- 1. STOCK TRACKING TABLES
-- =====================================================

-- Create stock_items table to track current inventory levels
CREATE TABLE IF NOT EXISTS stock_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES companies(id) NOT NULL,
    item_id UUID REFERENCES items(id) NOT NULL,
    warehouse_id UUID DEFAULT NULL, -- For future multi-warehouse support
    current_quantity DECIMAL(15,3) DEFAULT 0.00,
    reserved_quantity DECIMAL(15,3) DEFAULT 0.00, -- Quantity reserved for pending orders
    available_quantity DECIMAL(15,3) GENERATED ALWAYS AS (current_quantity - reserved_quantity) STORED,
    reorder_level DECIMAL(15,3) DEFAULT 0.00,
    max_level DECIMAL(15,3) DEFAULT 0.00,
    average_cost DECIMAL(15,4) DEFAULT 0.00, -- Weighted average cost
    last_cost DECIMAL(15,4) DEFAULT 0.00, -- Last purchase cost
    total_value DECIMAL(15,2) GENERATED ALWAYS AS (current_quantity * average_cost) STORED,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, item_id, warehouse_id)
);

-- Create stock_movements table to track all inventory movements
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES companies(id) NOT NULL,
    item_id UUID REFERENCES items(id) NOT NULL,
    warehouse_id UUID DEFAULT NULL,
    movement_type VARCHAR(20) NOT NULL, -- IN, OUT, ADJUSTMENT, TRANSFER
    movement_source VARCHAR(20) NOT NULL, -- PURCHASE, SALE, ADJUSTMENT, PRODUCTION, OPENING
    reference_type VARCHAR(30), -- sales_invoice, purchase_invoice, journal_entry, etc.
    reference_id UUID, -- ID of the source document
    reference_number VARCHAR(50), -- Document number for easy reference
    quantity DECIMAL(15,3) NOT NULL,
    unit_cost DECIMAL(15,4) DEFAULT 0.00,
    total_cost DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    created_by UUID DEFAULT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. AUTO-JOURNAL CONFIGURATION TABLES
-- =====================================================

-- Create auto_journal_config table to define accounting rules
CREATE TABLE IF NOT EXISTS auto_journal_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES companies(id) NOT NULL,
    transaction_type VARCHAR(30) NOT NULL, -- SALES_INVOICE, PURCHASE_INVOICE, STOCK_IN, STOCK_OUT
    account_mapping JSONB NOT NULL, -- Flexible account mapping configuration
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, transaction_type)
);

-- =====================================================
-- 3. INDEXES FOR PERFORMANCE
-- =====================================================

-- Stock items indexes
CREATE INDEX IF NOT EXISTS idx_stock_items_company_item ON stock_items(company_id, item_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_warehouse ON stock_items(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_reorder ON stock_items(company_id) WHERE current_quantity <= reorder_level;

-- Stock movements indexes
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_item ON stock_movements(company_id, item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_source ON stock_movements(movement_source);

-- Auto journal config indexes
CREATE INDEX IF NOT EXISTS idx_auto_journal_config_company ON auto_journal_config(company_id);
CREATE INDEX IF NOT EXISTS idx_auto_journal_config_type ON auto_journal_config(transaction_type);

-- =====================================================
-- 4. FUNCTIONS FOR STOCK MANAGEMENT
-- =====================================================

-- Function to initialize stock item if it doesn't exist
CREATE OR REPLACE FUNCTION initialize_stock_item(
    p_company_id UUID,
    p_item_id UUID,
    p_warehouse_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    stock_item_id UUID;
BEGIN
    -- Check if stock item already exists
    SELECT id INTO stock_item_id
    FROM stock_items
    WHERE company_id = p_company_id 
    AND item_id = p_item_id 
    AND COALESCE(warehouse_id, gen_random_uuid()) = COALESCE(p_warehouse_id, gen_random_uuid());
    
    -- If not exists, create it
    IF stock_item_id IS NULL THEN
        INSERT INTO stock_items (company_id, item_id, warehouse_id, current_quantity, average_cost)
        VALUES (p_company_id, p_item_id, p_warehouse_id, 0, 0)
        RETURNING id INTO stock_item_id;
    END IF;
    
    RETURN stock_item_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update stock levels and calculate weighted average cost
CREATE OR REPLACE FUNCTION update_stock_levels(
    p_company_id UUID,
    p_item_id UUID,
    p_quantity DECIMAL(15,3),
    p_unit_cost DECIMAL(15,4),
    p_movement_type VARCHAR(20),
    p_warehouse_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    current_qty DECIMAL(15,3);
    current_avg_cost DECIMAL(15,4);
    new_avg_cost DECIMAL(15,4);
    new_qty DECIMAL(15,3);
BEGIN
    -- Initialize stock item if it doesn't exist
    PERFORM initialize_stock_item(p_company_id, p_item_id, p_warehouse_id);
    
    -- Get current values
    SELECT current_quantity, average_cost
    INTO current_qty, current_avg_cost
    FROM stock_items
    WHERE company_id = p_company_id 
    AND item_id = p_item_id 
    AND COALESCE(warehouse_id, gen_random_uuid()) = COALESCE(p_warehouse_id, gen_random_uuid());
    
    -- Calculate new quantity
    IF p_movement_type = 'IN' THEN
        new_qty := current_qty + p_quantity;
        
        -- Calculate weighted average cost for stock in movements
        IF new_qty > 0 AND p_unit_cost > 0 THEN
            new_avg_cost := ((current_qty * current_avg_cost) + (p_quantity * p_unit_cost)) / new_qty;
        ELSE
            new_avg_cost := current_avg_cost;
        END IF;
    ELSE -- OUT or ADJUSTMENT
        new_qty := current_qty - p_quantity;
        new_avg_cost := current_avg_cost; -- Keep same average cost for out movements
    END IF;
    
    -- Ensure quantity doesn't go negative (optional: you might want to allow negative for backorders)
    IF new_qty < 0 THEN
        new_qty := 0;
    END IF;
    
    -- Update stock item
    UPDATE stock_items
    SET 
        current_quantity = new_qty,
        average_cost = new_avg_cost,
        last_cost = CASE WHEN p_movement_type = 'IN' THEN p_unit_cost ELSE last_cost END,
        updated_at = NOW()
    WHERE company_id = p_company_id 
    AND item_id = p_item_id 
    AND COALESCE(warehouse_id, gen_random_uuid()) = COALESCE(p_warehouse_id, gen_random_uuid());
END;
$$ LANGUAGE plpgsql;

-- Function to create stock movement record
CREATE OR REPLACE FUNCTION create_stock_movement(
    p_company_id UUID,
    p_item_id UUID,
    p_quantity DECIMAL(15,3),
    p_unit_cost DECIMAL(15,4),
    p_movement_type VARCHAR(20),
    p_movement_source VARCHAR(20),
    p_reference_type VARCHAR(30),
    p_reference_id UUID,
    p_reference_number VARCHAR(50),
    p_description TEXT DEFAULT NULL,
    p_warehouse_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    movement_id UUID;
BEGIN
    -- Create the stock movement record
    INSERT INTO stock_movements (
        company_id, item_id, warehouse_id, movement_type, movement_source,
        reference_type, reference_id, reference_number, quantity, unit_cost,
        description
    )
    VALUES (
        p_company_id, p_item_id, p_warehouse_id, p_movement_type, p_movement_source,
        p_reference_type, p_reference_id, p_reference_number, p_quantity, p_unit_cost,
        p_description
    )
    RETURNING id INTO movement_id;
    
    -- Update stock levels
    PERFORM update_stock_levels(
        p_company_id, p_item_id, p_quantity, p_unit_cost, 
        p_movement_type, p_warehouse_id
    );
    
    RETURN movement_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. FUNCTIONS FOR AUTO JOURNAL ENTRIES
-- =====================================================

-- Function to create journal entry from sales invoice
CREATE OR REPLACE FUNCTION create_sales_invoice_journal_entry(
    p_invoice_id UUID
)
RETURNS UUID AS $$
DECLARE
    invoice_record RECORD;
    customer_record RECORD;
    line_item RECORD;
    journal_entry_id UUID;
    entry_number VARCHAR(50);
    line_number INTEGER := 1;
    total_debit DECIMAL(15,2) := 0;
    total_credit DECIMAL(15,2) := 0;
BEGIN
    -- Get invoice details
    SELECT * INTO invoice_record
    FROM sales_invoices
    WHERE id = p_invoice_id;
    
    -- Get customer details
    SELECT * INTO customer_record
    FROM customers
    WHERE id = invoice_record.customer_id;
    
    -- Generate journal entry number
    entry_number := 'SI-JE-' || invoice_record.invoice_number;
    
    -- Create journal entry
    INSERT INTO journal_entries (
        company_id, entry_number, entry_date, reference, memo, status,
        total_debit, total_credit, is_balanced
    )
    VALUES (
        invoice_record.company_id, entry_number, invoice_record.invoice_date,
        'Sales Invoice: ' || invoice_record.invoice_number,
        'Auto-generated from Sales Invoice: ' || invoice_record.invoice_number,
        'POSTED', 0, 0, true
    )
    RETURNING id INTO journal_entry_id;
    
    -- Debit: Accounts Receivable
    INSERT INTO journal_entry_lines (
        journal_entry_id, account_id, line_number, description,
        debit_amount, credit_amount
    )
    VALUES (
        journal_entry_id, 
        customer_record.receivable_account_id,
        line_number,
        'Sales to ' || customer_record.name,
        invoice_record.total_amount,
        0
    );
    total_debit := total_debit + invoice_record.total_amount;
    line_number := line_number + 1;
    
    -- Credit: Sales Revenue (for each line item)
    FOR line_item IN 
        SELECT ili.*, i.income_account_id
        FROM invoice_line_items ili
        LEFT JOIN items i ON ili.item_id = i.id
        WHERE ili.invoice_id = p_invoice_id
    LOOP
        INSERT INTO journal_entry_lines (
            journal_entry_id, 
            account_id,
            line_number, 
            description,
            debit_amount, 
            credit_amount
        )
        VALUES (
            journal_entry_id,
            COALESCE(line_item.income_account_id, 
                (SELECT id FROM chart_of_accounts 
                 WHERE company_id = invoice_record.company_id 
                 AND account_name ILIKE '%sales%' 
                 LIMIT 1)
            ),
            line_number,
            line_item.item_name || ' - ' || COALESCE(line_item.description, ''),
            0,
            line_item.line_total - line_item.tax_amount
        );
        total_credit := total_credit + (line_item.line_total - line_item.tax_amount);
        line_number := line_number + 1;
        
        -- Create stock movement for inventory items
        IF line_item.item_id IS NOT NULL THEN
            PERFORM create_stock_movement(
                invoice_record.company_id,
                line_item.item_id,
                line_item.quantity,
                0, -- Cost is 0 for sales (we'll use average cost)
                'OUT',
                'SALE',
                'sales_invoice',
                p_invoice_id,
                invoice_record.invoice_number,
                'Sale to ' || customer_record.name
            );
        END IF;
    END LOOP;
    
    -- Credit: Tax Payable (if there's tax)
    IF invoice_record.tax_amount > 0 THEN
        INSERT INTO journal_entry_lines (
            journal_entry_id,
            account_id,
            line_number,
            description,
            debit_amount,
            credit_amount
        )
        VALUES (
            journal_entry_id,
            (SELECT id FROM chart_of_accounts 
             WHERE company_id = invoice_record.company_id 
             AND account_name ILIKE '%tax%payable%' 
             LIMIT 1),
            line_number,
            'Sales Tax on Invoice ' || invoice_record.invoice_number,
            0,
            invoice_record.tax_amount
        );
        total_credit := total_credit + invoice_record.tax_amount;
    END IF;
    
    -- Update journal entry totals
    UPDATE journal_entries
    SET 
        total_debit = total_debit,
        total_credit = total_credit,
        is_balanced = (total_debit = total_credit)
    WHERE id = journal_entry_id;
    
    RETURN journal_entry_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create journal entry from purchase invoice
CREATE OR REPLACE FUNCTION create_purchase_invoice_journal_entry(
    p_invoice_id UUID
)
RETURNS UUID AS $$
DECLARE
    invoice_record RECORD;
    supplier_record RECORD;
    line_item RECORD;
    journal_entry_id UUID;
    entry_number VARCHAR(50);
    line_number INTEGER := 1;
    total_debit DECIMAL(15,2) := 0;
    total_credit DECIMAL(15,2) := 0;
BEGIN
    -- Get invoice details
    SELECT * INTO invoice_record
    FROM purchase_invoices
    WHERE id = p_invoice_id;
    
    -- Get supplier details
    SELECT * INTO supplier_record
    FROM suppliers
    WHERE id = invoice_record.supplier_id;
    
    -- Generate journal entry number
    entry_number := 'PI-JE-' || invoice_record.invoice_number;
    
    -- Create journal entry
    INSERT INTO journal_entries (
        company_id, entry_number, entry_date, reference, memo, status,
        total_debit, total_credit, is_balanced
    )
    VALUES (
        invoice_record.company_id, entry_number, invoice_record.invoice_date,
        'Purchase Invoice: ' || invoice_record.invoice_number,
        'Auto-generated from Purchase Invoice: ' || invoice_record.invoice_number,
        'POSTED', 0, 0, true
    )
    RETURNING id INTO journal_entry_id;
    
    -- Debit: Inventory/Expense (for each line item)
    FOR line_item IN 
        SELECT pili.*, i.expense_account_id
        FROM purchase_invoice_line_items pili
        LEFT JOIN items i ON pili.item_id = i.id
        WHERE pili.invoice_id = p_invoice_id
    LOOP
        INSERT INTO journal_entry_lines (
            journal_entry_id,
            account_id,
            line_number,
            description,
            debit_amount,
            credit_amount
        )
        VALUES (
            journal_entry_id,
            COALESCE(line_item.expense_account_id,
                (SELECT id FROM chart_of_accounts 
                 WHERE company_id = invoice_record.company_id 
                 AND account_name ILIKE '%inventory%' 
                 LIMIT 1)
            ),
            line_number,
            line_item.item_name || ' - ' || COALESCE(line_item.description, ''),
            line_item.line_total - line_item.tax_amount,
            0
        );
        total_debit := total_debit + (line_item.line_total - line_item.tax_amount);
        line_number := line_number + 1;
        
        -- Create stock movement for inventory items
        IF line_item.item_id IS NOT NULL THEN
            PERFORM create_stock_movement(
                invoice_record.company_id,
                line_item.item_id,
                line_item.quantity,
                line_item.unit_price,
                'IN',
                'PURCHASE',
                'purchase_invoice',
                p_invoice_id,
                invoice_record.invoice_number,
                'Purchase from ' || supplier_record.name
            );
        END IF;
    END LOOP;
    
    -- Debit: Tax Receivable (if there's tax)
    IF invoice_record.tax_amount > 0 THEN
        INSERT INTO journal_entry_lines (
            journal_entry_id,
            account_id,
            line_number,
            description,
            debit_amount,
            credit_amount
        )
        VALUES (
            journal_entry_id,
            (SELECT id FROM chart_of_accounts 
             WHERE company_id = invoice_record.company_id 
             AND account_name ILIKE '%tax%receivable%' 
             LIMIT 1),
            line_number,
            'Purchase Tax on Invoice ' || invoice_record.invoice_number,
            invoice_record.tax_amount,
            0
        );
        total_debit := total_debit + invoice_record.tax_amount;
        line_number := line_number + 1;
    END IF;
    
    -- Credit: Accounts Payable
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        account_id,
        line_number,
        description,
        debit_amount,
        credit_amount
    )
    VALUES (
        journal_entry_id,
        supplier_record.payable_account_id,
        line_number,
        'Purchase from ' || supplier_record.name,
        0,
        invoice_record.total_amount
    );
    total_credit := total_credit + invoice_record.total_amount;
    
    -- Update journal entry totals
    UPDATE journal_entries
    SET 
        total_debit = total_debit,
        total_credit = total_credit,
        is_balanced = (total_debit = total_credit)
    WHERE id = journal_entry_id;
    
    RETURN journal_entry_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. TRIGGERS FOR AUTO JOURNAL CREATION
-- =====================================================

-- Trigger function for sales invoice journal entry creation
CREATE OR REPLACE FUNCTION trigger_create_sales_invoice_journal()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create journal entry when status changes to SUBMITTED or PAID
    IF NEW.status IN ('SUBMITTED', 'PAID') AND 
       (OLD IS NULL OR OLD.status != NEW.status) THEN
        
        -- Check if journal entry already exists
        IF NOT EXISTS (
            SELECT 1 FROM journal_entries 
            WHERE reference = 'Sales Invoice: ' || NEW.invoice_number
            AND company_id = NEW.company_id
        ) THEN
            PERFORM create_sales_invoice_journal_entry(NEW.id);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for purchase invoice journal entry creation
CREATE OR REPLACE FUNCTION trigger_create_purchase_invoice_journal()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create journal entry when status changes to RECEIVED or PAID
    IF NEW.status IN ('RECEIVED', 'PAID') AND 
       (OLD IS NULL OR OLD.status != NEW.status) THEN
        
        -- Check if journal entry already exists
        IF NOT EXISTS (
            SELECT 1 FROM journal_entries 
            WHERE reference = 'Purchase Invoice: ' || NEW.invoice_number
            AND company_id = NEW.company_id
        ) THEN
            PERFORM create_purchase_invoice_journal_entry(NEW.id);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: The triggers for auto journal creation are now handled by the dynamic system
-- Please run CREATE_DYNAMIC_ACCOUNT_MAPPING.sql for the complete dynamic account mapping system
-- This script focuses on inventory management only

-- =====================================================
-- 7. UTILITY FUNCTIONS AND VIEWS
-- =====================================================

-- Function to get current stock levels
CREATE OR REPLACE FUNCTION get_stock_levels(p_company_id UUID)
RETURNS TABLE (
    item_id UUID,
    item_code VARCHAR,
    item_name VARCHAR,
    current_quantity DECIMAL(15,3),
    available_quantity DECIMAL(15,3),
    average_cost DECIMAL(15,4),
    total_value DECIMAL(15,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        si.item_id,
        i.item_code,
        i.item_name,
        si.current_quantity,
        si.available_quantity,
        si.average_cost,
        si.total_value
    FROM stock_items si
    JOIN items i ON si.item_id = i.id
    WHERE si.company_id = p_company_id
    AND si.is_active = true
    ORDER BY i.item_code;
END;
$$ LANGUAGE plpgsql;

-- View for stock movement history
CREATE OR REPLACE VIEW stock_movement_history AS
SELECT 
    sm.*,
    i.item_code,
    i.item_name,
    CASE 
        WHEN sm.movement_type = 'IN' THEN sm.quantity
        ELSE 0
    END as quantity_in,
    CASE 
        WHEN sm.movement_type = 'OUT' THEN sm.quantity
        ELSE 0
    END as quantity_out
FROM stock_movements sm
JOIN items i ON sm.item_id = i.id
WHERE sm.is_active = true
ORDER BY sm.movement_date DESC, sm.created_at DESC;

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON stock_items TO authenticated;
GRANT ALL ON stock_movements TO authenticated;
GRANT ALL ON auto_journal_config TO authenticated;
GRANT SELECT ON stock_movement_history TO authenticated;

-- =====================================================
-- 9. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE stock_items IS 'Current inventory levels and valuations for each item';
COMMENT ON TABLE stock_movements IS 'Historical record of all inventory movements';
COMMENT ON TABLE auto_journal_config IS 'Configuration for automatic journal entry creation';

COMMENT ON FUNCTION create_stock_movement IS 'Creates stock movement and updates inventory levels';
COMMENT ON FUNCTION create_sales_invoice_journal_entry IS 'Auto-creates journal entry from sales invoice';
COMMENT ON FUNCTION create_purchase_invoice_journal_entry IS 'Auto-creates journal entry from purchase invoice';

SELECT 'Inventory and Auto-Journal System Created Successfully!' as status;
