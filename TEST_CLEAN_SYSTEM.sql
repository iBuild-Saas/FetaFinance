-- =====================================================
-- TEST CLEAN PURCHASE INVOICE SYSTEM
-- =====================================================
-- This script tests the clean, simple system

-- =====================================================
-- 1. CHECK SYSTEM STATUS
-- =====================================================

SELECT '=== CHECKING SYSTEM STATUS ===' as step;

-- Check if tables exist
SELECT 
    table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name) 
         THEN 'EXISTS' ELSE 'MISSING' END as status
FROM (VALUES ('stock_items'), ('stock_movements')) AS t(table_name);

-- Check if function exists
SELECT 
    routine_name as function_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name = 'update_stock_on_receive';

-- Check if trigger exists
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_name = 'trg_purchase_invoice_stock_update';

-- Check constraints
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'purchase_invoices'::regclass 
AND contype = 'c';

-- =====================================================
-- 2. CHECK SAMPLE DATA
-- =====================================================

SELECT '=== CHECKING SAMPLE DATA ===' as step;

-- Check if there are purchase invoices
SELECT 
    'Purchase Invoices' as table_name,
    COUNT(*) as count
FROM purchase_invoices;

-- Check if there are items
SELECT 
    'Items' as table_name,
    COUNT(*) as count
FROM items;

-- Check if there are companies
SELECT 
    'Companies' as table_name,
    COUNT(*) as count
FROM companies;

-- =====================================================
-- 3. TEST THE SYSTEM
-- =====================================================

SELECT '=== TESTING THE SYSTEM ===' as step;

-- Find a SUBMITTED invoice to test with
SELECT 
    'Available Invoices for Testing' as info,
    id,
    invoice_number,
    status,
    company_id
FROM purchase_invoices 
WHERE status = 'SUBMITTED'
ORDER BY created_at DESC
LIMIT 3;

-- =====================================================
-- 4. MANUAL TEST (if you have data)
-- =====================================================

-- If you have a SUBMITTED invoice, you can test manually:
-- 1. Copy the invoice ID from above
-- 2. Run this command (replace INVOICE_ID with actual ID):
/*
UPDATE purchase_invoices 
SET status = 'RECEIVED' 
WHERE id = 'YOUR_INVOICE_ID_HERE';
*/

-- 3. Then check if stock was updated:
/*
SELECT * FROM stock_items ORDER BY created_at DESC LIMIT 5;
SELECT * FROM stock_movements ORDER BY created_at DESC LIMIT 5;
*/

-- =====================================================
-- 5. SYSTEM SUMMARY
-- =====================================================

SELECT '=== SYSTEM SUMMARY ===' as summary;

SELECT 
    'Tables' as component,
    COUNT(*) as count,
    'stock_items, stock_movements' as details
FROM information_schema.tables 
WHERE table_name IN ('stock_items', 'stock_movements')

UNION ALL

SELECT 
    'Functions' as component,
    COUNT(*) as count,
    'update_stock_on_receive' as details
FROM information_schema.routines 
WHERE routine_name = 'update_stock_on_receive'

UNION ALL

SELECT 
    'Triggers' as component,
    COUNT(*) as count,
    'trg_purchase_invoice_stock_update' as details
FROM information_schema.triggers 
WHERE trigger_name = 'trg_purchase_invoice_stock_update'

UNION ALL

SELECT 
    'Constraints' as component,
    COUNT(*) as count,
    'purchase_invoices_status_check' as details
FROM pg_constraint 
WHERE conrelid = 'purchase_invoices'::regclass 
AND contype = 'c';

-- =====================================================
-- 6. NEXT STEPS
-- =====================================================

SELECT '=== NEXT STEPS ===' as next_steps;

SELECT '1. If all components show count > 0, the system is ready' as step;
SELECT '2. Create a purchase invoice with status SUBMITTED' as step;
SELECT '3. Change status to RECEIVED using the frontend' as step;
SELECT '4. Check Inventory page for updated stock quantities' as step;
SELECT '5. Check stock_movements table for audit trail' as step;

SELECT '=== SYSTEM READY ===' as status;
SELECT 'Clean system is ready for testing!' as message;
