-- CLEAN START: Rebuild sales delivery system from scratch
-- Step 1: Clean up all existing delivery-related functions and triggers

-- 1. Drop all existing sales delivery triggers and functions
DROP TRIGGER IF EXISTS trigger_sales_delivery_stock_movement ON sales_invoices;
DROP TRIGGER IF EXISTS trigger_sales_stock_movement ON sales_invoices;
DROP FUNCTION IF EXISTS create_sales_delivery_stock_movement();
DROP FUNCTION IF EXISTS create_sales_stock_movement();

-- 2. Check what purchase invoice delivery system looks like (our working reference)
SELECT 'Checking purchase invoice system structure...' as step;

-- Check purchase invoice triggers
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'purchase_invoices'
AND trigger_name LIKE '%stock%';

-- Check purchase invoice functions
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name LIKE '%purchase%stock%';

-- 3. Check current stock_movements table structure (what we need to work with)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'stock_movements'
ORDER BY ordinal_position;

-- 4. Check current stock_items table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'stock_items'
ORDER BY ordinal_position;

-- 5. Check sales_invoices table for delivery_status field
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'sales_invoices'
AND column_name = 'delivery_status';

SELECT 'Cleanup completed. Ready for fresh rebuild.' as status;
