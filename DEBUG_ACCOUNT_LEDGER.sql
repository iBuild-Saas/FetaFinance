-- Debug account ledger function issues

-- 1. Check if function exists and parameters
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
WHERE p.proname = 'get_account_ledger';

-- 2. Test with actual data to see what's failing
DO $$
DECLARE
    test_company_id UUID;
    test_account_id UUID;
    result_count INTEGER;
BEGIN
    -- Get actual company and account IDs
    SELECT DISTINCT je.company_id INTO test_company_id
    FROM journal_entries je
    WHERE je.status = 'POSTED'
    LIMIT 1;
    
    SELECT DISTINCT jel.account_id INTO test_account_id
    FROM journal_entries je
    JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
    WHERE je.status = 'POSTED'
    AND je.company_id = test_company_id
    LIMIT 1;
    
    RAISE NOTICE 'Testing with Company: %, Account: %', test_company_id, test_account_id;
    
    -- Test the function call
    IF test_company_id IS NOT NULL AND test_account_id IS NOT NULL THEN
        BEGIN
            SELECT COUNT(*) INTO result_count
            FROM get_account_ledger(test_account_id, test_company_id, '2023-01-01'::DATE, '2025-12-31'::DATE);
            
            RAISE NOTICE 'Function executed successfully, returned % rows', result_count;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Function failed with error: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'No test data available';
    END IF;
END $$;

-- 3. Check journal entries structure
SELECT 
    'Journal entries check:' as test,
    COUNT(*) as total_entries,
    COUNT(DISTINCT company_id) as companies,
    MIN(entry_date) as earliest_date,
    MAX(entry_date) as latest_date
FROM journal_entries 
WHERE status = 'POSTED';

-- 4. Check journal entry lines structure  
SELECT 
    'Journal entry lines check:' as test,
    COUNT(*) as total_lines,
    COUNT(DISTINCT account_id) as unique_accounts
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.journal_entry_id = je.id
WHERE je.status = 'POSTED';

-- 5. Sample data query to see actual structure
SELECT 
    'Sample data:' as test,
    je.company_id,
    jel.account_id,
    je.entry_date,
    je.entry_number,
    jel.description,
    jel.debit_amount,
    jel.credit_amount
FROM journal_entries je
JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
WHERE je.status = 'POSTED'
LIMIT 3;
