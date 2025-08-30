-- Fix the overly restrictive constraint on group accounts
-- This constraint was preventing sub-accounts from being created under group accounts

-- First, drop the existing constraint if it exists
ALTER TABLE chart_of_accounts 
DROP CONSTRAINT IF EXISTS check_group_accounts;

-- Add the correct constraint that allows proper hierarchy
ALTER TABLE chart_of_accounts 
ADD CONSTRAINT check_group_accounts 
CHECK (
    -- Root accounts (no parent) must be group accounts
    (parent_account_id IS NULL AND is_group = true) OR
    -- Sub-accounts (with parent) can be either group or non-group
    (parent_account_id IS NOT NULL)
);

-- Add a comment explaining the constraint
COMMENT ON CONSTRAINT check_group_accounts ON chart_of_accounts IS 
'Ensures root accounts are groups, but allows sub-accounts to be either groups or detail accounts';

-- Verify the constraint works by checking existing data
SELECT 
    'Constraint check passed' as status,
    COUNT(*) as total_accounts,
    COUNT(CASE WHEN parent_account_id IS NULL THEN 1 END) as root_accounts,
    COUNT(CASE WHEN parent_account_id IS NULL AND is_group = true THEN 1 END) as valid_root_groups,
    COUNT(CASE WHEN parent_account_id IS NOT NULL THEN 1 END) as sub_accounts
FROM chart_of_accounts 
WHERE is_active = true;
