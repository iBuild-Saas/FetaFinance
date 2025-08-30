-- Complete Purchase Invoice Automation Setup
-- This script creates everything needed for automatic journal entries and stock movements

-- =====================================================
-- 1. CREATE REQUIRED TABLES
-- =====================================================

SELECT '=== CREATING REQUIRED TABLES ===' as section;

-- Create stock_items table
CREATE TABLE IF NOT EXISTS stock_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    item_id UUID NOT NULL REFERENCES items(id),
    current_quantity DECIMAL(10,3) DEFAULT 0,
    reserved_quantity DECIMAL(10,3) DEFAULT 0,
    available_quantity DECIMAL(10,3) DEFAULT 0,
    average_cost DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, item_id)
);

-- Create stock_movements table
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    item_id UUID NOT NULL REFERENCES items(id),
    movement_type VARCHAR(20) NOT NULL, -- IN, OUT, ADJUSTMENT
    quantity DECIMAL(10,3) NOT NULL,
    unit_cost DECIMAL(15,2) DEFAULT 0,
    total_cost DECIMAL(15,2) DEFAULT 0,
    reference_type VARCHAR(50), -- purchase_invoice, sales_invoice, adjustment
    reference_id UUID,
    reference_number VARCHAR(100),
    notes TEXT,
    movement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create journal_entries table
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    journal_number VARCHAR(20) NOT NULL,
    entry_date DATE DEFAULT CURRENT_DATE,
    description TEXT,
    reference_type VARCHAR(50), -- purchase_invoice, sales_invoice, payment
    reference_id UUID,
    reference_number VARCHAR(100),
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'POSTED', -- DRAFT, POSTED, VOID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create journal_entry_lines table
CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    description TEXT,
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sequence for journal numbers
CREATE SEQUENCE IF NOT EXISTS journal_entry_number_seq START 1;

SELECT '✅ Tables created successfully' as result;

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

SELECT '=== CREATING INDEXES ===' as section;

-- Stock items indexes
CREATE INDEX IF NOT EXISTS idx_stock_items_company_item ON stock_items(company_id, item_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_item_id ON stock_items(item_id);

-- Stock movements indexes
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_id ON stock_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date);

-- Journal entries indexes
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_id ON journal_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_reference ON journal_entries(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);

-- Journal entry lines indexes
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_journal_id ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_account_id ON journal_entry_lines(account_id);

SELECT '✅ Indexes created successfully' as result;

-- =====================================================
-- 3. CREATE STOCK MOVEMENT FUNCTION
-- =====================================================

SELECT '=== CREATING STOCK MOVEMENT FUNCTION ===' as section;

