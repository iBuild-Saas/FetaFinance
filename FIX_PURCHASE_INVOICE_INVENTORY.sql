-- Fix Purchase Invoice Inventory and Journal Entry Issues
-- This script ensures that when purchase invoices are marked as RECEIVED:
-- 1. Stock quantities are properly updated
-- 2. Journal entries are created
-- 3. Stock movements are recorded

-- =====================================================
-- 1. CHECK AND CREATE REQUIRED TABLES
-- =====================================================

-- Check if stock_items table exists, if not create it
CREATE TABLE IF NOT EXISTS stock_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    item_id UUID NOT NULL,
    current_quantity DECIMAL(10,3) DEFAULT 0,
    reserved_quantity DECIMAL(10,3) DEFAULT 0,
    available_quantity DECIMAL(10,3) DEFAULT 0,
    average_cost DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, item_id)
);

-- Check if stock_movements table exists, if not create it
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    item_id UUID NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_cost DECIMAL(15,2) NOT NULL,
    movement_type VARCHAR(10) NOT NULL CHECK (movement_type IN ('IN', 'OUT')),
    movement_source VARCHAR(50) NOT NULL,
    reference_type VARCHAR(50) NOT NULL,
    reference_id UUID NOT NULL,
    reference_number VARCHAR(100),
    description TEXT,
    movement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. CREATE REQUIRED FUNCTIONS
-- =====================================================

-- Function to create stock movement and update inventory
CREATE OR REPLACE FUNCTION create_stock_movement(
    p_company_id UUID,
    p_item_id UUID,
    p_quantity DECIMAL(10,3),
    p_unit_cost DECIMAL(15,2),
    p_movement_type VARCHAR(10),
    p_movement_source VARCHAR(50),
    p_reference_type VARCHAR(50),
    p_reference_id UUID,
    p_reference_number VARCHAR(100),
    p_description TEXT
)
RETURNS UUID AS $$
DECLARE
    v_stock_item_id UUID;
    v_movement_id UUID;
    v_current_quantity DECIMAL(10,3);
    v_new_quantity DECIMAL(10,3);
    v_new_average_cost DECIMAL(15,2);
BEGIN
    -- Get or create stock item record
    SELECT id, current_quantity INTO v_stock_item_id, v_current_quantity
    FROM stock_items 
    WHERE company_id = p_company_id AND item_id = p_item_id;
    
    IF NOT FOUND THEN
        -- Create new stock item record
        INSERT INTO stock_items (company_id, item_id, current_quantity, average_cost)
        VALUES (p_company_id, p_item_id, 0, p_unit_cost)
        RETURNING id INTO v_stock_item_id;
        v_current_quantity := 0;
    END IF;
    
    -- Calculate new quantity and average cost
    IF p_movement_type = 'IN' THEN
        v_new_quantity := v_current_quantity + p_quantity;
        -- Calculate weighted average cost
        IF v_current_quantity = 0 THEN
            v_new_average_cost := p_unit_cost;
        ELSE
            v_new_average_cost := ((v_current_quantity * (SELECT average_cost FROM stock_items WHERE id = v_stock_item_id)) + (p_quantity * p_unit_cost)) / v_new_quantity;
        END IF;
    ELSE -- OUT
        v_new_quantity := v_current_quantity - p_quantity;
        v_new_average_cost := (SELECT average_cost FROM stock_items WHERE id = v_stock_item_id);
        
        -- Check if we have enough stock
        IF v_new_quantity < 0 THEN
            RAISE EXCEPTION 'Insufficient stock for item %. Current: %, Attempted OUT: %', p_item_id, v_current_quantity, p_quantity;
        END IF;
    END IF;
    
    -- Create stock movement record
    INSERT INTO stock_movements (
        company_id, item_id, quantity, unit_cost, movement_type, movement_source,
        reference_type, reference_id, reference_number, description
    ) VALUES (
        p_company_id, p_item_id, p_quantity, p_unit_cost, p_movement_type, p_movement_source,
        p_reference_type, p_reference_id, p_reference_number, p_description
    ) RETURNING id INTO v_movement_id;
    
    -- Update stock item
    UPDATE stock_items 
    SET 
        current_quantity = v_new_quantity,
        available_quantity = v_new_quantity,
        average_cost = v_new_average_cost,
        updated_at = NOW()
    WHERE id = v_stock_item_id;
    
    RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;

