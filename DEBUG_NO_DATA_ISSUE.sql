-- Debug why financial statements show no data despite having data

-- 1. Check what data exists for the selected company
SELECT 'Company Data Check:' as debug_step;
SELECT id, name FROM companies WHERE id = '1754730703821';

-- 2. Check journal entries for this company
SELECT 'Journal Entries Check:' as debug_step;
SELECT 
    COUNT(*) as total_entries,
    COUNT(CASE WHEN status = 'POSTED' THEN 1 END) as posted_entries,
    MIN(entry_date) as earliest_date,
    MAX(entry_date) as latest_date
FROM journal_entries 
WHERE company_id::TEXT = '1754730703821';

-- 3. Check journal entry lines
SELECT 'Journal Entry Lines Check:' as debug_step;
SELECT 
    COUNT(*) as total_lines,
    SUM(debit_amount) as total_debits,
    SUM(credit_amount) as total_credits
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.journal_entry_id = je.id
WHERE je.company_id::TEXT = '1754730703821' AND je.status = 'POSTED';

-- 4. Check chart of accounts
SELECT 'Chart of Accounts Check:' as debug_step;
SELECT 
    account_type,
    COUNT(*) as account_count
FROM chart_of_accounts
GROUP BY account_type
ORDER BY account_type;

-- 5. Check if accounts are linked properly
SELECT 'Account Linkage Check:' as debug_step;
SELECT 
    coa.account_type,
    COUNT(jel.id) as line_count,
    SUM(jel.debit_amount) as total_debits,
    SUM(jel.credit_amount) as total_credits
FROM journal_entries je
JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
JOIN chart_of_accounts coa ON jel.account_id = coa.id
WHERE je.company_id::TEXT = '1754730703821' 
AND je.status = 'POSTED'
GROUP BY coa.account_type
ORDER BY coa.account_type;

-- 6. Test the actual function with debug output
SELECT 'Function Test - Income Statement:' as debug_step;
SELECT * FROM get_income_statement('1754730703821', '2020-01-01', '2030-12-31');

SELECT 'Function Test - Balance Sheet:' as debug_step;
SELECT * FROM get_balance_sheet('1754730703821', '2030-12-31');

-- 7. Check for any data with relaxed filters
SELECT 'Relaxed Filter Test:' as debug_step;
SELECT 
    coa.account_type,
    coa.account_code,
    coa.account_name,
    SUM(COALESCE(jel.debit_amount, 0)) as total_debits,
    SUM(COALESCE(jel.credit_amount, 0)) as total_credits,
    SUM(COALESCE(jel.debit_amount, 0)) - SUM(COALESCE(jel.credit_amount, 0)) as net_amount
FROM journal_entries je
JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
JOIN chart_of_accounts coa ON jel.account_id = coa.id
WHERE je.company_id::TEXT = '1754730703821'
GROUP BY coa.account_type, coa.account_code, coa.account_name
HAVING ABS(SUM(COALESCE(jel.debit_amount, 0)) - SUM(COALESCE(jel.credit_amount, 0))) > 0
ORDER BY coa.account_type, coa.account_code
LIMIT 10;
