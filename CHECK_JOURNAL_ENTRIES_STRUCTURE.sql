-- Check journal_entries table structure
SELECT '=== JOURNAL_ENTRIES TABLE STRUCTURE ===' as info;

-- Show column names and data types
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'journal_entries' 
ORDER BY ordinal_position;

-- Show sample data
SELECT '=== SAMPLE JOURNAL ENTRIES ===' as info;
SELECT 
    id,
    journal_number,
    description,
    company_id,
    reference_type,
    reference_id,
    created_at
FROM journal_entries 
LIMIT 3;

-- Check journal_entry_lines structure
SELECT '=== JOURNAL_ENTRY_LINES TABLE STRUCTURE ===' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'journal_entry_lines' 
ORDER BY ordinal_position;

-- Show sample journal entry lines
SELECT '=== SAMPLE JOURNAL ENTRY LINES ===' as info;
SELECT 
    id,
    journal_entry_id,
    account_id,
    debit_amount,
    credit_amount,
    description,
    created_at
FROM journal_entry_lines 
LIMIT 5;
