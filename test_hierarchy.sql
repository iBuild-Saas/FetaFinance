-- Test script to verify account hierarchy is working correctly
-- This will help identify any issues with parent-child relationships

-- 1. Check the current constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'chart_of_accounts'::regclass 
AND conname = 'check_group_accounts';

-- 2. Show the complete hierarchy structure
WITH RECURSIVE account_tree AS (
    -- Root accounts (no parent)
    SELECT 
        id,
        account_code,
        account_name,
        account_type,
        parent_account_id,
        is_group,
        company_id,
        0 as level,
        ARRAY[account_code] as path
    FROM chart_of_accounts 
    WHERE parent_account_id IS NULL 
    AND is_active = true
    
    UNION ALL
    
    -- Child accounts
    SELECT 
        c.id,
        c.account_code,
        c.account_name,
        c.account_type,
        c.parent_account_id,
        c.is_group,
        c.company_id,
        at.level + 1,
        at.path || c.account_code
    FROM chart_of_accounts c
    INNER JOIN account_tree at ON c.parent_account_id = at.id
    WHERE c.is_active = true
)
SELECT 
    level,
    account_code,
    account_name,
    account_type,
    CASE 
        WHEN parent_account_id IS NULL THEN 'ROOT'
        ELSE (SELECT account_code FROM chart_of_accounts WHERE id = parent_account_id)
    END as parent_code,
    is_group,
    array_to_string(path, ' > ') as hierarchy_path
FROM account_tree
ORDER BY path;

-- 3. Check for any orphaned accounts (accounts with parent that doesn't exist)
SELECT 
    'ORPHANED ACCOUNT' as issue,
    c.account_code,
    c.account_name,
    c.parent_account_id,
    p.account_code as parent_code
FROM chart_of_accounts c
LEFT JOIN chart_of_accounts p ON c.parent_account_id = p.id
WHERE c.parent_account_id IS NOT NULL 
AND p.id IS NULL
AND c.is_active = true;

-- 4. Check for accounts that should be groups but aren't
SELECT 
    'SHOULD BE GROUP' as issue,
    c.account_code,
    c.account_name,
    COUNT(children.id) as child_count
FROM chart_of_accounts c
LEFT JOIN chart_of_accounts children ON c.id = children.parent_account_id AND children.is_active = true
WHERE c.is_group = false 
AND c.is_active = true
GROUP BY c.id, c.account_code, c.account_name
HAVING COUNT(children.id) > 0;

-- 5. Summary statistics
SELECT 
    'HIERARCHY SUMMARY' as summary,
    COUNT(*) as total_accounts,
    COUNT(CASE WHEN parent_account_id IS NULL THEN 1 END) as root_accounts,
    COUNT(CASE WHEN parent_account_id IS NOT NULL THEN 1 END) as sub_accounts,
    COUNT(CASE WHEN is_group = true THEN 1 END) as group_accounts,
    COUNT(CASE WHEN is_group = false THEN 1 END) as detail_accounts,
    MAX(level) as max_depth
FROM (
    WITH RECURSIVE account_tree AS (
        SELECT id, parent_account_id, 0 as level
        FROM chart_of_accounts 
        WHERE parent_account_id IS NULL AND is_active = true
        
        UNION ALL
        
        SELECT c.id, c.parent_account_id, at.level + 1
        FROM chart_of_accounts c
        INNER JOIN account_tree at ON c.parent_account_id = at.id
        WHERE c.is_active = true
    )
    SELECT * FROM account_tree
) hierarchy;
