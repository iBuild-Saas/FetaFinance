-- Test script to verify Chart of Accounts setup
-- Run this in your Supabase SQL editor to check if everything is working

-- 1. Check if the table exists
SELECT 'Table exists' as status, COUNT(*) as count 
FROM information_schema.tables 
WHERE table_name = 'chart_of_accounts';

-- 2. Check if the function exists
SELECT 'Function exists' as status, COUNT(*) as count 
FROM pg_proc 
WHERE proname = 'create_default_chart_of_accounts';

-- 3. Check if you have any companies
SELECT 'Companies count' as status, COUNT(*) as count 
FROM companies;

-- 4. Check if you have any chart of accounts
SELECT 'Chart of accounts count' as status, COUNT(*) as count 
FROM chart_of_accounts;

-- 5. Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'chart_of_accounts'
ORDER BY ordinal_position;

-- 6. Test the function manually (replace 'your-company-uuid' with an actual company ID)
-- SELECT create_default_chart_of_accounts('your-company-uuid');

-- 7. Check permissions
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'chart_of_accounts';

-- 8. Check function permissions
SELECT grantee, privilege_type 
FROM information_schema.role_routine_grants 
WHERE routine_name = 'create_default_chart_of_accounts';







