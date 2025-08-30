-- Fix the create_default_chart_of_accounts function
-- This function was failing due to constraint issues and potential syntax problems

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS create_default_chart_of_accounts(UUID);

-- Create the corrected function
CREATE OR REPLACE FUNCTION create_default_chart_of_accounts(company_uuid UUID)
RETURNS VOID AS $$
DECLARE
    assets_id UUID;
    liabilities_id UUID;
    equity_id UUID;
    revenue_id UUID;
    expenses_id UUID;
    current_assets_id UUID;
    fixed_assets_id UUID;
    current_liabilities_id UUID;
    long_term_liabilities_id UUID;
    owner_equity_id UUID;
    retained_earnings_id UUID;
    cost_of_goods_id UUID;
    operating_expenses_id UUID;
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
    SELECT id INTO assets_id FROM chart_of_accounts WHERE account_code = '1000' AND company_id = company_uuid;
    SELECT id INTO liabilities_id FROM chart_of_accounts WHERE account_code = '2000' AND company_id = company_uuid;
    SELECT id INTO equity_id FROM chart_of_accounts WHERE account_code = '3000' AND company_id = company_uuid;
    SELECT id INTO revenue_id FROM chart_of_accounts WHERE account_code = '4000' AND company_id = company_uuid;
    SELECT id INTO expenses_id FROM chart_of_accounts WHERE account_code = '5000' AND company_id = company_uuid;
    
    -- Insert sub-accounts under Assets (group accounts)
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, is_active, normal_balance, description, is_group)
    VALUES 
        ('1100', 'Current Assets', 'Asset', assets_id, company_uuid, true, 'DEBIT', 'Short-term assets', true),
        ('1200', 'Fixed Assets', 'Asset', assets_id, company_uuid, true, 'DEBIT', 'Long-term assets', true),
        ('1300', 'Other Assets', 'Asset', assets_id, company_uuid, true, 'DEBIT', 'Miscellaneous assets', true);
    
    -- Get the IDs of the asset sub-accounts
    SELECT id INTO current_assets_id FROM chart_of_accounts WHERE account_code = '1100' AND company_id = company_uuid;
    SELECT id INTO fixed_assets_id FROM chart_of_accounts WHERE account_code = '1200' AND company_id = company_uuid;
    
    -- Insert sub-accounts under Current Assets (detail accounts)
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, is_active, normal_balance, description, is_group)
    VALUES 
        ('1110', 'Cash and Cash Equivalents', 'Asset', current_assets_id, company_uuid, true, 'DEBIT', 'Cash, bank accounts, and short-term investments', false),
        ('1120', 'Accounts Receivable', 'Asset', current_assets_id, company_uuid, true, 'DEBIT', 'Amounts owed by customers', false),
        ('1130', 'Inventory', 'Asset', current_assets_id, company_uuid, true, 'DEBIT', 'Goods available for sale', false),
        ('1140', 'Prepaid Expenses', 'Asset', current_assets_id, company_uuid, true, 'DEBIT', 'Expenses paid in advance', false);
    
    -- Insert sub-accounts under Fixed Assets (detail accounts)
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, is_active, normal_balance, description, is_group)
    VALUES 
        ('1210', 'Equipment', 'Asset', fixed_assets_id, company_uuid, true, 'DEBIT', 'Office equipment and machinery', false),
        ('1220', 'Buildings', 'Asset', fixed_assets_id, company_uuid, true, 'DEBIT', 'Company buildings and structures', false),
        ('1230', 'Vehicles', 'Asset', fixed_assets_id, company_uuid, true, 'DEBIT', 'Company vehicles', false);
    
    -- Insert sub-accounts under Liabilities (group accounts)
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, is_active, normal_balance, description, is_group)
    VALUES 
        ('2100', 'Current Liabilities', 'Liability', liabilities_id, company_uuid, true, 'CREDIT', 'Short-term obligations', true),
        ('2200', 'Long-term Liabilities', 'Liability', liabilities_id, company_uuid, true, 'CREDIT', 'Long-term obligations', true);
    
    -- Get the IDs of the liability sub-accounts
    SELECT id INTO current_liabilities_id FROM chart_of_accounts WHERE account_code = '2100' AND company_id = company_uuid;
    SELECT id INTO long_term_liabilities_id FROM chart_of_accounts WHERE account_code = '2200' AND company_id = company_uuid;
    
    -- Insert sub-accounts under Current Liabilities (detail accounts)
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, is_active, normal_balance, description, is_group)
    VALUES 
        ('2110', 'Accounts Payable', 'Liability', current_liabilities_id, company_uuid, true, 'CREDIT', 'Amounts owed to suppliers', false),
        ('2120', 'Accrued Expenses', 'Liability', current_liabilities_id, company_uuid, true, 'CREDIT', 'Expenses incurred but not yet paid', false),
        ('2130', 'Short-term Loans', 'Liability', current_liabilities_id, company_uuid, true, 'CREDIT', 'Short-term borrowings', false);
    
    -- Insert sub-accounts under Equity (group accounts)
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, is_active, normal_balance, description, is_group)
    VALUES 
        ('3100', 'Owner Equity', 'Equity', equity_id, company_uuid, true, 'CREDIT', 'Owner investments and withdrawals', true),
        ('3200', 'Retained Earnings', 'Equity', equity_id, company_uuid, true, 'CREDIT', 'Accumulated profits', true);
    
    -- Get the IDs of the equity sub-accounts
    SELECT id INTO owner_equity_id FROM chart_of_accounts WHERE account_code = '3100' AND company_id = company_uuid;
    SELECT id INTO retained_earnings_id FROM chart_of_accounts WHERE account_code = '3200' AND company_id = company_uuid;
    
    -- Insert sub-accounts under Owner Equity (detail accounts)
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, is_active, normal_balance, description, is_group)
    VALUES 
        ('3110', 'Owner Investment', 'Equity', owner_equity_id, company_uuid, true, 'CREDIT', 'Owner contributions to the business', false),
        ('3120', 'Owner Withdrawals', 'Equity', owner_equity_id, company_uuid, true, 'DEBIT', 'Owner withdrawals from the business', false);
    
    -- Insert sub-accounts under Revenue (detail accounts)
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, is_active, normal_balance, description, is_group)
    VALUES 
        ('4100', 'Sales Revenue', 'Revenue', revenue_id, company_uuid, true, 'CREDIT', 'Income from sales of goods or services', false),
        ('4200', 'Other Revenue', 'Revenue', revenue_id, company_uuid, true, 'CREDIT', 'Miscellaneous income', false);
    
    -- Insert sub-accounts under Sales Revenue (detail accounts)
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, is_active, normal_balance, description, is_group)
    VALUES 
        ('4110', 'Product Sales', 'Revenue', (SELECT id FROM chart_of_accounts WHERE account_code = '4100' AND company_id = company_uuid), company_uuid, true, 'CREDIT', 'Revenue from product sales', false),
        ('4120', 'Service Revenue', 'Revenue', (SELECT id FROM chart_of_accounts WHERE account_code = '4100' AND company_id = company_uuid), company_uuid, true, 'CREDIT', 'Revenue from services provided', false);
    
    -- Insert sub-accounts under Expenses (group accounts)
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, is_active, normal_balance, description, is_group)
    VALUES 
        ('5100', 'Cost of Goods Sold', 'Expense', expenses_id, company_uuid, true, 'DEBIT', 'Direct costs of producing goods', true),
        ('5200', 'Operating Expenses', 'Expense', expenses_id, company_uuid, true, 'DEBIT', 'General business expenses', true),
        ('5300', 'Other Expenses', 'Expense', expenses_id, company_uuid, true, 'DEBIT', 'Miscellaneous expenses', true);
    
    -- Get the IDs of the expense sub-accounts
    SELECT id INTO cost_of_goods_id FROM chart_of_accounts WHERE account_code = '5100' AND company_id = company_uuid;
    SELECT id INTO operating_expenses_id FROM chart_of_accounts WHERE account_code = '5200' AND company_id = company_uuid;
    
    -- Insert sub-accounts under Cost of Goods Sold (detail accounts)
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, is_active, normal_balance, description, is_group)
    VALUES 
        ('5110', 'Direct Materials', 'Expense', cost_of_goods_id, company_uuid, true, 'DEBIT', 'Raw materials used in production', false),
        ('5120', 'Direct Labor', 'Expense', cost_of_goods_id, company_uuid, true, 'DEBIT', 'Labor costs directly related to production', false);
    
    -- Insert sub-accounts under Operating Expenses (detail accounts)
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, is_active, normal_balance, description, is_group)
    VALUES 
        ('5210', 'Rent Expense', 'Expense', operating_expenses_id, company_uuid, true, 'DEBIT', 'Office and facility rent', false),
        ('5220', 'Utilities Expense', 'Expense', operating_expenses_id, company_uuid, true, 'DEBIT', 'Electricity, water, internet, etc.', false),
        ('5230', 'Salaries and Wages', 'Expense', operating_expenses_id, company_uuid, true, 'DEBIT', 'Employee compensation', false),
        ('5240', 'Office Supplies', 'Expense', operating_expenses_id, company_uuid, true, 'DEBIT', 'Office materials and supplies', false);
    
    -- Insert sub-accounts under Other Expenses (detail accounts)
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, is_active, normal_balance, description, is_group)
    VALUES 
        ('5310', 'Interest Expense', 'Expense', (SELECT id FROM chart_of_accounts WHERE account_code = '5300' AND company_id = company_uuid), company_uuid, true, 'DEBIT', 'Interest on loans and credit', false),
        ('5320', 'Depreciation Expense', 'Expense', (SELECT id FROM chart_of_accounts WHERE account_code = '5300' AND company_id = company_uuid), company_uuid, true, 'DEBIT', 'Depreciation of fixed assets', false);
    
    RAISE NOTICE 'Default chart of accounts created successfully for company %', company_uuid;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating default chart of accounts: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_default_chart_of_accounts(UUID) TO authenticated;

-- Test the function (optional - remove this in production)
-- SELECT create_default_chart_of_accounts('your-company-uuid-here');
