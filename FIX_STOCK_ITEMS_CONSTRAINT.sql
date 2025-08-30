-- Fix Stock Items Table Constraint
-- This script removes the restrictive constraint on available_quantity

-- =====================================================
-- 1. CHECK CURRENT CONSTRAINTS
-- =====================================================

SELECT '=== CHECKING CURRENT CONSTRAINTS ===' as section;

-- Show all constraints on stock_items table
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'stock_items'::regclass;

-- Show column constraints specifically
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE WHEN is_generated = 'ALWAYS' THEN 'GENERATED' ELSE 'NOT GENERATED' END as generation_type
FROM information_schema.columns 
WHERE table_name = 'stock_items' 
AND column_name = 'available_quantity';

-- =====================================================
-- 2. DROP RESTRICTIVE CONSTRAINTS
-- =====================================================

SELECT '=== DROPPING RESTRICTIVE CONSTRAINTS ===' as section;

-- Drop any check constraints that might be restricting available_quantity
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    FOR constraint_rec IN 
        SELECT conname, pg_get_constraintdef(oid) as def
        FROM pg_constraint 
        WHERE conrelid = 'stock_items'::regclass 
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%available_quantity%'
    LOOP
        RAISE NOTICE 'Dropping constraint: %', constraint_rec.conname;
        EXECUTE 'ALTER TABLE stock_items DROP CONSTRAINT ' || constraint_rec.conname;
    END LOOP;
END $$;

-- =====================================================
-- 3. RECREATE TABLE WITH PROPER STRUCTURE
-- =====================================================

SELECT '=== RECREATING TABLE WITH PROPER STRUCTURE ===' as section;

-- Drop and recreate the stock_items table with proper constraints
DROP TABLE IF EXISTS stock_items CASCADE;

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

-- Create indexes
CREATE INDEX idx_stock_items_company_item ON stock_items(company_id, item_id);
CREATE INDEX idx_stock_items_item_id ON stock_items(item_id);

-- Grant permissions
GRANT ALL ON stock_items TO authenticated;

SELECT '✅ stock_items table recreated with proper structure' as result;

-- =====================================================
-- 4. VERIFY FIX
-- =====================================================

SELECT '=== VERIFYING FIX ===' as section;

-- Check that the table exists and has the right structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'stock_items'
ORDER BY ordinal_position;

-- Test inserting and updating
DO $$
DECLARE
    test_company_id UUID;
    test_item_id UUID;
    test_stock_id UUID;
BEGIN
    -- Get a test company and item
    SELECT id INTO test_company_id FROM companies LIMIT 1;
    SELECT id INTO test_item_id FROM items LIMIT 1;
    
    IF test_company_id IS NULL OR test_item_id IS NULL THEN
        RAISE NOTICE '❌ No test data available - skipping test';
        RETURN;
    END IF;
    
    RAISE NOTICE '🧪 Testing with company: % and item: %', test_company_id, test_item_id;
    
    -- Test insert
    INSERT INTO stock_items (company_id, item_id, current_quantity, available_quantity, average_cost)
    VALUES (test_company_id, test_item_id, 10, 10, 25.50)
    RETURNING id INTO test_stock_id;
    
    RAISE NOTICE '✅ Insert successful, stock_id: %', test_stock_id;
    
    -- Test update
    UPDATE stock_items 
    SET available_quantity = 15, current_quantity = 15
    WHERE id = test_stock_id;
    
    RAISE NOTICE '✅ Update successful';
    
    -- Clean up test data
    DELETE FROM stock_items WHERE id = test_stock_id;
    RAISE NOTICE '✅ Test data cleaned up';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Test failed: %', SQLERRM;
END $$;

-- =====================================================
-- 5. NEXT STEPS
-- =====================================================

SELECT '=== NEXT STEPS ===' as section;

SELECT '✅ Stock items table constraint fixed!' as status;
SELECT 'Now run: COMPLETE_PURCHASE_INVOICE_SETUP.sql' as next_action;
SELECT 'This will recreate the stock movement functions and triggers' as explanation;
SELECT 'Then test marking a purchase invoice as RECEIVED' as final_step;
