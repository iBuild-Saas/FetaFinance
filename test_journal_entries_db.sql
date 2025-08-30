-- Test script to verify journal entries database setup
-- Run this to check if tables exist and have the correct structure

-- Check if tables exist
SELECT
    table_name,
    CASE
        WHEN table_name = 'journal_entries' THEN 'Main table for journal entries'
        WHEN table_name = 'journal_entry_lines' THEN 'Line items for journal entries'
        ELSE 'Other table'
    END as description
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('journal_entries', 'journal_entry_lines')
ORDER BY table_name;

-- Check journal_entries table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'journal_entries'
ORDER BY ordinal_position;

-- Check journal_entry_lines table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'journal_entry_lines'
ORDER BY ordinal_position;

-- Check if triggers exist
SELECT
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%journal%'
ORDER BY trigger_name;

-- Check if functions exist
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%journal%'
ORDER BY routine_name;

-- Optional: Check for some sample data (if any)
-- SELECT * FROM journal_entries LIMIT 1;
-- SELECT * FROM journal_entry_lines LIMIT 1;
