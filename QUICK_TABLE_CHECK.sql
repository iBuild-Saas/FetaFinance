-- Quick Table Check
-- This script quickly checks if required tables exist

-- =====================================================
-- 1. CHECK IF TABLES EXIST
-- =====================================================

SELECT '=== CHECKING IF TABLES EXIST ===' as section;

-- Check if journal_entries table exists
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'journal_entries'
    ) THEN '✅ journal_entries EXISTS' ELSE '❌ journal_entries MISSING' END as status;

-- Check if journal_entry_lines table exists
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'journal_entry_lines'
    ) THEN '✅ journal_entry_lines EXISTS' ELSE '❌ journal_entry_lines MISSING' END as status;

-- Check if stock_items table exists
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'stock_items'
    ) THEN '✅ stock_items EXISTS' ELSE '❌ stock_items MISSING' END as status;

-- Check if stock_movements table exists
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'stock_movements'
    ) THEN '✅ stock_movements EXISTS' ELSE '❌ stock_movements MISSING' END as status;

-- Check if account_mappings table exists
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'account_mappings'
    ) THEN '✅ account_mappings EXISTS' ELSE '❌ account_mappings MISSING' END as status;

-- =====================================================
-- 2. CHECK TABLE STRUCTURES
-- =====================================================

SELECT '=== CHECKING TABLE STRUCTURES ===' as section;

-- Show journal_entries columns if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entries') THEN
        RAISE NOTICE '📋 journal_entries columns:';
        FOR col IN 
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'journal_entries'
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '   %: % (nullable: %)', col.column_name, col.data_type, col.is_nullable;
        END LOOP;
    ELSE
        RAISE NOTICE '❌ journal_entries table does not exist';
    END IF;
END $$;

-- =====================================================
-- 3. CHECK PERMISSIONS
-- =====================================================

SELECT '=== CHECKING PERMISSIONS ===' as section;

-- Check if authenticated user has access to journal_entries
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entries') THEN
        BEGIN
            -- Try to select from journal_entries
            PERFORM 1 FROM journal_entries LIMIT 1;
            RAISE NOTICE '✅ Can access journal_entries table';
        EXCEPTION
            WHEN insufficient_privilege THEN
                RAISE NOTICE '❌ Insufficient privileges on journal_entries table';
            WHEN OTHERS THEN
                RAISE NOTICE '❌ Error accessing journal_entries: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '❌ journal_entries table does not exist - cannot check permissions';
    END IF;
END $$;

-- =====================================================
-- 4. NEXT STEPS
-- =====================================================

SELECT '=== NEXT STEPS ===' as section;

SELECT 'Run this script to see what tables exist and what is missing' as instruction;
SELECT 'Then we can create missing tables or fix permission issues' as explanation;
