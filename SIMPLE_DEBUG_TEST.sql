-- Simple test to check if enhanced functions work
SELECT '=== FINANCIAL STATEMENTS DEBUG ===' as title;

-- Check if functions exist
SELECT '1. Function Check:' as step;
SELECT proname as function_name, pg_get_function_arguments(oid) as args
FROM pg_proc WHERE proname IN ('get_income_statement', 'get_balance_sheet');

-- Check company data
SELECT '2. Company Check:' as step;
SELECT id, name FROM companies LIMIT 3;

-- Check journal entries
SELECT '3. Journal Entries Check:' as step;
SELECT COUNT(*) as total_entries,
       COUNT(CASE WHEN status = 'POSTED' THEN 1 END) as posted_entries,
       MIN(entry_date) as earliest_date,
       MAX(entry_date) as latest_date
FROM journal_entries;

-- Check chart of accounts
SELECT '4. Chart of Accounts Check:' as step;
SELECT account_type, COUNT(*) as count
FROM chart_of_accounts
GROUP BY account_type
ORDER BY account_type;

-- Test functions with any company
SELECT '5. Income Statement Test (any company):' as step;
SELECT * FROM get_income_statement('any', '2020-01-01', '2030-12-31') LIMIT 3;

SELECT '6. Balance Sheet Test (any company):' as step;
SELECT * FROM get_balance_sheet('any', '2030-12-31') LIMIT 3;

-- Test with specific company ID
SELECT '7. Income Statement Test (specific company):' as step;
SELECT * FROM get_income_statement('1754730703821', '2020-01-01', '2030-12-31') LIMIT 3;

SELECT '8. Balance Sheet Test (specific company):' as step;
SELECT * FROM get_balance_sheet('1754730703821', '2030-12-31') LIMIT 3;
