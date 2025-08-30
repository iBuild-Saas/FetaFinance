-- =====================================================
-- UPDATE COMPANIES TABLE WITH DEFAULT ACCOUNT FIELDS
-- =====================================================
-- This script adds default account fields to the companies table
-- for automatic journal entry creation from invoices

-- Add default account fields to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS default_inventory_account_id UUID REFERENCES chart_of_accounts(id),
ADD COLUMN IF NOT EXISTS accounts_payable_account_id UUID REFERENCES chart_of_accounts(id),
ADD COLUMN IF NOT EXISTS default_sales_revenue_account_id UUID REFERENCES chart_of_accounts(id),
ADD COLUMN IF NOT EXISTS accounts_receivable_account_id UUID REFERENCES chart_of_accounts(id),
ADD COLUMN IF NOT EXISTS sales_tax_payable_account_id UUID REFERENCES chart_of_accounts(id),
ADD COLUMN IF NOT EXISTS default_expense_account_id UUID REFERENCES chart_of_accounts(id);

-- Add comments to explain the purpose of each field
COMMENT ON COLUMN companies.default_inventory_account_id IS 'Default inventory account for purchase invoice journal entries (DR side)';
COMMENT ON COLUMN companies.accounts_payable_account_id IS 'Default accounts payable account for purchase invoice journal entries (CR side)';
COMMENT ON COLUMN companies.default_sales_revenue_account_id IS 'Default sales revenue account for sales invoice journal entries (CR side)';
COMMENT ON COLUMN companies.accounts_receivable_account_id IS 'Default accounts receivable account for sales invoice journal entries (DR side)';
COMMENT ON COLUMN companies.sales_tax_payable_account_id IS 'Default sales tax payable account for sales invoice journal entries (CR side)';
COMMENT ON COLUMN companies.default_expense_account_id IS 'Default expense account for purchase invoices (alternative to inventory account)';

-- Show updated table structure
SELECT 'Companies table updated with default account fields' as status;

-- Show the new columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name LIKE '%account%'
ORDER BY column_name;

-- Instructions for setup
SELECT '=== SETUP INSTRUCTIONS ===' as instruction;
SELECT 'Step 1: Run CREATE_CHART_OF_ACCOUNTS.sql to create chart of accounts' as step1;
SELECT 'Step 2: Update company records with default account IDs from chart of accounts' as step2;
SELECT 'Step 3: Run COMPLETE_AUTO_JOURNAL_ENTRY_SYSTEM.sql to create triggers and functions' as step3;
