-- Test trial balance data and create working query for frontend

-- 1. First check if we have journal entry data
SELECT 
    'Journal entries check:' as test,
    COUNT(*) as total_entries,
    COUNT(DISTINCT company_id) as companies_with_entries
FROM journal_entries 
WHERE status = 'POSTED';

-- 2. Check journal entry lines
SELECT 
    'Journal entry lines check:' as test,
    COUNT(*) as total_lines,
    SUM(debit_amount) as total_debits,
    SUM(credit_amount) as total_credits
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.journal_entry_id = je.id
WHERE je.status = 'POSTED';

-- 3. Simple trial balance query (without views)
SELECT 
    je.company_id,
    jel.account_id,
    coa.account_code,
    coa.account_name,
    coa.account_type,
    SUM(COALESCE(jel.debit_amount, 0)) as total_debits,
    SUM(COALESCE(jel.credit_amount, 0)) as total_credits,
    SUM(COALESCE(jel.debit_amount, 0)) - SUM(COALESCE(jel.credit_amount, 0)) as balance
FROM journal_entries je
JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
LEFT JOIN chart_of_accounts coa ON jel.account_id = coa.id
WHERE je.status = 'POSTED'
GROUP BY je.company_id, jel.account_id, coa.account_code, coa.account_name, coa.account_type
HAVING SUM(COALESCE(jel.debit_amount, 0)) > 0 OR SUM(COALESCE(jel.credit_amount, 0)) > 0
ORDER BY coa.account_code;

-- 4. Check if chart_of_accounts has data
SELECT 
    'Chart of accounts check:' as test,
    COUNT(*) as total_accounts
FROM chart_of_accounts;

-- 5. Check account relationships
SELECT 
    'Account relationships:' as test,
    COUNT(DISTINCT jel.account_id) as accounts_in_journal_lines,
    COUNT(DISTINCT coa.id) as accounts_in_chart
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.journal_entry_id = je.id
FULL OUTER JOIN chart_of_accounts coa ON jel.account_id = coa.id
WHERE je.status = 'POSTED' OR je.status IS NULL;

-- 6. Frontend-ready trial balance query (company-specific)
-- Use this query in your frontend with company_id parameter
/*
SELECT 
    COALESCE(coa.account_code, 'UNKNOWN') as account_code,
    COALESCE(coa.account_name, 'Unknown Account') as account_name,
    COALESCE(coa.account_type, 'UNKNOWN') as account_type,
    SUM(COALESCE(jel.debit_amount, 0)) as debit_total,
    SUM(COALESCE(jel.credit_amount, 0)) as credit_total,
    SUM(COALESCE(jel.debit_amount, 0)) - SUM(COALESCE(jel.credit_amount, 0)) as balance
FROM journal_entries je
JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
LEFT JOIN chart_of_accounts coa ON jel.account_id = coa.id
WHERE je.status = 'POSTED'
AND je.company_id = $1  -- Replace with actual company_id
GROUP BY jel.account_id, coa.account_code, coa.account_name, coa.account_type
HAVING SUM(COALESCE(jel.debit_amount, 0)) > 0 OR SUM(COALESCE(jel.credit_amount, 0)) > 0
ORDER BY COALESCE(coa.account_code, 'ZZZZZ');
*/
