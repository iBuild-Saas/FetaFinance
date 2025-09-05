-- Comprehensive debug for financial statements issue

-- 1. Check if enhanced functions exist
SELECT 'Checking if enhanced functions exist:' as debug_step;
SELECT
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
WHERE p.proname IN ('get_income_statement', 'get_balance_sheet')
ORDER BY p.proname;

-- 2. Check company data
SELECT 'Checking company data:' as debug_step;
SELECT id, name FROM companies WHERE id::TEXT = '1754730703821';

-- 3. Check journal entries for this company
SELECT 'Checking journal entries for company:' as debug_step;
SELECT
    COUNT(*) as total_entries,
    COUNT(CASE WHEN status = 'POSTED' THEN 1 END) as posted_entries,
    MIN(entry_date) as earliest_date,
    MAX(entry_date) as latest_date,
    SUM((SELECT COUNT(*) FROM journal_entry_lines jel WHERE jel.journal_entry_id = je.id)) as total_line_items
FROM journal_entries je
WHERE je.company_id::TEXT = '1754730703821';

-- 4. Check chart of accounts structure
SELECT 'Checking chart of accounts structure:' as debug_step;
SELECT
    account_type,
    COUNT(*) as count,
    (SELECT STRING_AGG(account_code || ' - ' || account_name, '; ')
     FROM (SELECT account_code, account_name FROM chart_of_accounts coa2
           WHERE coa2.account_type = coa.account_type
           ORDER BY account_code LIMIT 3) as samples) as sample_accounts
FROM chart_of_accounts coa
GROUP BY account_type
ORDER BY account_type;

-- 5. Check if accounts are linked to journal entries
SELECT 'Checking account-to-journal linkages:' as debug_step;
SELECT
    coa.account_type,
    COUNT(DISTINCT je.id) as entries_count,
    COUNT(jel.id) as line_items_count,
    SUM(jel.debit_amount) as total_debits,
    SUM(jel.credit_amount) as total_credits
FROM chart_of_accounts coa
LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
    AND je.company_id::TEXT = '1754730703821'
    AND je.status = 'POSTED'
WHERE coa.account_type IN ('REVENUE', 'INCOME', 'EXPENSE', 'COST_OF_GOODS_SOLD', 'ASSET', 'LIABILITY', 'EQUITY')
GROUP BY coa.account_type
ORDER BY coa.account_type;

-- 6. Test the functions directly
SELECT 'Testing income statement function:' as debug_step;
SELECT * FROM get_income_statement('1754730703821', '2020-01-01', '2030-12-31') LIMIT 5;

SELECT 'Testing balance sheet function:' as debug_step;
SELECT * FROM get_balance_sheet('1754730703821', '2030-12-31') LIMIT 5;

-- 7. Check if there are any journal entries at all
SELECT 'Checking all journal entries in database:' as debug_step;
SELECT
    company_id,
    COUNT(*) as entries,
    COUNT(CASE WHEN status = 'POSTED' THEN 1 END) as posted,
    MIN(entry_date) as min_date,
    MAX(entry_date) as max_date
FROM journal_entries
GROUP BY company_id
LIMIT 5;

-- 8. Check specific accounts that should appear in financial statements
SELECT 'Checking specific accounts for financial statements:' as debug_step;
SELECT DISTINCT
    coa.account_type,
    coa.account_code,
    coa.account_name,
    COUNT(jel.id) as transactions_count,
    SUM(COALESCE(jel.debit_amount, 0)) as total_debits,
    SUM(COALESCE(jel.credit_amount, 0)) as total_credits
FROM chart_of_accounts coa
LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
WHERE coa.account_type IN ('REVENUE', 'EXPENSE', 'ASSET', 'LIABILITY', 'EQUITY')
    AND je.company_id::TEXT = '1754730703821'
    AND je.status = 'POSTED'
GROUP BY coa.account_type, coa.account_code, coa.account_name
HAVING COUNT(jel.id) > 0
ORDER BY coa.account_type, coa.account_code
LIMIT 10;
