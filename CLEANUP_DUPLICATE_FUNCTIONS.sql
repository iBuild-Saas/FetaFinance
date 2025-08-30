-- Cleanup Duplicate Functions
-- This script removes duplicate functions that are causing conflicts

-- =====================================================
-- 1. CHECK FOR DUPLICATE FUNCTIONS
-- =====================================================

SELECT 'Checking for duplicate functions...' as step;

-- List all functions named create_stock_movement
SELECT 
    p.proname as function_name,
    p.oid as function_oid,
    pg_get_function_identity_arguments(p.oid) as arguments,
    p.prosrc as source_code_preview,
    p.prolang as language_oid,
    l.lanname as language_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_language l ON p.prolang = l.oid
WHERE p.proname = 'create_stock_movement'
ORDER BY p.oid;

-- =====================================================
-- 2. REMOVE ALL EXISTING FUNCTIONS
-- =====================================================

SELECT 'Removing all existing create_stock_movement functions...' as step;

-- Drop all functions with this name (we'll recreate the correct one)
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'create_stock_movement'
        AND n.nspname = 'public'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS create_stock_movement(' || func_record.args || ') CASCADE';
        RAISE NOTICE 'Dropped function create_stock_movement(%)', func_record.args;
    END LOOP;
END $$;

-- =====================================================
-- 3. REMOVE RELATED FUNCTIONS
-- =====================================================

SELECT 'Removing related functions...' as step;

-- Drop other related functions that might be causing conflicts
DROP FUNCTION IF EXISTS record_purchase_invoice_stock_movement(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_purchase_invoice_journal_entry(UUID) CASCADE;

-- =====================================================
-- 4. REMOVE TRIGGERS
-- =====================================================

SELECT 'Removing triggers...' as step;

-- Drop triggers that reference the functions
DROP TRIGGER IF EXISTS trg_purchase_invoice_stock_movement ON purchase_invoices;
DROP TRIGGER IF EXISTS trigger_purchase_invoice_journal ON purchase_invoices;

-- =====================================================
-- 5. VERIFY CLEANUP
-- =====================================================

SELECT 'Verifying cleanup...' as step;

-- Check if any functions remain
SELECT 
    'Remaining functions' as check_type,
    COUNT(*) as count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname IN ('create_stock_movement', 'record_purchase_invoice_stock_movement', 'create_purchase_invoice_journal_entry')
AND n.nspname = 'public';

-- Check if any triggers remain
SELECT 
    'Remaining triggers' as check_type,
    COUNT(*) as count
FROM information_schema.triggers 
WHERE trigger_name IN ('trg_purchase_invoice_stock_movement', 'trigger_purchase_invoice_journal');

-- =====================================================
-- 6. NEXT STEPS
-- =====================================================

SELECT 'Next Steps:' as next_steps;
SELECT '1. Run FIX_PURCHASE_INVOICE_INVENTORY.sql to create the correct functions' as step;
SELECT '2. Test the "Mark as Received" button in the frontend' as step;
SELECT '3. If successful, triggers will automatically create stock movements and journal entries' as step;

-- =====================================================
-- 7. IMPORTANT NOTE
-- =====================================================

SELECT '⚠️ IMPORTANT:' as warning;
SELECT 'All duplicate functions have been removed' as note;
SELECT 'You must now run FIX_PURCHASE_INVOICE_INVENTORY.sql to restore functionality' as note;
SELECT 'The status update should work without the "function is not unique" error' as note;
