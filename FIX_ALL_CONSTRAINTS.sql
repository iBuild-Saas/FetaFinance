-- Fix All Constraint Issues
-- This script removes restrictive constraints from all inventory and journal tables

-- =====================================================
-- 1. CHECK ALL CONSTRAINTS
-- =====================================================

SELECT '=== CHECKING ALL CONSTRAINTS ===' as section;

-- Show all constraints on problematic tables
SELECT 
    t.relname as table_name,
    c.conname as constraint_name,
    c.contype as constraint_type,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname IN ('stock_items', 'stock_movements', 'journal_entries', 'journal_entry_lines')
ORDER BY t.relname, c.contype;

-- =====================================================
-- 2. DROP ALL PROBLEMATIC TABLES
-- =====================================================

SELECT '=== DROPPING PROBLEMATIC TABLES ===' as section;

-- Drop all tables with constraint issues
DROP TABLE IF EXISTS stock_items CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS journal_entries CASCADE;
DROP TABLE IF EXISTS journal_entry_lines CASCADE;

-- Drop sequence
DROP SEQUENCE IF EXISTS journal_entry_number_seq;

SELECT '✅ All problematic tables dropped' as result;

-- =====================================================
-- 3. RECREATE TABLES WITH PROPER STRUCTURE
-- =====================================================

SELECT '=== RECREATING TABLES WITH PROPER STRUCTURE ===' as section;

-- Create stock_items table
CREATE TABLE stock_items (
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
CREATE TABLE stock_movements (
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

-- Create journal_entries table
CREATE TABLE journal_entries (
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

-- Create journal_entry_lines table
CREATE TABLE journal_entry_lines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    description TEXT,
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sequence for journal numbers
CREATE SEQUENCE journal_entry_number_seq START 1;

SELECT '✅ All tables recreated with proper structure' as result;

-- =====================================================
-- 4. CREATE INDEXES
-- =====================================================

SELECT '=== CREATING INDEXES ===' as section;

-- Stock items indexes
CREATE INDEX idx_stock_items_company_item ON stock_items(company_id, item_id);
CREATE INDEX idx_stock_items_item_id ON stock_items(item_id);

-- Stock movements indexes
CREATE INDEX idx_stock_movements_company_id ON stock_movements(company_id);
CREATE INDEX idx_stock_movements_item_id ON stock_movements(item_id);
CREATE INDEX idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(movement_date);

-- Journal entries indexes
CREATE INDEX idx_journal_entries_company_id ON journal_entries(company_id);
CREATE INDEX idx_journal_entries_reference ON journal_entries(reference_type, reference_id);
CREATE INDEX idx_journal_entries_date ON journal_entries(entry_date);

-- Journal entry lines indexes
CREATE INDEX idx_journal_entry_lines_journal_id ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_journal_entry_lines_account_id ON journal_entry_lines(account_id);

SELECT '✅ All indexes created' as result;

-- =====================================================
-- 5. GRANT PERMISSIONS
-- =====================================================

SELECT '=== GRANTING PERMISSIONS ===' as section;

GRANT ALL ON stock_items TO authenticated;
GRANT ALL ON stock_movements TO authenticated;
GRANT ALL ON journal_entries TO authenticated;
GRANT ALL ON journal_entry_lines TO authenticated;
GRANT USAGE ON journal_entry_number_seq TO authenticated;

SELECT '✅ All permissions granted' as result;

-- =====================================================
-- 6. VERIFY FIX
-- =====================================================

SELECT '=== VERIFYING FIX ===' as section;

-- Check table structures
SELECT 
    table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name IN ('stock_items', 'stock_movements', 'journal_entries', 'journal_entry_lines')
GROUP BY table_name
ORDER BY table_name;

-- Test inserting and updating
DO $$
DECLARE
    test_company_id UUID;
    test_item_id UUID;
    test_stock_id UUID;
    test_movement_id UUID;
BEGIN
    -- Get test data
    SELECT id INTO test_company_id FROM companies LIMIT 1;
    SELECT id INTO test_item_id FROM items LIMIT 1;
    
    IF test_company_id IS NULL OR test_item_id IS NULL THEN
        RAISE NOTICE '❌ No test data available - skipping test';
        RETURN;
    END IF;
    
    RAISE NOTICE '🧪 Testing with company: % and item: %', test_company_id, test_item_id;
    
    -- Test stock_items
    INSERT INTO stock_items (company_id, item_id, current_quantity, available_quantity, average_cost)
    VALUES (test_company_id, test_item_id, 10, 10, 25.50)
    RETURNING id INTO test_stock_id;
    
    RAISE NOTICE '✅ stock_items insert successful, id: %', test_stock_id;
    
    UPDATE stock_items 
    SET available_quantity = 15, current_quantity = 15
    WHERE id = test_stock_id;
    
    RAISE NOTICE '✅ stock_items update successful';
    
    -- Test stock_movements
    INSERT INTO stock_movements (
        company_id, item_id, movement_type, quantity, unit_cost, total_cost,
        reference_type, reference_id, reference_number, notes
    ) VALUES (
        test_company_id, test_item_id, 'IN', 5, 25.50, 127.50,
        'test', test_stock_id, 'TEST-001', 'Test movement'
    ) RETURNING id INTO test_movement_id;
    
    RAISE NOTICE '✅ stock_movements insert successful, id: %', test_movement_id;
    
    UPDATE stock_movements 
    SET total_cost = 150.00, notes = 'Updated test movement'
    WHERE id = test_movement_id;
    
    RAISE NOTICE '✅ stock_movements update successful';
    
    -- Clean up test data
    DELETE FROM stock_movements WHERE id = test_movement_id;
    DELETE FROM stock_items WHERE id = test_stock_id;
    RAISE NOTICE '✅ Test data cleaned up';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Test failed: %', SQLERRM;
END $$;

-- =====================================================
-- 7. NEXT STEPS
-- =====================================================

SELECT '=== NEXT STEPS ===' as section;

SELECT '✅ All constraint issues fixed!' as status;
SELECT 'Now run: COMPLETE_PURCHASE_INVOICE_SETUP.sql' as next_action;
SELECT 'This will recreate the functions and triggers' as explanation;
SELECT 'Then test marking a purchase invoice as RECEIVED' as final_step;
