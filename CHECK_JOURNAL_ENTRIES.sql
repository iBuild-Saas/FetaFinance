-- Check journal entries and general ledger data

-- 1. Check if journal_entries table has data
SELECT 
    COUNT(*) as total_journal_entries,
    MIN(entry_date) as earliest_entry,
    MAX(entry_date) as latest_entry
FROM journal_entries;

-- 2. Check recent journal entries
SELECT 
    entry_number,
    entry_date,
    description,
    reference_type,
    reference_number,
    status,
    created_at
FROM journal_entries 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Check journal_entry_lines table
SELECT 
    COUNT(*) as total_journal_lines
FROM journal_entry_lines;

-- 4. Check recent journal entry lines
SELECT 
    jel.journal_entry_id,
    je.entry_number,
    je.entry_date,
    jel.account_id,
    jel.debit_amount,
    jel.credit_amount,
    jel.description
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.journal_entry_id = je.id
ORDER BY je.created_at DESC 
LIMIT 20;

-- 5. Check if accounts exist for journal entries
SELECT 
    'Accounts referenced in journal entries:' as info,
    COUNT(DISTINCT jel.account_id) as unique_accounts
FROM journal_entry_lines jel;

-- 6. Check date range of journal entries
SELECT 
    'Journal entries date range:' as info,
    MIN(entry_date) as min_date,
    MAX(entry_date) as max_date,
    COUNT(*) as total_entries
FROM journal_entries
WHERE entry_date >= '2023-01-01';

-- 7. Check for sales invoice journal entries specifically
SELECT 
    'Sales invoice journal entries:' as info,
    COUNT(*) as count
FROM journal_entries 
WHERE reference_type = 'sales_invoice';

-- 8. Check journal entries structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'journal_entries'
ORDER BY ordinal_position;
