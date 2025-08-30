-- Complete Purchase Invoice Setup - FIXED VERSION
-- This script sets up all necessary components for purchase invoice automation

-- =====================================================
-- 1. CREATE STOCK TABLES
-- =====================================================

SELECT '=== CREATING STOCK TABLES ===' as section;

-- Create stock_items table if it doesn't exist
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

-- Create stock_movements table if it doesn't exist
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    item_id UUID NOT NULL REFERENCES items(id),
    movement_type VARCHAR(20) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_cost DECIMAL(15,2) DEFAULT 0,
    total_cost DECIMAL(15,2) DEFAULT 0,
    reference_type VARCHAR(50),
    reference_id UUID,
    reference_number VARCHAR(100),
    notes TEXT,
    movement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT '✅ Stock tables created' as result;

-- =====================================================
-- 2. CREATE JOURNAL TABLES
-- =====================================================

SELECT '=== CREATING JOURNAL TABLES ===' as section;

-- Create journal_entries table if it doesn't exist
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    journal_number VARCHAR(20) NOT NULL,
    entry_date DATE DEFAULT CURRENT_DATE,
    description TEXT,
    reference_type VARCHAR(50),
    reference_id UUID,
    reference_number VARCHAR(100),
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'POSTED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create journal_entry_lines table if it doesn't exist
CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    description TEXT,
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sequence for journal numbers if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS journal_entry_number_seq START 1;

SELECT '✅ Journal tables created' as result;

-- =====================================================
-- 3. CREATE INDEXES
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

SELECT '✅ Indexes created' as result;

-- =====================================================
-- 4. GRANT PERMISSIONS
-- =====================================================

SELECT '=== GRANTING PERMISSIONS ===' as section;

GRANT ALL ON stock_items TO authenticated;
GRANT ALL ON stock_movements TO authenticated;
GRANT ALL ON journal_entries TO authenticated;
GRANT ALL ON journal_entry_lines TO authenticated;
GRANT USAGE ON journal_entry_number_seq TO authenticated;

SELECT '✅ Permissions granted' as result;

-- =====================================================
-- 5. CREATE FUNCTIONS
-- =====================================================

SELECT '=== CREATING FUNCTIONS ===' as section;

