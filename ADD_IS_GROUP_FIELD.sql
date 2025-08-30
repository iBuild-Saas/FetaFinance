-- Add is_group field to chart_of_accounts table
-- This allows accounts to be marked as groups that can contain sub-accounts

-- Add the is_group column
ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT false;

-- Update existing root accounts to be groups
UPDATE chart_of_accounts 
SET is_group = true 
WHERE parent_account_id IS NULL;

-- Update existing accounts with children to be groups
UPDATE chart_of_accounts 
SET is_group = true 
WHERE id IN (
    SELECT DISTINCT parent_account_id 
    FROM chart_of_accounts 
    WHERE parent_account_id IS NOT NULL
);

-- Add a check constraint to ensure group accounts can have children
-- and non-group accounts cannot have children
ALTER TABLE chart_of_accounts 
ADD CONSTRAINT check_group_accounts 
CHECK (
    (is_group = true AND parent_account_id IS NOT NULL) OR 
    (is_group = false AND parent_account_id IS NULL) OR
    (is_group = true AND parent_account_id IS NULL)
);

-- Update the create_default_chart_of_accounts function to set is_group properly
CREATE OR REPLACE FUNCTION create_default_chart_of_accounts(company_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Insert root accounts (Assets, Liabilities, Equity, Revenue, Expenses) as groups
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, is_active, normal_balance, description, is_group)
    VALUES 
        ('1000', 'Assets', 'Asset', NULL, company_uuid, true, 'DEBIT', 'All company assets', true),
        ('2000', 'Liabilities', 'Liability', NULL, company_uuid, true, 'CREDIT', 'All company liabilities', true),
        ('3000', 'Equity', 'Equity', NULL, company_uuid, true, 'CREDIT', 'Owner equity and retained earnings', true),
        ('4000', 'Revenue', 'Revenue', NULL, company_uuid, true, 'CREDIT', 'All income and revenue', true),
        ('5000', 'Expenses', 'Expense', NULL, company_uuid, true, 'DEBIT', 'All company expenses', true);
    
    -- Get the IDs of the root accounts
    DECLARE
        assets_id UUID;
        liabilities_id UUID;
        equity_id UUID;
        revenue_id UUID;
        expenses_id UUID;
    BEGIN
        SELECT id INTO assets_id FROM chart_of_accounts WHERE account_code = '1000' AND company_id = company_uuid;
        SELECT id INTO liabilities_id FROM chart_of_accounts WHERE account_code = '2000' AND company_id = company_uuid;
        SELECT id INTO equity_id FROM chart_of_accounts WHERE account_code = '3000' AND company_id = company_uuid;
        SELECT id INTO revenue_id FROM chart_of_accounts WHERE account_code = '4000' AND company_id = company_uuid;
        SELECT id INTO expenses_id FROM chart_of_accounts WHERE account_code = '5000' AND company_id = company_uuid;
        
        -- Insert sub-accounts under Assets (non-group accounts)
        INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, is_active, normal_balance, description, is_group)
        VALUES 
            ('1100', 'Current Assets', 'Asset', assets_id, company_uuid, true, 'DEBIT', 'Short-term assets', true),
            ('1200', 'Fixed Assets', 'Asset', assets_id, company_uuid, true, 'DEBIT', 'Long-term assets', true),
            ('1300', 'Other Assets', 'Asset', assets_id, company_uuid, true, 'DEBIT', 'Miscellaneous assets', true);
        
        -- Insert sub-accounts under Current Assets
        INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, is_active, normal_balance, description, is_group)
        VALUES 
            ('1110', 'Cash and Cash Equivalents', 'Asset', (SELECT id FROM chart_of_accounts WHERE account_code = '1100' AND company_id = company_uuid), company_uuid, true, 'DEBIT', 'Cash, bank accounts, and short-term investments', false),
            ('1120', 'Accounts Receivable', 'Asset', (SELECT id FROM chart_of_accounts WHERE account_code = '1100' AND company_id = company_uuid), company_uuid, true, 'DEBIT', 'Amounts owed by customers', false),
            ('1130', 'Inventory', 'Asset', (SELECT id FROM chart_of_accounts WHERE account_code = '1100' AND company_id = company_uuid), company_uuid, true, 'DEBIT', 'Goods available for sale', false),
            ('1140', 'Prepaid Expenses', 'Asset', (SELECT id FROM chart_of_accounts WHERE account_code = '1100' AND company_id = company_uuid), company_uuid, true, 'DEBIT', 'Expenses paid in advance', false);
        
        -- Insert sub-accounts under Fixed Assets
        INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, is_active, normal_balance, description, is_group)
        VALUES 
            ('1210', 'Equipment', 'Asset', (SELECT id FROM chart_of_accounts WHERE account_code = '1200' AND company_id = company_uuid), company_uuid, true, 'DEBIT', 'Office equipment and machinery', false),
            ('1220', 'Buildings', 'Asset', (SELECT id FROM chart_of_accounts WHERE account_code = '1200' AND company_id = company_uuid), company_uuid, true, 'DEBIT', 'Company buildings and structures', false),
            ('1230', 'Vehicles', 'Asset', (SELECT id FROM chart_of_accounts WHERE account_code = '1200' AND company_id = company_uuid), company_uuid, true, 'DEBIT', 'Company vehicles', false);
        
        -- Insert sub-accounts under Liabilities (non-group accounts)
        INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, is_active, normal_balance, description, is_group)
        VALUES 
            ('2100', 'Current Liabilities', 'Liability', liabilities_id, company_uuid, true, 'CREDIT', 'Short-term obligations', true),
            ('2200', 'Long-term Liabilities', 'Liability', liabilities_id, company_uuid, true, 'CREDIT', 'Long-term obligations', true);
        
        -- Insert sub-accounts under Current Liabilities
        INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, is_active, normal_balance, description, is_group)
        VALUES 
            ('2110', 'Accounts Payable', 'Liability', (SELECT id FROM chart_of_accounts WHERE account_code = '2100' AND company_id = company_uuid), company_uuid, true, 'CREDIT', 'Amounts owed to suppliers', false),
            ('2120', 'Accrued Expenses', 'Liability', (SELECT id FROM chart_of_accounts WHERE account_code = '2100' AND company_id = company_uuid), company_uuid, true, 'CREDIT', 'Expenses incurred but not yet paid', false),
            ('2130', 'Short-term Loans', 'Liability', (SELECT id FROM chart_of_accounts WHERE account_code = '2100' AND company_id = company_uuid), company_uuid, true, 'CREDIT', 'Short-term borrowings', false);
        
        -- Insert sub-accounts under Equity (non-group accounts)
        INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, is_active, normal_balance, description, is_group)
        VALUES 
            ('3100', 'Owner Equity', 'Equity', equity_id, company_uuid, true, 'CREDIT', 'Owner investments and withdrawals', true),
            ('3200', 'Retained Earnings', 'Equity', equity_id, company_uuid, true, 'CREDIT', 'Accumulated profits', true);
        
        -- Insert sub-accounts under Owner Equity
        INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, is_active, normal_balance, description, is_group)
        VALUES 
            ('3110', 'Owner Investment', 'Equity', (SELECT id FROM chart_of_accounts WHERE account_code = '3100' AND company_id = company_uuid), company_uuid, true, 'CREDIT', 'Owner contributions to the business', false),
            ('3120', 'Owner Withdrawals', 'Equity', (SELECT id FROM chart_of_accounts WHERE account_code = '3100' AND company_id = company_uuid), company_uuid, true, 'DEBIT', 'Owner withdrawals from the business', false);
        
        -- Insert sub-accounts under Revenue (non-group accounts)
        INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, is_active, normal_balance, description, is_group)
        VALUES 
            ('4100', 'Sales Revenue', 'Revenue', revenue_id, company_uuid, true, 'CREDIT', 'Income from sales of goods or services', false),
            ('4200', 'Other Revenue', 'Revenue', revenue_id, company_uuid, true, 'CREDIT', 'Miscellaneous income', false);
        
        -- Insert sub-accounts under Sales Revenue
        INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, is_active, normal_balance, description, is_group)
        VALUES 
            ('4110', 'Product Sales', 'Revenue', (SELECT id FROM chart_of_accounts WHERE account_code = '4100' AND company_id = company_uuid), company_uuid, true, 'CREDIT', 'Revenue from product sales', false),
            ('4120', 'Service Revenue', 'Revenue', (SELECT id FROM chart_of_accounts WHERE account_code = '4100' AND company_id = company_uuid), company_uuid, true, 'CREDIT', 'Revenue from services provided', false);
        
        -- Insert sub-accounts under Expenses (non-group accounts)
        INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, is_active, normal_balance, description, is_group)
        VALUES 
            ('5100', 'Cost of Goods Sold', 'Expense', expenses_id, company_uuid, true, 'DEBIT', 'Direct costs of producing goods', true),
            ('5200', 'Operating Expenses', 'Expense', expenses_id, company_uuid, true, 'DEBIT', 'General business expenses', true),
            ('5300', 'Other Expenses', 'Expense', expenses_id, company_uuid, true, 'DEBIT', 'Miscellaneous expenses', true);
        
        -- Insert sub-accounts under Cost of Goods Sold
        INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, is_active, normal_balance, description, is_group)
        VALUES 
            ('5110', 'Direct Materials', 'Expense', (SELECT id FROM chart_of_accounts WHERE account_code = '5100' AND company_id = company_uuid), company_uuid, true, 'DEBIT', 'Raw materials used in production', false),
            ('5120', 'Direct Labor', 'Expense', (SELECT id FROM chart_of_accounts WHERE account_code = '5100' AND company_id = company_uuid), company_uuid, true, 'DEBIT', 'Labor costs directly related to production', false);
        
        -- Insert sub-accounts under Operating Expenses
        INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, is_active, normal_balance, description, is_group)
        VALUES 
            ('5210', 'Rent Expense', 'Expense', (SELECT id FROM chart_of_accounts WHERE account_code = '5200' AND company_id = company_uuid), company_uuid, true, 'DEBIT', 'Office and facility rent', false),
            ('5220', 'Utilities Expense', 'Expense', (SELECT id FROM chart_of_accounts WHERE account_code = '5200' AND company_id = company_uuid), company_uuid, true, 'DEBIT', 'Electricity, water, internet, etc.', false),
            ('5230', 'Salaries and Wages', 'Expense', (SELECT id FROM chart_of_accounts WHERE account_code = '5200' AND company_id = company_uuid), company_uuid, true, 'DEBIT', 'Employee compensation', false),
            ('5240', 'Office Supplies', 'Expense', (SELECT id FROM chart_of_accounts WHERE account_code = '5200' AND company_id = company_uuid), company_uuid, true, 'DEBIT', 'Office materials and supplies', false);
    END;
END;
$$ LANGUAGE plpgsql;




