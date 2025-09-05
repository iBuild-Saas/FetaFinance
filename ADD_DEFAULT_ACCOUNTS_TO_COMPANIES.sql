-- Add Default Accounts to Companies Table for Auto Journal Entries
-- Adds Accounts Receivable and Accounts Payable default account references

-- Add default account fields to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS default_accounts_receivable_id UUID REFERENCES chart_of_accounts(id),
ADD COLUMN IF NOT EXISTS default_accounts_payable_id UUID REFERENCES chart_of_accounts(id);

-- Update existing companies with default accounts based on account codes
UPDATE companies 
SET default_accounts_receivable_id = (
    SELECT id FROM chart_of_accounts 
    WHERE company_id = companies.id 
    AND account_code = '1120' -- المدينون (Accounts Receivable)
    AND is_active = true
    LIMIT 1
)
WHERE default_accounts_receivable_id IS NULL;

UPDATE companies 
SET default_accounts_payable_id = (
    SELECT id FROM chart_of_accounts 
    WHERE company_id = companies.id 
    AND account_code = '2110' -- الموردون (Accounts Payable)
    AND is_active = true
    LIMIT 1
)
WHERE default_accounts_payable_id IS NULL;

-- Create view to show companies with default account details
CREATE OR REPLACE VIEW companies_with_defaults AS
SELECT 
    c.*,
    ar.account_code as ar_account_code,
    ar.account_name as ar_account_name,
    ap.account_code as ap_account_code,
    ap.account_name as ap_account_name
FROM companies c
LEFT JOIN chart_of_accounts ar ON c.default_accounts_receivable_id = ar.id
LEFT JOIN chart_of_accounts ap ON c.default_accounts_payable_id = ap.id;

GRANT SELECT ON companies_with_defaults TO authenticated;

SELECT 'Default accounts added to companies table' as status;
