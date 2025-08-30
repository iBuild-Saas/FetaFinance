-- Test script to diagnose Chart of Accounts issues
-- Run this to check the current state and identify problems

-- 1. Check if chart_of_accounts table exists and its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'chart_of_accounts'
ORDER BY ordinal_position;

-- 2. Check if is_group column exists
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'is_group column EXISTS'
        ELSE 'is_group column MISSING - run ADD_IS_GROUP_TO_CHART_OF_ACCOUNTS.sql'
    END as is_group_status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'chart_of_accounts'
AND column_name = 'is_group';

-- 3. Check current accounts and their group status (if is_group exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'chart_of_accounts'
        AND column_name = 'is_group'
    ) THEN
        RAISE NOTICE 'Current accounts with group status:';
        -- This will show in the query results
    END IF;
END $$;

-- Show current accounts (will error if is_group doesn't exist)
SELECT 
    account_code,
    account_name,
    account_type,
    COALESCE(is_group, false) as is_group,
    CASE WHEN parent_account_id IS NULL THEN 'Root' ELSE 'Child' END as level,
    company_id
FROM chart_of_accounts
WHERE is_active = true
ORDER BY account_code;

-- 4. Count accounts per company
SELECT 
    c.name as company_name,
    COUNT(coa.id) as account_count
FROM companies c
LEFT JOIN chart_of_accounts coa ON c.id = coa.company_id AND coa.is_active = true
GROUP BY c.id, c.name
ORDER BY c.name;

-- 5. Check if default account creation function exists
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'create_default_chart_of_accounts';

-- 6. Show parent-child relationships
SELECT 
    parent.account_code as parent_code,
    parent.account_name as parent_name,
    child.account_code as child_code,
    child.account_name as child_name
FROM chart_of_accounts parent
JOIN chart_of_accounts child ON parent.id = child.parent_account_id
WHERE parent.is_active = true AND child.is_active = true
ORDER BY parent.account_code, child.account_code;
