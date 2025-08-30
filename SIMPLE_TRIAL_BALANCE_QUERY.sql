-- Simple trial balance query for frontend - bypasses view issues

-- Drop the problematic view and create a simple function instead
DROP VIEW IF EXISTS trial_balance_view;
DROP FUNCTION IF EXISTS get_trial_balance(UUID);
DROP FUNCTION IF EXISTS get_trial_balance(UUID, DATE, DATE);

-- Create a simple trial balance function that works
CREATE OR REPLACE FUNCTION get_company_trial_balance(company_uuid UUID, start_date DATE DEFAULT '2023-01-01', end_date DATE DEFAULT '2025-12-31')
RETURNS TABLE (
    account_code VARCHAR,
    account_name VARCHAR,
    account_type VARCHAR,
    debit_total NUMERIC,
    credit_total NUMERIC,
    balance NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(coa.account_code, 'ACC-' || jel.account_id::text) as account_code,
        COALESCE(coa.account_name, 'Unknown Account') as account_name,
        COALESCE(coa.account_type, 'UNKNOWN') as account_type,
        SUM(COALESCE(jel.debit_amount, 0)) as debit_total,
        SUM(COALESCE(jel.credit_amount, 0)) as credit_total,
        SUM(COALESCE(jel.debit_amount, 0)) - SUM(COALESCE(jel.credit_amount, 0)) as balance
    FROM journal_entries je
    JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
    LEFT JOIN chart_of_accounts coa ON jel.account_id = coa.id
    WHERE je.status = 'POSTED'
    AND je.company_id = company_uuid
    AND je.entry_date BETWEEN start_date AND end_date
    GROUP BY jel.account_id, coa.account_code, coa.account_name, coa.account_type
    HAVING SUM(COALESCE(jel.debit_amount, 0)) > 0 OR SUM(COALESCE(jel.credit_amount, 0)) > 0
    ORDER BY COALESCE(coa.account_code, 'ZZZ-' || jel.account_id::text);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_company_trial_balance(UUID, DATE, DATE) TO authenticated;

-- Test the function with actual data
SELECT 'Testing trial balance function:' as test;

-- Get first company ID for testing
DO $$
DECLARE
    test_company_id UUID;
BEGIN
    SELECT company_id INTO test_company_id 
    FROM journal_entries 
    WHERE status = 'POSTED' 
    LIMIT 1;
    
    IF test_company_id IS NOT NULL THEN
        RAISE NOTICE 'Testing with company ID: %', test_company_id;
        
        -- Test the function
        PERFORM * FROM get_company_trial_balance(test_company_id);
        
        RAISE NOTICE 'Trial balance function test completed';
    ELSE
        RAISE NOTICE 'No journal entries found for testing';
    END IF;
END $$;

-- Alternative simple query for frontend (if function doesn't work)
-- Use this directly in your frontend API:
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
AND je.company_id = $1
AND je.entry_date BETWEEN $2 AND $3
GROUP BY jel.account_id, coa.account_code, coa.account_name, coa.account_type
HAVING SUM(COALESCE(jel.debit_amount, 0)) > 0 OR SUM(COALESCE(jel.credit_amount, 0)) > 0
ORDER BY COALESCE(coa.account_code, 'ZZZZZ');
*/

SELECT 'Simple trial balance system created' as status;
