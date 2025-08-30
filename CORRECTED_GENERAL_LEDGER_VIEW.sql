-- Corrected General Ledger and Trial Balance queries
-- Based on the actual data structure we can see

-- 1. CORRECTED GENERAL LEDGER VIEW
-- This should be used in your frontend General Ledger component
SELECT 
    je.entry_date as date,
    je.entry_number as entry_number,
    COALESCE(coa.account_code || ' - ' || coa.account_name, 'Account ID: ' || jel.account_id) as account,
    COALESCE(jel.description, je.description) as description,
    jel.debit_amount as debit,
    jel.credit_amount as credit
FROM journal_entries je
JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
LEFT JOIN chart_of_accounts coa ON jel.account_id = coa.id
WHERE je.status = 'POSTED'
AND je.entry_date BETWEEN '2023-01-01' AND '2025-12-31'
ORDER BY je.entry_date DESC, je.entry_number DESC, jel.line_number ASC;

-- 2. CORRECTED TRIAL BALANCE VIEW
-- This should be used in your frontend Trial Balance component
SELECT 
    COALESCE(coa.account_code, 'ACC-' || jel.account_id) as account_code,
    COALESCE(coa.account_name, 'Unknown Account') as account_name,
    COALESCE(SUM(jel.debit_amount), 0) as total_debits,
    COALESCE(SUM(jel.credit_amount), 0) as total_credits,
    COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0) as balance
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.journal_entry_id = je.id
LEFT JOIN chart_of_accounts coa ON jel.account_id = coa.id
WHERE je.status = 'POSTED'
AND je.entry_date BETWEEN '2023-01-01' AND '2025-12-31'
GROUP BY jel.account_id, coa.account_code, coa.account_name
HAVING COALESCE(SUM(jel.debit_amount), 0) > 0 OR COALESCE(SUM(jel.credit_amount), 0) > 0
ORDER BY COALESCE(coa.account_code, 'ACC-' || jel.account_id);

-- 3. TEST THE QUERIES WITH CURRENT DATA
SELECT 'Testing General Ledger Query:' as test;

SELECT 
    je.entry_date,
    je.entry_number,
    jel.account_id,
    jel.debit_amount,
    jel.credit_amount,
    jel.description
FROM journal_entries je
JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
WHERE je.status = 'POSTED'
ORDER BY je.entry_date DESC
LIMIT 20;

-- 4. CHECK DATE RANGE ISSUE
SELECT 
    'Date range check:' as info,
    MIN(entry_date) as earliest_entry,
    MAX(entry_date) as latest_entry,
    COUNT(*) as total_posted_entries
FROM journal_entries 
WHERE status = 'POSTED';

-- 5. FRONTEND INTEGRATION NOTES
/*
For your React/TypeScript frontend:

1. Update your General Ledger query to use the corrected query above
2. Make sure date range filter is properly applied
3. Ensure status = 'POSTED' filter is included
4. Check that the account_id references exist in chart_of_accounts table

The issue is likely that your frontend is either:
- Using wrong date range
- Missing the status = 'POSTED' filter  
- Not properly joining the tables
- Looking for a different table structure
*/