CREATE OR REPLACE FUNCTION create_stock_movement(
    p_company_id UUID,
    p_item_id UUID,
    p_quantity DECIMAL(10,3),
    p_unit_cost DECIMAL(15,2),
    p_movement_type VARCHAR(20),
    p_reference_type VARCHAR(50),
    p_reference_id UUID,
    p_reference_number VARCHAR(100) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_stock_item_id UUID;
    v_movement_id UUID;
    v_current_quantity DECIMAL(10,3);
    v_current_cost DECIMAL(15,2);
    v_new_quantity DECIMAL(10,3);
    v_new_average_cost DECIMAL(15,2);
    v_total_cost DECIMAL(15,2);
BEGIN
    -- Calculate total cost
    v_total_cost := p_quantity * p_unit_cost;
    
    -- Get or create stock item record
    SELECT id, current_quantity, average_cost 
    INTO v_stock_item_id, v_current_quantity, v_current_cost
    FROM stock_items 
    WHERE company_id = p_company_id AND item_id = p_item_id;
    
    IF v_stock_item_id IS NULL THEN
        -- Create new stock item record
        INSERT INTO stock_items (company_id, item_id, current_quantity, available_quantity, average_cost)
        VALUES (p_company_id, p_item_id, 0, 0, 0)
        RETURNING id INTO v_stock_item_id;
        
        v_current_quantity := 0;
        v_current_cost := 0;
    END IF;
    
    -- Calculate new quantities and weighted average cost
    IF p_movement_type = 'IN' THEN
        v_new_quantity := v_current_quantity + p_quantity;
        
        -- Calculate weighted average cost
        IF v_current_quantity = 0 THEN
            v_new_average_cost := p_unit_cost;
        ELSE
            v_new_average_cost := ((v_current_quantity * v_current_cost) + (p_quantity * p_unit_cost)) / v_new_quantity;
        END IF;
    ELSIF p_movement_type = 'OUT' THEN
        v_new_quantity := v_current_quantity - p_quantity;
        v_new_average_cost := v_current_cost; -- Keep same average cost for outbound movements
        
        -- Ensure quantity doesn't go negative
        IF v_new_quantity < 0 THEN
            v_new_quantity := 0;
        END IF;
    ELSE
        -- ADJUSTMENT
        v_new_quantity := p_quantity;
        v_new_average_cost := COALESCE(p_unit_cost, v_current_cost);
    END IF;
    
    -- Update stock item
    UPDATE stock_items 
    SET 
        current_quantity = v_new_quantity,
        available_quantity = v_new_quantity,
        average_cost = v_new_average_cost,
        updated_at = NOW()
    WHERE id = v_stock_item_id;
    
    -- Create stock movement record
    INSERT INTO stock_movements (
        company_id, item_id, movement_type, quantity, unit_cost, total_cost,
        reference_type, reference_id, reference_number, notes
    ) VALUES (
        p_company_id, p_item_id, p_movement_type, p_quantity, p_unit_cost, v_total_cost,
        p_reference_type, p_reference_id, p_reference_number, p_notes
    ) RETURNING id INTO v_movement_id;
    
    RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;

SELECT '✅ Stock movement function created successfully' as result;

-- =====================================================
-- 4. CREATE PURCHASE INVOICE STOCK MOVEMENT FUNCTION
-- =====================================================

SELECT '=== CREATING PURCHASE INVOICE STOCK FUNCTION ===' as section;

CREATE OR REPLACE FUNCTION record_purchase_invoice_stock_movement()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice RECORD;
    v_line_item RECORD;
    v_movement_id UUID;
BEGIN
    -- Get invoice details from trigger context
    SELECT pi.*, c.id as company_id, c.name as company_name
    INTO v_invoice
    FROM purchase_invoices pi
    JOIN companies c ON pi.company_id = c.id
    WHERE pi.id = NEW.id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase invoice not found: %', NEW.id;
    END IF;
    
    -- Only process if status is RECEIVED
    IF v_invoice.status != 'RECEIVED' THEN
        RETURN NEW;
    END IF;
    
    -- Process each line item
    FOR v_line_item IN 
        SELECT pil.*, i.id as item_master_id
        FROM purchase_invoice_line_items pil
        LEFT JOIN items i ON pil.item_id = i.id
        WHERE pil.invoice_id = NEW.id
        AND pil.quantity > 0
    LOOP
        -- Only create stock movement if item exists in items master
        IF v_line_item.item_master_id IS NOT NULL THEN
            -- Create stock movement
            SELECT create_stock_movement(
                v_invoice.company_id,
                v_line_item.item_master_id,
                v_line_item.quantity,
                v_line_item.unit_price,
                'IN',
                'purchase_invoice',
                NEW.id,
                v_invoice.invoice_number,
                'Stock received from purchase invoice: ' || v_invoice.invoice_number
            ) INTO v_movement_id;
            
            RAISE NOTICE 'Created stock movement % for item % (qty: %)', 
                         v_movement_id, v_line_item.item_name, v_line_item.quantity;
        ELSE
            RAISE NOTICE 'Skipped stock movement for item % - not found in items master', 
                         v_line_item.item_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Completed stock movements for purchase invoice %', v_invoice.invoice_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

SELECT '✅ Purchase invoice stock function created successfully' as result;

-- =====================================================
-- 5. CREATE JOURNAL ENTRY FUNCTION
-- =====================================================

SELECT '=== CREATING JOURNAL ENTRY FUNCTION ===' as section;

CREATE OR REPLACE FUNCTION create_purchase_invoice_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice RECORD;
    v_journal_id UUID;
    v_journal_number VARCHAR(20);
    v_inventory_account_id UUID;
    v_payable_account_id UUID;
BEGIN
    -- Get invoice details from trigger context
    SELECT pi.*, c.name as company_name
    INTO v_invoice
    FROM purchase_invoices pi
    JOIN companies c ON pi.company_id = c.id
    WHERE pi.id = NEW.id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase invoice not found: %', NEW.id;
    END IF;
    
    -- Only process if status is RECEIVED
    IF v_invoice.status != 'RECEIVED' THEN
        RETURN NEW;
    END IF;
    
    -- Check if journal entry already exists
    IF EXISTS (SELECT 1 FROM journal_entries WHERE reference_type = 'purchase_invoice' AND reference_id = NEW.id) THEN
        RAISE NOTICE 'Journal entry already exists for purchase invoice %', v_invoice.invoice_number;
        RETURN NEW;
    END IF;
    
    -- Find inventory account (Asset type, containing 'inventory' or 'stock')
    SELECT id INTO v_inventory_account_id
    FROM chart_of_accounts
    WHERE company_id = v_invoice.company_id
    AND account_type = 'Asset'
    AND (LOWER(account_name) LIKE '%inventory%' OR LOWER(account_name) LIKE '%stock%')
    AND is_group = false
    ORDER BY account_code
    LIMIT 1;
    
    -- Find accounts payable account (Liability type, containing 'payable')
    SELECT id INTO v_payable_account_id
    FROM chart_of_accounts
    WHERE company_id = v_invoice.company_id
    AND account_type = 'Liability'
    AND LOWER(account_name) LIKE '%payable%'
    AND is_group = false
    ORDER BY account_code
    LIMIT 1;
    
    -- Create default accounts if not found
    IF v_inventory_account_id IS NULL THEN
        INSERT INTO chart_of_accounts (company_id, account_code, account_name, account_type, is_group)
        VALUES (v_invoice.company_id, '1300', 'Inventory', 'Asset', false)
        RETURNING id INTO v_inventory_account_id;
        
        RAISE NOTICE 'Created default Inventory account';
    END IF;
    
    IF v_payable_account_id IS NULL THEN
        INSERT INTO chart_of_accounts (company_id, account_code, account_name, account_type, is_group)
        VALUES (v_invoice.company_id, '2100', 'Accounts Payable', 'Liability', false)
        RETURNING id INTO v_payable_account_id;
        
        RAISE NOTICE 'Created default Accounts Payable account';
    END IF;
    
    -- Generate journal number
    v_journal_number := 'JE-' || LPAD(nextval('journal_entry_number_seq')::text, 6, '0');
    
    -- Create journal entry header
    INSERT INTO journal_entries (
        company_id, journal_number, entry_date, description,
        reference_type, reference_id, reference_number, total_amount
    ) VALUES (
        v_invoice.company_id, v_journal_number, v_invoice.invoice_date,
        'Purchase Invoice: ' || v_invoice.invoice_number,
        'purchase_invoice', NEW.id, v_invoice.invoice_number, v_invoice.total_amount
    ) RETURNING id INTO v_journal_id;
    
    -- Create journal entry lines
    -- Debit: Inventory (Asset increases)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit_amount, credit_amount)
    VALUES (v_journal_id, v_inventory_account_id, 'Inventory purchased', v_invoice.total_amount, 0);
    
    -- Credit: Accounts Payable (Liability increases)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit_amount, credit_amount)
    VALUES (v_journal_id, v_payable_account_id, 'Amount owed to supplier', 0, v_invoice.total_amount);
    
    RAISE NOTICE 'Created journal entry % for purchase invoice %', v_journal_number, v_invoice.invoice_number;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

