-- Test script to verify General Ledger setup
-- Run this to check if views and functions exist and work correctly

-- Check if the general_ledger_view exists
SELECT 'general_ledger_view exists' as status
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name = 'general_ledger_view';

-- Check if required functions exist
SELECT 
    routine_name,
    routine_type,
    CASE 
        WHEN routine_name = 'get_account_ledger' THEN 'Returns account ledger with running balances'
        WHEN routine_name = 'get_trial_balance' THEN 'Calculates trial balance for a company'
        WHEN routine_name = 'get_account_balance' THEN 'Gets account balance as of date'
        ELSE 'Other function'
    END as description
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_account_ledger', 'get_trial_balance', 'get_account_balance')
ORDER BY routine_name;

-- Test the general_ledger_view (if journal entries exist)
SELECT COUNT(*) as total_ledger_entries
FROM general_ledger_view;

-- Show sample from general_ledger_view (if data exists)
SELECT 
    entry_date,
    entry_number,
    account_code,
    account_name,
    debit_amount,
    credit_amount,
    balance_effect
FROM general_ledger_view
LIMIT 5;

-- Test get_trial_balance function for first company
DO $$
DECLARE
    first_company_id UUID;
BEGIN
    -- Get the first company ID
    SELECT id INTO first_company_id FROM companies LIMIT 1;
    
    IF first_company_id IS NOT NULL THEN
        RAISE NOTICE 'Testing trial balance for company: %', first_company_id;
        
        -- This will show if the function works
        PERFORM * FROM get_trial_balance(first_company_id, CURRENT_DATE) LIMIT 1;
        
        RAISE NOTICE 'Trial balance function test completed successfully';
    ELSE
        RAISE NOTICE 'No companies found for testing';
    END IF;
END $$;

-- Verify indexes exist
SELECT 
    indexname,
    tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE '%general_ledger%'
OR indexname LIKE '%journal%'
ORDER BY tablename, indexname;
