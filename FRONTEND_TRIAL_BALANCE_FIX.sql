-- Fix frontend trial balance 400 error
-- Create simple direct query that works with frontend API

-- 1. Test what data exists first
SELECT 
    'Data check:' as test,
    COUNT(*) as journal_entries,
    COUNT(DISTINCT company_id) as companies
FROM journal_entries 
WHERE status = 'POSTED';

-- 2. Simple trial balance query for frontend API
-- This should replace whatever query your frontend is currently using
SELECT 
    coa.account_code,
    coa.account_name,
    coa.account_type as type,
    COALESCE(SUM(jel.debit_amount), 0) as debit_total,
    COALESCE(SUM(jel.credit_amount), 0) as credit_total,
    COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0) as balance
FROM journal_entries je
JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
JOIN chart_of_accounts coa ON jel.account_id = coa.id
WHERE je.status = 'POSTED'
-- Add company filter if needed: AND je.company_id = 'your-company-id'
GROUP BY coa.account_code, coa.account_name, coa.account_type
HAVING COALESCE(SUM(jel.debit_amount), 0) > 0 OR COALESCE(SUM(jel.credit_amount), 0) > 0
ORDER BY coa.account_code;

-- 3. Test with actual company data
SELECT 'Testing with real company data:' as test;

-- Get a real company ID and test
DO $$
DECLARE
    test_company_id UUID;
    record_count INTEGER;
BEGIN
    -- Get first company with journal entries
    SELECT DISTINCT je.company_id INTO test_company_id
    FROM journal_entries je
    WHERE je.status = 'POSTED'
    LIMIT 1;
    
    IF test_company_id IS NOT NULL THEN
        -- Count records for this company
        SELECT COUNT(*) INTO record_count
        FROM journal_entries je
        JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
        JOIN chart_of_accounts coa ON jel.account_id = coa.id
        WHERE je.status = 'POSTED'
        AND je.company_id = test_company_id;
        
        RAISE NOTICE 'Company ID: %, Records: %', test_company_id, record_count;
        
        -- Show sample trial balance for this company
        RAISE NOTICE 'Sample trial balance data exists';
    ELSE
        RAISE NOTICE 'No posted journal entries found';
    END IF;
END $$;

-- 4. FRONTEND API QUERY (Copy this to your backend)
/*
-- Use this exact query in your backend API endpoint:

SELECT 
    coa.account_code,
    coa.account_name,
    coa.account_type as type,
    COALESCE(SUM(jel.debit_amount), 0) as debit_total,
    COALESCE(SUM(jel.credit_amount), 0) as credit_total,
    COALESCE(SUM(jel.debit_amount), 0) - COALESCE(SUM(jel.credit_amount), 0) as balance
FROM journal_entries je
JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
JOIN chart_of_accounts coa ON jel.account_id = coa.id
WHERE je.status = 'POSTED'
AND je.company_id = $1  -- Replace with company parameter
GROUP BY coa.account_code, coa.account_name, coa.account_type
HAVING COALESCE(SUM(jel.debit_amount), 0) > 0 OR COALESCE(SUM(jel.credit_amount), 0) > 0
ORDER BY coa.account_code;

-- Make sure your API:
-- 1. Uses proper company_id parameter
-- 2. Returns JSON with these exact field names
-- 3. Handles empty results gracefully
-- 4. Uses proper error handling
*/

-- 5. Check if the issue is missing accounts
SELECT 
    'Account check:' as test,
    COUNT(DISTINCT jel.account_id) as accounts_in_journal,
    COUNT(DISTINCT coa.id) as accounts_in_chart,
    COUNT(*) as total_journal_lines
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.journal_entry_id = je.id
LEFT JOIN chart_of_accounts coa ON jel.account_id = coa.id
WHERE je.status = 'POSTED';

SELECT 'Frontend trial balance fix queries ready' as status;
