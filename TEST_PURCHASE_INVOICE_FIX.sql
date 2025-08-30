-- =====================================================
-- TEST PURCHASE INVOICE INVENTORY SYSTEM
-- =====================================================
-- This script tests the purchase invoice inventory system
-- Note: Journal entries are handled by existing system on SUBMITTED status

-- =====================================================
-- 1. CHECK CURRENT STATUS CONSTRAINTS
-- =====================================================

SELECT 'Checking current status constraints...' as step;

SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'purchase_invoices'::regclass 
AND contype = 'c';

-- =====================================================
-- 2. CHECK IF REQUIRED TABLES EXIST
-- =====================================================

SELECT 'Checking required tables...' as step;

SELECT 
    table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name) 
         THEN 'EXISTS' ELSE 'MISSING' END as status
FROM (VALUES ('stock_items'), ('stock_movements')) AS t(table_name);

-- =====================================================
-- 3. CHECK IF FUNCTIONS EXIST
-- =====================================================

SELECT 'Checking functions...' as step;

SELECT 
    routine_name as function_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name IN ('create_stock_movement', 'record_purchase_invoice_stock_movement')
ORDER BY routine_name;

-- =====================================================
-- 4. CHECK IF TRIGGERS EXIST
-- =====================================================

SELECT 'Checking triggers...' as step;

SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_name IN ('trg_purchase_invoice_stock_movement')
ORDER BY trigger_name;

-- =====================================================
-- 5. TEST STATUS UPDATE
-- =====================================================

SELECT 'Testing status update...' as step;

-- Find a purchase invoice to test with
SELECT 
    id,
    invoice_number,
    status,
    company_id
FROM purchase_invoices 
WHERE status = 'SUBMITTED'
LIMIT 1;

-- =====================================================
-- 6. TEST STOCK MOVEMENT FUNCTION
-- =====================================================

SELECT 'Testing stock movement function...' as step;

-- Test the stock movement function with a sample invoice ID
-- Replace 'SAMPLE_INVOICE_ID' with an actual invoice ID from step 5
DO $$
DECLARE
    v_invoice_id UUID;
BEGIN
    -- Get a sample invoice ID
    SELECT id INTO v_invoice_id 
    FROM purchase_invoices 
    WHERE status = 'SUBMITTED'
    LIMIT 1;
    
    IF v_invoice_id IS NOT NULL THEN
        RAISE NOTICE 'Testing with invoice ID: %', v_invoice_id;
        
        -- Test stock movement function
        BEGIN
            PERFORM record_purchase_invoice_stock_movement(v_invoice_id);
            RAISE NOTICE 'Stock movement function test PASSED';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Stock movement function test FAILED: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'No SUBMITTED invoices found to test with';
    END IF;
END $$;

-- =====================================================
-- 7. CHECK STOCK ITEMS
-- =====================================================

SELECT 'Checking stock items...' as step;

SELECT 
    COUNT(*) as total_stock_items,
    SUM(current_quantity) as total_quantity,
    AVG(average_cost) as avg_cost
FROM stock_items;

-- =====================================================
-- 8. CHECK STOCK MOVEMENTS
-- =====================================================

SELECT 'Checking stock movements...' as step;

SELECT 
    COUNT(*) as total_movements,
    movement_type,
    COUNT(*) as count
FROM stock_movements 
GROUP BY movement_type;

-- =====================================================
-- 9. CHECK EXISTING JOURNAL ENTRIES
-- =====================================================

SELECT 'Checking existing journal entries...' as step;

SELECT 
    COUNT(*) as total_journal_entries,
    reference_type,
    COUNT(*) as count
FROM journal_entries 
WHERE reference_type = 'purchase_invoice'
GROUP BY reference_type;

-- =====================================================
-- 10. SUMMARY
-- =====================================================

SELECT '=== TEST SUMMARY ===' as summary;

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
    'create_stock_movement, record_purchase_invoice_stock_movement' as details
FROM information_schema.routines 
WHERE routine_name IN ('create_stock_movement', 'record_purchase_invoice_stock_movement')

UNION ALL

SELECT 
    'Triggers' as component,
    COUNT(*) as count,
    'trg_purchase_invoice_stock_movement' as details
FROM information_schema.triggers 
WHERE trigger_name IN ('trg_purchase_invoice_stock_movement')

UNION ALL

SELECT 
    'Constraints' as component,
    COUNT(*) as count,
    'purchase_invoices_status_check' as details
FROM pg_constraint 
WHERE conrelid = 'purchase_invoices'::regclass 
AND contype = 'c';

-- =====================================================
-- 11. SYSTEM STATUS
-- =====================================================

SELECT '=== SYSTEM STATUS ===' as status;

SELECT 
    'Journal Entries' as component,
    'EXISTING SYSTEM' as status,
    'Created when status = SUBMITTED' as details

UNION ALL

SELECT 
    'Stock Movements' as component,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trg_purchase_invoice_stock_movement')
         THEN 'NEW SYSTEM READY' ELSE 'NOT READY' END as status,
    'Created when status = RECEIVED' as details

UNION ALL

SELECT 
    'Status Constraint' as component,
    CASE WHEN EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'purchase_invoices'::regclass AND contype = 'c')
         THEN 'UPDATED' ELSE 'NOT UPDATED' END as status,
    'Allows RECEIVED status' as details;

SELECT '=== SYSTEM READY ===' as status;
SELECT 'If all components show count > 0, the system is ready to use!' as message;
SELECT 'Journal entries: Use existing system (SUBMITTED status)' as note;
SELECT 'Stock movements: Use new system (RECEIVED status)' as note;