-- Create stock movement function
CREATE OR REPLACE FUNCTION create_stock_movement(
    p_company_id UUID,
    p_item_id UUID,
    p_movement_type VARCHAR(20),
    p_quantity DECIMAL(10,3),
    p_unit_cost DECIMAL(15,2),
    p_reference_type VARCHAR(50),
    p_reference_id UUID,
    p_reference_number VARCHAR(100),
    p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_movement_id UUID;
    v_total_cost DECIMAL(15,2);
BEGIN
    -- Calculate total cost
    v_total_cost := p_quantity * p_unit_cost;
    
    -- Insert stock movement
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

-- Create purchase invoice stock movement function
CREATE OR REPLACE FUNCTION record_purchase_invoice_stock_movement() RETURNS TRIGGER AS $$
DECLARE
    v_company_id UUID;
    v_item_id UUID;
    v_quantity DECIMAL(10,3);
    v_unit_cost DECIMAL(15,2);
    v_line_item RECORD;
    v_stock_item_id UUID;
    v_current_quantity DECIMAL(10,3);
    v_current_cost DECIMAL(15,2);
    v_new_quantity DECIMAL(10,3);
    v_new_average_cost DECIMAL(15,2);
BEGIN
    -- Only process when status changes to RECEIVED
    IF NEW.status = 'RECEIVED' AND (OLD.status IS NULL OR OLD.status != 'RECEIVED') THEN
        
        -- Get company ID from the invoice
        v_company_id := NEW.company_id;
        
        -- Process each line item
        FOR v_line_item IN 
            SELECT item_id, quantity, unit_price
            FROM purchase_invoice_line_items 
            WHERE invoice_id = NEW.id
        LOOP
            v_item_id := v_line_item.item_id;
            v_quantity := v_line_item.quantity;
            v_unit_cost := v_line_item.unit_price;
            
            -- Check if stock item exists
            SELECT id, current_quantity, average_cost 
            INTO v_stock_item_id, v_current_quantity, v_current_cost
            FROM stock_items 
            WHERE company_id = v_company_id AND item_id = v_item_id;
            
            IF v_stock_item_id IS NULL THEN
                -- Create new stock item
                INSERT INTO stock_items (company_id, item_id, current_quantity, available_quantity, average_cost)
                VALUES (v_company_id, v_item_id, v_quantity, v_quantity, v_unit_cost)
                RETURNING id INTO v_stock_item_id;
            ELSE
                -- Update existing stock item with weighted average cost
                v_new_quantity := v_current_quantity + v_quantity;
                v_new_average_cost := ((v_current_quantity * v_current_cost) + (v_quantity * v_unit_cost)) / v_new_quantity;
                
                UPDATE stock_items 
                SET current_quantity = v_new_quantity,
                    available_quantity = v_new_quantity,
                    average_cost = v_new_average_cost,
                    updated_at = NOW()
                WHERE id = v_stock_item_id;
            END IF;
            
            -- Create stock movement record
            PERFORM create_stock_movement(
                v_company_id, v_item_id, 'IN', v_quantity, v_unit_cost,
                'purchase_invoice', NEW.id, NEW.invoice_number, 
                'Purchase invoice received'
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create purchase invoice journal entry function
CREATE OR REPLACE FUNCTION create_purchase_invoice_journal_entry() RETURNS TRIGGER AS $$
DECLARE
    v_journal_id UUID;
    v_company_id UUID;
    v_inventory_account_id UUID;
    v_payable_account_id UUID;
    v_total_amount DECIMAL(15,2);
    v_line_item RECORD;
    v_journal_number VARCHAR(20);
    v_balancing_account_id UUID;
    v_balancing_amount DECIMAL(15,2);
BEGIN
    -- Only process when status changes to RECEIVED
    IF NEW.status = 'RECEIVED' AND (OLD.status IS NULL OR OLD.status != 'RECEIVED') THEN
        
        v_company_id := NEW.company_id;
        v_total_amount := NEW.total_amount;
        
        -- Get next journal number
        SELECT 'JE-' || LPAD(nextval('journal_entry_number_seq')::text, 8, '0') INTO v_journal_number;
        
        -- Find Inventory account (Asset type)
        SELECT id INTO v_inventory_account_id 
        FROM chart_of_accounts 
        WHERE company_id = v_company_id 
        AND account_type = 'ASSET' 
        AND LOWER(account_name) LIKE '%inventory%'
        LIMIT 1;
        
        -- Find Accounts Payable account (Liability type)
        SELECT id INTO v_payable_account_id 
        FROM chart_of_accounts 
        WHERE company_id = v_company_id 
        AND account_type = 'LIABILITY' 
        AND LOWER(account_name) LIKE '%payable%'
        LIMIT 1;
        
        -- Create journal entry
        INSERT INTO journal_entries (
            company_id, journal_number, entry_date, description,
            reference_type, reference_id, reference_number, total_amount
        ) VALUES (
            v_company_id, v_journal_number, CURRENT_DATE, 
            'Purchase invoice received - ' || NEW.invoice_number,
            'purchase_invoice', NEW.id, NEW.invoice_number, v_total_amount
        ) RETURNING id INTO v_journal_id;
        
        -- Create journal entry lines
        IF v_inventory_account_id IS NOT NULL THEN
            -- Debit Inventory (Asset increases with debit)
            INSERT INTO journal_entry_lines (
                journal_entry_id, account_id, description, debit_amount
            ) VALUES (
                v_journal_id, v_inventory_account_id, 
                'Inventory increase from purchase invoice', v_total_amount
            );
        END IF;
        
        IF v_payable_account_id IS NOT NULL THEN
            -- Credit Accounts Payable (Liability increases with credit)
            INSERT INTO journal_entry_lines (
                journal_entry_id, account_id, description, credit_amount
            ) VALUES (
                v_journal_id, v_payable_account_id, 
                'Accounts payable from purchase invoice', v_total_amount
            );
        END IF;
        
        -- If either account is missing, create a balancing entry
        IF v_inventory_account_id IS NULL OR v_payable_account_id IS NULL THEN
            -- Determine which account to use for balancing
            IF v_inventory_account_id IS NULL THEN
                v_balancing_account_id := v_payable_account_id;
                v_balancing_amount := v_total_amount;
                -- Credit the payable account to balance
                INSERT INTO journal_entry_lines (
                    journal_entry_id, account_id, description, credit_amount
                ) VALUES (
                    v_journal_id, v_balancing_account_id, 
                    'Balancing entry for missing inventory account', v_balancing_amount
                );
            ELSE
                v_balancing_account_id := v_inventory_account_id;
                v_balancing_amount := v_total_amount;
                -- Debit the inventory account to balance
                INSERT INTO journal_entry_lines (
                    journal_entry_id, account_id, description, debit_amount
                ) VALUES (
                    v_journal_id, v_balancing_account_id, 
                    'Balancing entry for missing payable account', v_balancing_amount
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

SELECT '✅ Functions created' as result;

-- =====================================================
-- 6. CREATE TRIGGERS
-- =====================================================

SELECT '=== CREATING TRIGGERS ===' as section;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trg_purchase_invoice_stock_movement ON purchase_invoices;
DROP TRIGGER IF EXISTS trigger_purchase_invoice_journal ON purchase_invoices;

-- Create stock movement trigger
CREATE TRIGGER trg_purchase_invoice_stock_movement
    AFTER UPDATE ON purchase_invoices
    FOR EACH ROW
    EXECUTE FUNCTION record_purchase_invoice_stock_movement();

-- Create journal entry trigger
CREATE TRIGGER trigger_purchase_invoice_journal
    AFTER UPDATE ON purchase_invoices
    FOR EACH ROW
    EXECUTE FUNCTION create_purchase_invoice_journal_entry();

SELECT '✅ Triggers created' as result;

-- =====================================================
-- 7. VERIFY SETUP
-- =====================================================

SELECT '=== VERIFYING SETUP ===' as section;

-- Check tables exist
SELECT 
    table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = t.table_name
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (VALUES 
    ('stock_items'),
    ('stock_movements'),
    ('journal_entries'),
    ('journal_entry_lines')
) AS t(table_name);

-- Check functions exist
SELECT 
    function_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = f.function_name
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (VALUES 
    ('create_stock_movement'),
    ('record_purchase_invoice_stock_movement'),
    ('create_purchase_invoice_journal_entry')
) AS f(function_name);

-- Check triggers exist
SELECT 
    trigger_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        WHERE c.relname = 'purchase_invoices' AND t.tgname = tr.trigger_name
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (VALUES 
    ('trg_purchase_invoice_stock_movement'),
    ('trigger_purchase_invoice_journal')
) AS tr(trigger_name);

-- =====================================================
-- 8. NEXT STEPS
-- =====================================================

SELECT '=== NEXT STEPS ===' as section;

SELECT '✅ Purchase invoice automation setup complete!' as status;
SELECT 'Now test marking a purchase invoice as RECEIVED' as next_action;
SELECT 'This should create stock movements and journal entries automatically' as explanation;