SELECT '✅ Journal entry function created successfully' as result;

-- =====================================================
-- 6. CREATE TRIGGERS
-- =====================================================

SELECT '=== CREATING TRIGGERS ===' as section;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trg_purchase_invoice_stock_movement ON purchase_invoices;
DROP TRIGGER IF EXISTS trigger_purchase_invoice_journal ON purchase_invoices;

-- Create stock movement trigger
CREATE TRIGGER trg_purchase_invoice_stock_movement
    AFTER UPDATE OF status ON purchase_invoices
    FOR EACH ROW
    WHEN (NEW.status = 'RECEIVED' AND OLD.status != 'RECEIVED')
    EXECUTE FUNCTION record_purchase_invoice_stock_movement();

-- Create journal entry trigger
CREATE TRIGGER trigger_purchase_invoice_journal
    AFTER UPDATE OF status ON purchase_invoices
    FOR EACH ROW
    WHEN (NEW.status = 'RECEIVED' AND OLD.status != 'RECEIVED')
    EXECUTE FUNCTION create_purchase_invoice_journal_entry();

SELECT '✅ Triggers created successfully' as result;

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

SELECT '=== GRANTING PERMISSIONS ===' as section;

-- Grant permissions to authenticated users
GRANT ALL ON stock_items TO authenticated;
GRANT ALL ON stock_movements TO authenticated;
GRANT ALL ON journal_entries TO authenticated;
GRANT ALL ON journal_entry_lines TO authenticated;
GRANT USAGE ON journal_entry_number_seq TO authenticated;

SELECT '✅ Permissions granted successfully' as result;

-- =====================================================
-- 8. FINAL VERIFICATION
-- =====================================================

SELECT '=== FINAL VERIFICATION ===' as section;

-- Check that all components exist
SELECT 
    'Tables' as component_type,
    COUNT(*) as count,
    '4 expected' as expected
FROM information_schema.tables 
WHERE table_name IN ('stock_items', 'stock_movements', 'journal_entries', 'journal_entry_lines')

UNION ALL

SELECT 
    'Functions',
    COUNT(*),
    '3 expected'
FROM information_schema.routines 
WHERE routine_name IN ('create_stock_movement', 'record_purchase_invoice_stock_movement', 'create_purchase_invoice_journal_entry')

UNION ALL

SELECT 
    'Triggers',
    COUNT(*),
    '2 expected'
FROM information_schema.triggers 
WHERE trigger_name IN ('trg_purchase_invoice_stock_movement', 'trigger_purchase_invoice_journal');

-- =====================================================
-- 9. SUCCESS MESSAGE
-- =====================================================

SELECT '=== SETUP COMPLETE ===' as section;

SELECT '✅ Purchase invoice automation is now fully set up!' as status;
SELECT 'When you mark a purchase invoice as RECEIVED:' as info;
SELECT '1. Stock quantities will be updated automatically' as step;
SELECT '2. Stock movements will be recorded for audit trail' as step;
SELECT '3. Journal entries will be created (Inventory DR, Accounts Payable CR)' as step;
SELECT '4. Weighted average cost will be calculated automatically' as step;

SELECT 'Next: Test by creating a purchase invoice and marking it as RECEIVED' as next_action;
