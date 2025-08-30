-- Re-enable Purchase Invoice Triggers
-- Run this AFTER successfully running FIX_PURCHASE_INVOICE_INVENTORY.sql

-- =====================================================
-- 1. CHECK IF REQUIRED TABLES AND FUNCTIONS EXIST
-- =====================================================

SELECT 'Checking prerequisites...' as step;

-- Check if stock_items table exists
SELECT 
    'stock_items' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_items') 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check if stock_movements table exists
SELECT 
    'stock_movements' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_movements') 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check if journal_entries table exists
SELECT 
    'journal_entries' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entries') 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check if journal_entry_lines table exists
SELECT 
    'journal_entry_lines' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entry_lines') 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check if required functions exist
SELECT 
    'record_purchase_invoice_stock_movement' as function_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'record_purchase_invoice_stock_movement') 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

SELECT 
    'create_purchase_invoice_journal_entry' as function_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'create_purchase_invoice_journal_entry') 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- =====================================================
-- 2. RE-ENABLE TRIGGERS
-- =====================================================

SELECT 'Re-enabling triggers...' as step;

-- Re-enable stock movement trigger
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trg_purchase_invoice_stock_movement') THEN
        ALTER TABLE purchase_invoices ENABLE TRIGGER trg_purchase_invoice_stock_movement;
        RAISE NOTICE '✅ Re-enabled stock movement trigger';
    ELSE
        RAISE NOTICE '❌ Stock movement trigger does not exist - run FIX_PURCHASE_INVOICE_INVENTORY.sql first';
    END IF;
END $$;

-- Re-enable journal entry trigger
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_purchase_invoice_journal') THEN
        ALTER TABLE purchase_invoices ENABLE TRIGGER trigger_purchase_invoice_journal;
        RAISE NOTICE '✅ Re-enabled journal entry trigger';
    ELSE
        RAISE NOTICE '❌ Journal entry trigger does not exist - run FIX_PURCHASE_INVOICE_INVENTORY.sql first';
    END IF;
END $$;

-- =====================================================
-- 3. VERIFY TRIGGER STATUS
-- =====================================================

SELECT 'Verifying trigger status...' as step;

-- Check trigger status using pg_trigger system catalog
SELECT 
    t.tgname as trigger_name,
    CASE WHEN t.tgenabled = 'O' THEN '✅ ENABLED' 
         WHEN t.tgenabled = 'D' THEN '❌ DISABLED'
         WHEN t.tgenabled = 'R' THEN '⚠️ REPLICA'
         WHEN t.tgenabled = 'A' THEN '✅ ALWAYS'
         ELSE '❓ UNKNOWN' END as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'purchase_invoices'
AND t.tgname IN ('trg_purchase_invoice_stock_movement', 'trigger_purchase_invoice_journal')
ORDER BY t.tgname;

-- =====================================================
-- 4. TEST TRIGGER FUNCTIONALITY
-- =====================================================

SELECT 'Testing trigger functionality...' as step;

-- Test with a sample purchase invoice (if any exist)
DO $$
DECLARE
    v_test_invoice_id UUID;
    v_test_status VARCHAR(20);
BEGIN
    -- Get a test invoice
    SELECT id, status INTO v_test_invoice_id, v_test_status
    FROM purchase_invoices 
    WHERE status IN ('SUBMITTED', 'DRAFT')
    LIMIT 1;
    
    IF v_test_invoice_id IS NULL THEN
        RAISE NOTICE 'ℹ️ No test invoices found - create a purchase invoice first';
        RETURN;
    END IF;
    
    RAISE NOTICE '🧪 Testing triggers with invoice % (current status: %)', v_test_invoice_id, v_test_status;
    
    -- Try to update status to trigger the functions
    UPDATE purchase_invoices 
    SET status = 'RECEIVED', updated_at = NOW()
    WHERE id = v_test_invoice_id;
    
    IF FOUND THEN
        RAISE NOTICE '✅ Test status update successful - triggers should have executed';
        
        -- Check if stock movements were created
        PERFORM 1 FROM stock_movements 
        WHERE reference_type = 'purchase_invoice' AND reference_id = v_test_invoice_id;
        
        IF FOUND THEN
            RAISE NOTICE '✅ Stock movements created successfully';
        ELSE
            RAISE NOTICE '⚠️ No stock movements found - check trigger function';
        END IF;
        
        -- Check if journal entries were created
        PERFORM 1 FROM journal_entries 
        WHERE reference_type = 'purchase_invoice' AND reference_id = v_test_invoice_id;
        
        IF FOUND THEN
            RAISE NOTICE '✅ Journal entries created successfully';
        ELSE
            RAISE NOTICE '⚠️ No journal entries found - check trigger function';
        END IF;
        
        -- Revert test
        UPDATE purchase_invoices 
        SET status = v_test_status, updated_at = NOW()
        WHERE id = v_test_invoice_id;
        
        RAISE NOTICE '🔄 Reverted test invoice back to status: %', v_test_status;
        
    ELSE
        RAISE NOTICE '❌ Test status update failed';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error during trigger test: %', SQLERRM;
END $$;

-- =====================================================
-- 5. FINAL STATUS CHECK
-- =====================================================

SELECT 'Final status check...' as step;

SELECT 
    'System Status' as component,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_items')
         AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_movements')
         AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entries')
         AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entry_lines')
         AND EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'record_purchase_invoice_stock_movement')
         AND EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'create_purchase_invoice_journal_entry')
         AND EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trg_purchase_invoice_stock_movement')
         AND EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_purchase_invoice_journal')
        THEN '✅ FULLY OPERATIONAL'
        ELSE '❌ INCOMPLETE SETUP'
    END as status;

-- =====================================================
-- 6. NEXT STEPS
-- =====================================================

SELECT 'Next Steps:' as next_steps;
SELECT '1. Test the "Mark as Received" button in the frontend' as step;
SELECT '2. Check if stock quantities are updated automatically' as step;
SELECT '3. Check if journal entries are created automatically' as step;
SELECT '4. If issues persist, check the database logs for specific errors' as step;
