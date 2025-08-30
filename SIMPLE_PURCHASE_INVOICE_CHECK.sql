-- Simple Purchase Invoice Check
-- This script safely checks what exists without causing errors

-- =====================================================
-- 1. CHECK RECENT PURCHASE INVOICES
-- =====================================================

SELECT '=== RECENT PURCHASE INVOICES ===' as section;

-- Show recent purchase invoices
SELECT 
    pi.id,
    pi.invoice_number,
    pi.status,
    pi.total_amount,
    pi.updated_at,
    CASE WHEN s.name IS NOT NULL THEN s.name ELSE 'Unknown Supplier' END as supplier_name
FROM purchase_invoices pi
LEFT JOIN suppliers s ON pi.supplier_id = s.id
ORDER BY pi.updated_at DESC
LIMIT 10;

-- Count by status
SELECT 
    status,
    COUNT(*) as count
FROM purchase_invoices
GROUP BY status
ORDER BY status;

-- =====================================================
-- 2. CHECK TABLE EXISTENCE
-- =====================================================

SELECT '=== TABLE EXISTENCE CHECK ===' as section;

SELECT 
    t.table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t.table_name) 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (VALUES 
    ('purchase_invoices'),
    ('purchase_invoice_line_items'),
    ('stock_items'),
    ('stock_movements'),
    ('journal_entries'),
    ('journal_entry_lines'),
    ('items'),
    ('suppliers'),
    ('companies'),
    ('chart_of_accounts')
) AS t(table_name)
ORDER BY t.table_name;

-- =====================================================
-- 3. CHECK FUNCTION EXISTENCE
-- =====================================================

SELECT '=== FUNCTION EXISTENCE CHECK ===' as section;

SELECT 
    f.function_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = f.function_name) 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (VALUES 
    ('create_stock_movement'),
    ('record_purchase_invoice_stock_movement'),
    ('create_purchase_invoice_journal_entry')
) AS f(function_name)
ORDER BY f.function_name;

-- =====================================================
-- 4. CHECK TRIGGER EXISTENCE
-- =====================================================

SELECT '=== TRIGGER EXISTENCE CHECK ===' as section;

SELECT 
    t.trigger_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = t.trigger_name) 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (VALUES 
    ('trg_purchase_invoice_stock_movement'),
    ('trigger_purchase_invoice_journal')
) AS t(trigger_name)
ORDER BY t.trigger_name;

-- =====================================================
-- 5. CHECK TABLE STRUCTURES (SAFE)
-- =====================================================

SELECT '=== TABLE STRUCTURES ===' as section;

-- Check journal_entries structure
SELECT '--- journal_entries columns ---' as subsection;
SELECT 
    column_name,
    data_type,
    is_nullable,
    CASE WHEN column_default IS NULL THEN 'none' ELSE column_default END as default_value
FROM information_schema.columns 
WHERE table_name = 'journal_entries'
ORDER BY ordinal_position;

-- Check stock_movements structure (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_movements') THEN
        RAISE NOTICE '--- stock_movements table exists ---';
    ELSE
        RAISE NOTICE '--- stock_movements table does NOT exist ---';
    END IF;
END $$;

-- Check stock_items structure (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_items') THEN
        RAISE NOTICE '--- stock_items table exists ---';
    ELSE
        RAISE NOTICE '--- stock_items table does NOT exist ---';
    END IF;
END $$;

-- =====================================================
-- 6. CHECK CHART OF ACCOUNTS
-- =====================================================

SELECT '=== CHART OF ACCOUNTS CHECK ===' as section;

-- Count accounts by type
SELECT 
    account_type,
    COUNT(*) as count
FROM chart_of_accounts
GROUP BY account_type
ORDER BY account_type;

-- Look for inventory and payable accounts
SELECT '--- Potential Inventory/Payable Accounts ---' as subsection;
SELECT 
    account_code,
    account_name,
    account_type,
    is_group
FROM chart_of_accounts
WHERE LOWER(account_name) LIKE '%inventory%' 
   OR LOWER(account_name) LIKE '%payable%'
   OR LOWER(account_name) LIKE '%stock%'
   OR LOWER(account_name) LIKE '%supplier%'
ORDER BY account_type, account_code;

-- =====================================================
-- 7. SUMMARY
-- =====================================================

SELECT '=== SUMMARY ===' as section;

-- Count missing core components
WITH component_check AS (
    SELECT 'stock_items' as component, 
           CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_items') THEN 1 ELSE 0 END as exists_flag
    UNION ALL
    SELECT 'stock_movements',
           CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_movements') THEN 1 ELSE 0 END
    UNION ALL
    SELECT 'journal_entries',
           CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entries') THEN 1 ELSE 0 END
    UNION ALL
    SELECT 'journal_entry_lines',
           CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entry_lines') THEN 1 ELSE 0 END
    UNION ALL
    SELECT 'create_stock_movement',
           CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'create_stock_movement') THEN 1 ELSE 0 END
    UNION ALL
    SELECT 'record_purchase_invoice_stock_movement',
           CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'record_purchase_invoice_stock_movement') THEN 1 ELSE 0 END
    UNION ALL
    SELECT 'create_purchase_invoice_journal_entry',
           CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'create_purchase_invoice_journal_entry') THEN 1 ELSE 0 END
    UNION ALL
    SELECT 'trg_purchase_invoice_stock_movement',
           CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trg_purchase_invoice_stock_movement') THEN 1 ELSE 0 END
    UNION ALL
    SELECT 'trigger_purchase_invoice_journal',
           CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_purchase_invoice_journal') THEN 1 ELSE 0 END
)
SELECT 
    COUNT(*) as total_components,
    SUM(exists_flag) as existing_components,
    COUNT(*) - SUM(exists_flag) as missing_components,
    CASE WHEN SUM(exists_flag) = COUNT(*) THEN '✅ COMPLETE' ELSE '❌ INCOMPLETE' END as status
FROM component_check;

-- =====================================================
-- 8. NEXT STEPS
-- =====================================================

SELECT '=== NEXT STEPS ===' as section;

SELECT 'Based on the results above:' as instruction;
SELECT '1. If most components are missing: Run COMPLETE_PURCHASE_INVOICE_SETUP.sql' as step;
SELECT '2. If some components exist: Run CLEANUP_DUPLICATE_FUNCTIONS.sql first' as step;
SELECT '3. If journal_entries exists but lacks columns: Tables need to be updated' as step;
SELECT '4. After setup: Test by marking a purchase invoice as RECEIVED' as step;
