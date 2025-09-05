-- =====================================================
-- TEST JOURNAL COLUMNS EXISTENCE
-- =====================================================
-- This script verifies that all required columns exist in the journal_entries table

-- Check current table structure
SELECT '=== CURRENT JOURNAL_ENTRIES TABLE STRUCTURE ===' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'journal_entries'
ORDER BY ordinal_position;

-- Check if required columns exist
SELECT '=== CHECKING REQUIRED COLUMNS ===' as info;

SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'journal_entries' AND column_name = 'entry_number'
    ) THEN '✅ entry_number exists' ELSE '❌ entry_number MISSING' END as status;

SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'journal_entries' AND column_name = 'reference'
    ) THEN '✅ reference exists' ELSE '❌ reference MISSING' END as status;

SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'journal_entries' AND column_name = 'memo'
    ) THEN '✅ memo exists' ELSE '❌ memo MISSING' END as status;

SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'journal_entries' AND column_name = 'total_debit'
    ) THEN '✅ total_debit exists' ELSE '❌ total_debit MISSING' END as status;

SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'journal_entries' AND column_name = 'total_credit'
    ) THEN '✅ total_credit exists' ELSE '❌ total_credit MISSING' END as status;

SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'journal_entries' AND column_name = 'is_balanced'
    ) THEN '✅ is_balanced exists' ELSE '❌ is_balanced MISSING' END as status;

SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'journal_entries' AND column_name = 'is_active'
    ) THEN '✅ is_active exists' ELSE '❌ is_active MISSING' END as status;

-- Check journal_entry_lines table structure
SELECT '=== CURRENT JOURNAL_ENTRY_LINES TABLE STRUCTURE ===' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'journal_entry_lines'
ORDER BY ordinal_position;

-- Check if required columns exist in journal_entry_lines
SELECT '=== CHECKING JOURNAL_ENTRY_LINES COLUMNS ===' as info;

SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'journal_entry_lines' AND column_name = 'line_number'
    ) THEN '✅ line_number exists' ELSE '❌ line_number MISSING' END as status;

SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'journal_entry_lines' AND column_name = 'updated_at'
    ) THEN '✅ updated_at exists' ELSE '❌ updated_at MISSING' END as status;

-- Check constraints
SELECT '=== CHECKING CONSTRAINTS ===' as info;

SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'journal_entries'::regclass
ORDER BY conname;

-- Check indexes
SELECT '=== CHECKING INDEXES ===' as info;

SELECT 
    indexname as index_name,
    indexdef as index_definition
FROM pg_indexes 
WHERE tablename = 'journal_entries'
ORDER BY indexname;

-- Final status
SELECT '=== FINAL STATUS ===' as info;
SELECT 
    CASE 
        WHEN COUNT(*) = 8 THEN '✅ All required columns exist in journal_entries'
        ELSE '❌ Missing columns in journal_entries: ' || COUNT(*) || '/8 found'
    END as status
FROM information_schema.columns 
WHERE table_name = 'journal_entries' 
AND column_name IN ('entry_number', 'reference', 'memo', 'total_debit', 'total_credit', 'is_balanced', 'is_active', 'updated_at');



