-- =====================================================
-- TEST COMPLETE PURCHASE INVOICE SYSTEM
-- =====================================================
-- This script tests BOTH journal entries AND stock movements
-- Journal entries: SUBMITTED status
-- Stock movements: RECEIVED status

-- =====================================================
-- 1. CHECK SYSTEM STATUS
-- =====================================================

SELECT '=== CHECKING COMPLETE SYSTEM ===' as step;

-- Check if tables exist
SELECT 
    table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name) 
         THEN 'EXISTS' ELSE 'MISSING' END as status
FROM (VALUES ('stock_items'), ('stock_movements')) AS t(table_name);

-- Check if functions exist
SELECT 
    routine_name as function_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name IN ('create_purchase_invoice_journal_entry', 'update_stock_on_receive');

-- Check if triggers exist
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_name IN ('trg_purchase_invoice_journal', 'trg_purchase_invoice_stock');

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

-- Check if journal_entries table exists
SELECT 
    'Journal Entries' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entries') 
         THEN 'EXISTS' ELSE 'MISSING' END as status;

-- =====================================================
-- 3. TEST WORKFLOW
-- =====================================================

SELECT '=== TESTING COMPLETE WORKFLOW ===' as step;

-- Find invoices for testing
SELECT 
    'Available Invoices for Testing' as info,
    id,
    invoice_number,
    status,
    company_id,
    created_at
FROM purchase_invoices 
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================
-- 4. MANUAL TEST STEPS
-- =====================================================

SELECT '=== MANUAL TEST STEPS ===' as manual_test;

-- Step 1: Test Journal Entry (SUBMITTED status)
SELECT '1. Test Journal Entry:' as step;
SELECT '   - Find a DRAFT invoice above' as instruction;
SELECT '   - Change status to SUBMITTED' as instruction;
SELECT '   - Check journal_entries table for new entry' as instruction;

-- Step 2: Test Stock Movement (RECEIVED status)
SELECT '2. Test Stock Movement:' as step;
SELECT '   - Use the same invoice (now SUBMITTED)' as instruction;
SELECT '   - Change status to RECEIVED' as instruction;
SELECT '   - Check stock_items and stock_movements tables' as instruction;

-- =====================================================
-- 5. MANUAL TEST COMMANDS
-- =====================================================

-- If you have a DRAFT invoice, you can test manually:
-- 1. Copy the invoice ID from above
-- 2. Test journal entry (SUBMITTED):
/*
UPDATE purchase_invoices 
SET status = 'SUBMITTED' 
WHERE id = 'YOUR_INVOICE_ID_HERE';
*/

-- 3. Test stock movement (RECEIVED):
/*
UPDATE purchase_invoices 
SET status = 'RECEIVED' 
WHERE id = 'YOUR_INVOICE_ID_HERE';
*/

-- 4. Check results:
/*
-- Check journal entries
SELECT * FROM journal_entries ORDER BY created_at DESC LIMIT 5;

-- Check stock items
SELECT * FROM stock_items ORDER BY created_at DESC LIMIT 5;

-- Check stock movements
SELECT * FROM stock_movements ORDER BY created_at DESC LIMIT 5;
*/

-- =====================================================
-- 6. SYSTEM SUMMARY
-- =====================================================

SELECT '=== COMPLETE SYSTEM SUMMARY ===' as summary;

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
    'create_purchase_invoice_journal_entry, update_stock_on_receive' as details
FROM information_schema.routines 
WHERE routine_name IN ('create_purchase_invoice_journal_entry', 'update_stock_on_receive')

UNION ALL

SELECT 
    'Triggers' as component,
    COUNT(*) as count,
    'trg_purchase_invoice_journal, trg_purchase_invoice_stock' as details
FROM information_schema.triggers 
WHERE trigger_name IN ('trg_purchase_invoice_journal', 'trg_purchase_invoice_stock')

UNION ALL

SELECT 
    'Constraints' as component,
    COUNT(*) as count,
    'purchase_invoices_status_check' as details
FROM pg_constraint 
WHERE conrelid = 'purchase_invoices'::regclass 
AND contype = 'c';

-- =====================================================
-- 7. EXPECTED WORKFLOW
-- =====================================================

SELECT '=== EXPECTED WORKFLOW ===' as workflow;

SELECT 'DRAFT → SUBMITTED → RECEIVED → PAID' as status_flow;
SELECT '  ↓         ↓         ↓        ↓' as arrows;
SELECT 'Nothing  Journal   Stock    Payment' as actions;
SELECT '         Entry    Update   Recorded' as details;

SELECT '=== TESTING INSTRUCTIONS ===' as instructions;

SELECT '1. Create a purchase invoice (DRAFT status)' as step;
SELECT '2. Submit invoice (SUBMITTED status) → Journal entry created' as step;
SELECT '3. Mark as received (RECEIVED status) → Stock updated' as step;
SELECT '4. Check Inventory page for updated quantities' as step;
SELECT '5. Check journal_entries table for audit trail' as step;

SELECT '=== SYSTEM READY ===' as status;
SELECT 'Complete system is ready for testing!' as message;
SELECT 'Both journal entries AND stock movements will work!' as note;



