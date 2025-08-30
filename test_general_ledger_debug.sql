-- Test script to diagnose General Ledger issues
-- Run this to check the current state and identify problems

-- 1. Check if the required tables exist
SELECT 
    table_name,
    CASE WHEN table_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM (
    VALUES 
        ('journal_entries'),
        ('journal_entry_lines'),
        ('chart_of_accounts')
) AS required_tables(table_name)
WHERE table_name IN (
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
);

-- 2. Check if the views and functions exist
SELECT 
    object_name,
    object_type,
    CASE WHEN object_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM (
    VALUES 
        ('general_ledger_view', 'VIEW'),
        ('get_account_ledger', 'FUNCTION'),
        ('get_trial_balance', 'FUNCTION')
) AS required_objects(object_name, object_type)
WHERE object_name IN (
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public'
    UNION
    SELECT table_name 
    FROM information_schema.views 
    WHERE table_schema = 'public'
);

-- 3. Check if there are any journal entries
SELECT 
    'journal_entries' as table_name,
    COUNT(*) as record_count,
    CASE WHEN COUNT(*) > 0 THEN 'HAS DATA' ELSE 'NO DATA' END as status
FROM journal_entries
UNION ALL
SELECT 
    'journal_entry_lines' as table_name,
    COUNT(*) as record_count,
    CASE WHEN COUNT(*) > 0 THEN 'HAS DATA' ELSE 'NO DATA' END as status
FROM journal_entry_lines;

-- 4. Check journal entry statuses
SELECT 
    status,
    COUNT(*) as count
FROM journal_entries
GROUP BY status
ORDER BY status;

-- 5. Check if journal entries are linked to accounts
SELECT 
    'Linked Entries' as description,
    COUNT(*) as count
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.journal_entry_id = je.id
JOIN chart_of_accounts coa ON jel.account_id = coa.id
WHERE je.is_active = true AND coa.is_active = true;

-- 6. Test the general_ledger_view directly
SELECT 
    'general_ledger_view' as view_name,
    COUNT(*) as record_count,
    CASE WHEN COUNT(*) > 0 THEN 'HAS DATA' ELSE 'NO DATA' END as status
FROM general_ledger_view;

-- 7. Check sample data from general_ledger_view
SELECT 
    entry_number,
    entry_date,
    account_code,
    account_name,
    debit_amount,
    credit_amount,
    entry_status
FROM general_ledger_view
LIMIT 5;

-- 8. Test the get_account_ledger function (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'get_account_ledger' 
        AND routine_schema = 'public'
    ) THEN
        RAISE NOTICE 'get_account_ledger function exists - testing...';
    ELSE
        RAISE NOTICE 'get_account_ledger function MISSING - run CREATE_GENERAL_LEDGER_VIEWS.sql';
    END IF;
END $$;

-- 9. Check for any error logs or issues
SELECT 
    'Database Status' as check_type,
    CASE 
        WHEN (SELECT COUNT(*) FROM journal_entries) > 0 
        AND (SELECT COUNT(*) FROM journal_entry_lines) > 0
        AND (SELECT COUNT(*) FROM general_ledger_view) > 0
        THEN 'GENERAL LEDGER SHOULD WORK'
        WHEN (SELECT COUNT(*) FROM journal_entries) = 0 
        THEN 'NO JOURNAL ENTRIES - Create some first'
        WHEN (SELECT COUNT(*) FROM journal_entry_lines) = 0 
        THEN 'NO JOURNAL ENTRY LINES - Check journal entry creation'
        WHEN (SELECT COUNT(*) FROM general_ledger_view) = 0 
        THEN 'VIEW NOT WORKING - Check database setup'
        ELSE 'UNKNOWN ISSUE'
    END as status;
