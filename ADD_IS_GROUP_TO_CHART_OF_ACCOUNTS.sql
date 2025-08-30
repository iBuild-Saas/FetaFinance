-- Add is_group field to chart_of_accounts table
-- This field indicates whether an account can have sub-accounts (group account) or not (detail account)

-- Add the is_group column if it doesn't exist
ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT false;

-- Update existing root accounts to be group accounts
UPDATE chart_of_accounts 
SET is_group = true 
WHERE parent_account_id IS NULL;

-- Update other accounts that should be group accounts based on naming patterns
UPDATE chart_of_accounts 
SET is_group = true 
WHERE account_name IN (
    'Current Assets', 
    'Fixed Assets', 
    'Current Liabilities', 
    'Long-term Liabilities',
    'Operating Expenses',
    'Cost of Goods Sold'
) OR account_name LIKE '%Assets%' 
  OR account_name LIKE '%Liabilities%'
  OR account_name LIKE '%Expenses%'
  OR account_name LIKE '%Revenue%';

-- Add comment for documentation
COMMENT ON COLUMN chart_of_accounts.is_group IS 'Indicates if this account can contain sub-accounts (true) or is a detail account (false)';

-- Verify the update
SELECT 
    account_code,
    account_name,
    account_type,
    is_group,
    CASE WHEN parent_account_id IS NULL THEN 'Root Account' ELSE 'Sub Account' END as level
FROM chart_of_accounts
ORDER BY account_code;
