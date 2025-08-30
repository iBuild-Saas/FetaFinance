-- Quick test to check General Ledger functionality

-- 1. Check if the view exists
SELECT 
    'general_ledger_view' as object_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = 'general_ledger_view'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status;

-- 2. Check if there are any journal entries
SELECT 
    'journal_entries' as table_name,
    COUNT(*) as count,
    STRING_AGG(DISTINCT status, ', ') as statuses
FROM journal_entries;

-- 3. Check if there are any journal entry lines
SELECT 
    'journal_entry_lines' as table_name,
    COUNT(*) as count
FROM journal_entry_lines;

-- 4. Test the view directly
SELECT 
    'general_ledger_view' as view_name,
    COUNT(*) as count
FROM general_ledger_view;

-- 5. Show sample data from the view
SELECT 
    entry_number,
    entry_date,
    account_code,
    account_name,
    debit_amount,
    credit_amount,
    entry_status
FROM general_ledger_view
LIMIT 3;
