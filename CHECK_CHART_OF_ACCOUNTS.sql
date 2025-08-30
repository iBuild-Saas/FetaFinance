-- Check Chart of Accounts Table Structure
-- This script diagnoses what columns actually exist

-- =====================================================
-- 1. CHECK WHAT COLUMNS EXIST
-- =====================================================

SELECT '=== CHECKING WHAT COLUMNS EXIST ===' as section;

-- Show all columns that actually exist
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'chart_of_accounts'
ORDER BY ordinal_position;

-- =====================================================
-- 2. CHECK TABLE DEFINITION
-- =====================================================

SELECT '=== CHECKING TABLE DEFINITION ===' as section;

-- Show the actual table definition
SELECT 
    schemaname,
    tablename,
    tableowner,
    tablespace,
    hasindexes,
    hasrules,
    hastriggers,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'chart_of_accounts';

-- =====================================================
-- 3. CHECK IF TABLE EXISTS
-- =====================================================

SELECT '=== CHECKING IF TABLE EXISTS ===' as section;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'chart_of_accounts'
        ) THEN '✅ Table EXISTS'
        ELSE '❌ Table DOES NOT EXIST'
    END as table_status;

-- =====================================================
-- 4. CHECK SAMPLE DATA
-- =====================================================

SELECT '=== CHECKING SAMPLE DATA ===' as section;

-- Try to select from the table to see what works
DO $$
BEGIN
    -- This will show us what columns we can actually query
    RAISE NOTICE 'Attempting to query chart_of_accounts...';
    
    -- Check if we can select basic columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chart_of_accounts' AND column_name = 'id') THEN
        RAISE NOTICE '✅ id column exists';
    ELSE
        RAISE NOTICE '❌ id column missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chart_of_accounts' AND column_name = 'company_id') THEN
        RAISE NOTICE '✅ company_id column exists';
    ELSE
        RAISE NOTICE '❌ company_id column missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chart_of_accounts' AND column_name = 'account_type') THEN
        RAISE NOTICE '✅ account_type column exists';
    ELSE
        RAISE NOTICE '❌ account_type column missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chart_of_accounts' AND column_name = 'name') THEN
        RAISE NOTICE '✅ name column exists';
    ELSE
        RAISE NOTICE '❌ name column missing';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chart_of_accounts' AND column_name = 'normal_balance') THEN
        RAISE NOTICE '✅ normal_balance column exists';
    ELSE
        RAISE NOTICE '❌ normal_balance column missing';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error checking columns: %', SQLERRM;
END $$;

-- =====================================================
-- 5. NEXT STEPS
-- =====================================================

SELECT '=== NEXT STEPS ===' as section;

SELECT 'Run this script to see what columns actually exist' as instruction;
SELECT 'Then we can create a proper fix based on the actual structure' as explanation;
