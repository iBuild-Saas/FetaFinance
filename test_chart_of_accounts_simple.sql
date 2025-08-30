-- Simple test to verify chart of accounts setup
-- Run this to check if the table exists and has data

-- Check if chart_of_accounts table exists
SELECT 'chart_of_accounts table exists' as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'chart_of_accounts';

-- Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'chart_of_accounts'
ORDER BY ordinal_position;

-- Check if there are any accounts
SELECT COUNT(*) as total_accounts FROM chart_of_accounts;

-- Show sample accounts (if any)
SELECT 
    account_code,
    account_name,
    account_type,
    company_id,
    is_active
FROM chart_of_accounts
LIMIT 10;

-- Check companies table (to verify company_id references)
SELECT id, name FROM companies LIMIT 5;