-- Function to record stock movement from Purchase Invoice
CREATE OR REPLACE FUNCTION record_purchase_invoice_stock_movement(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
    v_invoice purchase_invoices%ROWTYPE;
    v_line_item purchase_invoice_line_items%ROWTYPE;
    v_item items%ROWTYPE;
BEGIN
    SELECT * INTO v_invoice FROM purchase_invoices WHERE id = p_invoice_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase Invoice with ID % not found.', p_invoice_id;
    END IF;

    -- Only record stock movement if status is RECEIVED or PAID
    IF v_invoice.status NOT IN ('RECEIVED', 'PAID') THEN
        RAISE NOTICE 'Stock movement not recorded for Purchase Invoice % (ID: %) because status is %.', v_invoice.invoice_number, p_invoice_id, v_invoice.status;
        RETURN;
    END IF;

    FOR v_line_item IN SELECT * FROM purchase_invoice_line_items WHERE invoice_id = p_invoice_id LOOP
        -- Check if item exists
        SELECT * INTO v_item FROM items WHERE id = v_line_item.item_id;
        IF NOT FOUND THEN
            RAISE NOTICE 'Item with ID % not found, skipping stock movement.', v_line_item.item_id;
            CONTINUE;
        END IF;

        -- Create stock movement using the new system
        PERFORM create_stock_movement(
            v_invoice.company_id, 
            v_line_item.item_id, 
            v_line_item.quantity,
            v_line_item.unit_price, 
            'IN', 
            'PURCHASE',
            'purchase_invoice', 
            v_invoice.id, 
            v_invoice.invoice_number,
            'Stock received from purchase invoice ' || v_invoice.invoice_number
        );
        
        RAISE NOTICE 'Stock movement created for item %: quantity %, unit price %', v_line_item.item_name, v_line_item.quantity, v_line_item.unit_price;
    END LOOP;
    
    RAISE NOTICE 'Stock movements recorded for Purchase Invoice % (ID: %).', v_invoice.invoice_number, p_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. CREATE TRIGGERS
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trg_purchase_invoice_stock_movement ON purchase_invoices;

-- Trigger for Purchase Invoice status changes
CREATE OR REPLACE FUNCTION trigger_purchase_invoice_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('RECEIVED', 'PAID') AND OLD.status NOT IN ('RECEIVED', 'PAID') THEN
        PERFORM record_purchase_invoice_stock_movement(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_purchase_invoice_stock_movement
AFTER UPDATE OF status ON purchase_invoices
FOR EACH ROW
EXECUTE FUNCTION trigger_purchase_invoice_stock_movement();

-- =====================================================
-- 4. CREATE JOURNAL ENTRY FUNCTION
-- =====================================================

-- Function to create journal entry from purchase invoice
CREATE OR REPLACE FUNCTION create_purchase_invoice_journal_entry(p_invoice_id UUID)
RETURNS UUID AS $$
DECLARE
    v_invoice purchase_invoices%ROWTYPE;
    v_line_item purchase_invoice_line_items%ROWTYPE;
    v_journal_entry_id UUID;
    v_line_number INTEGER := 1;
    v_total_amount DECIMAL(15,2);
    v_accounts_payable_id UUID;
    v_inventory_account_id UUID;
    v_tax_account_id UUID;
    v_discount_account_id UUID;
BEGIN
    -- Get invoice details
    SELECT * INTO v_invoice FROM purchase_invoices WHERE id = p_invoice_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase Invoice with ID % not found.', p_invoice_id;
    END IF;

    -- Only create journal entry if status is RECEIVED or PAID
    IF v_invoice.status NOT IN ('RECEIVED', 'PAID') THEN
        RAISE NOTICE 'Journal entry not created for Purchase Invoice % (ID: %) because status is %.', v_invoice.invoice_number, p_invoice_id, v_invoice.status;
        RETURN NULL;
    END IF;

    -- Check if journal entry already exists
    SELECT id INTO v_journal_entry_id 
    FROM journal_entries 
    WHERE reference_type = 'purchase_invoice' AND reference_id = p_invoice_id;
    
    IF FOUND THEN
        RAISE NOTICE 'Journal entry already exists for Purchase Invoice % (ID: %).', v_invoice.invoice_number, p_invoice_id;
        RETURN v_journal_entry_id;
    END IF;

    -- Get account IDs (you may need to adjust these based on your chart of accounts)
    SELECT id INTO v_accounts_payable_id FROM chart_of_accounts 
    WHERE company_id = v_invoice.company_id AND account_code LIKE '%2100%' LIMIT 1;
    
    SELECT id INTO v_inventory_account_id FROM chart_of_accounts 
    WHERE company_id = v_invoice.company_id AND account_code LIKE '%1130%' LIMIT 1;
    
    SELECT id INTO v_tax_account_id FROM chart_of_accounts 
    WHERE company_id = v_invoice.company_id AND account_code LIKE '%2120%' LIMIT 1;
    
    SELECT id INTO v_discount_account_id FROM chart_of_accounts 
    WHERE company_id = v_invoice.company_id AND account_code LIKE '%5200%' LIMIT 1;

    -- Create journal entry
    INSERT INTO journal_entries (
        company_id, entry_date, entry_number, description, status, reference_type, reference_id, reference_number
    ) VALUES (
        v_invoice.company_id, 
        v_invoice.invoice_date, 
        'JE-' || TO_CHAR(v_invoice.invoice_date, 'YYYYMMDD') || '-' || LPAD(CAST(nextval('journal_entry_number_seq') AS TEXT), 4, '0'),
        'Purchase Invoice ' || v_invoice.invoice_number || ' - Stock Received',
        'POSTED',
        'purchase_invoice',
        v_invoice.id,
        v_invoice.invoice_number
    ) RETURNING id INTO v_journal_entry_id;

    -- Create journal entry lines
    -- 1. Debit Inventory (Asset)
    IF v_inventory_account_id IS NOT NULL THEN
        INSERT INTO journal_entry_lines (
            journal_entry_id, account_id, line_number, description, debit_amount, credit_amount
        ) VALUES (
            v_journal_entry_id, v_inventory_account_id, v_line_number, 
            'Inventory received from ' || v_invoice.invoice_number, v_invoice.subtotal, 0
        );
        v_line_number := v_line_number + 1;
    END IF;

    -- 2. Debit Tax Expense (if any)
    IF v_invoice.tax_amount > 0 AND v_tax_account_id IS NOT NULL THEN
        INSERT INTO journal_entry_lines (
            journal_entry_id, account_id, line_number, description, debit_amount, credit_amount
        ) VALUES (
            v_journal_entry_id, v_tax_account_id, v_line_number, 
            'Tax on ' || v_invoice.invoice_number, v_invoice.tax_amount, 0
        );
        v_line_number := v_line_number + 1;
    END IF;

    -- 3. Credit Accounts Payable (Liability)
    IF v_accounts_payable_id IS NOT NULL THEN
        INSERT INTO journal_entry_lines (
            journal_entry_id, account_id, line_number, description, debit_amount, credit_amount
        ) VALUES (
            v_journal_entry_id, v_accounts_payable_id, v_line_number, 
            'Accounts payable for ' || v_invoice.invoice_number, 0, v_invoice.total_amount
        );
    END IF;

    -- Update journal entry totals
    UPDATE journal_entries 
    SET 
        total_debits = v_invoice.subtotal + v_invoice.tax_amount,
        total_credits = v_invoice.total_amount
    WHERE id = v_journal_entry_id;

    RAISE NOTICE 'Journal entry created for Purchase Invoice % (ID: %).', v_invoice.invoice_number, p_invoice_id;
    RETURN v_journal_entry_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. CREATE JOURNAL ENTRY TRIGGER
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_purchase_invoice_journal ON purchase_invoices;

-- Trigger for Purchase Invoice journal entry creation
CREATE OR REPLACE FUNCTION trigger_create_purchase_invoice_journal()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('RECEIVED', 'PAID') AND OLD.status NOT IN ('RECEIVED', 'PAID') THEN
        BEGIN
            PERFORM create_purchase_invoice_journal_entry(NEW.id);
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to create auto journal entry for purchase invoice %: %', NEW.invoice_number, SQLERRM;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_purchase_invoice_journal
AFTER UPDATE OF status ON purchase_invoices
FOR EACH ROW
EXECUTE FUNCTION trigger_create_purchase_invoice_journal();

-- =====================================================
-- 6. CREATE SEQUENCE FOR JOURNAL ENTRIES
-- =====================================================

-- Create sequence for journal entry numbers if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS journal_entry_number_seq START 1;

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION create_stock_movement(UUID, UUID, DECIMAL, DECIMAL, VARCHAR, VARCHAR, VARCHAR, UUID, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION record_purchase_invoice_stock_movement(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_purchase_invoice_journal_entry(UUID) TO authenticated;
GRANT ALL ON stock_items TO authenticated;
GRANT ALL ON stock_movements TO authenticated;

-- =====================================================
-- 8. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_stock_items_company_item ON stock_items(company_id, item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_item ON stock_movements(company_id, item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date);

-- =====================================================
-- 9. SETUP COMPLETE MESSAGE
-- =====================================================

SELECT 'Purchase Invoice Inventory and Journal Entry Fix Complete!' as status;
SELECT 'Stock quantities will now be updated when invoices are marked as RECEIVED' as info;
SELECT 'Journal entries will be automatically created' as info;
SELECT 'Stock movements will be recorded for audit trail' as info;
