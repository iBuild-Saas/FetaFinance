-- Create Chart of Accounts table
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_code VARCHAR(20) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    parent_account_id UUID REFERENCES chart_of_accounts(id),
    company_id UUID REFERENCES companies(id) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    normal_balance VARCHAR(10) NOT NULL CHECK (normal_balance IN ('DEBIT', 'CREDIT')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_company_id ON chart_of_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_parent_id ON chart_of_accounts(parent_account_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_account_code ON chart_of_accounts(account_code);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_chart_of_accounts_updated_at 
    BEFORE UPDATE ON chart_of_accounts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default root accounts (these will be created for each company when they're set up)
-- Note: These are template accounts that will be copied when a company is created

-- Function to create default chart of accounts for a new company
CREATE OR REPLACE FUNCTION create_default_chart_of_accounts(company_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Insert root accounts
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, normal_balance, description)
    VALUES 
        ('1000', 'Assets', 'ASSET', NULL, company_uuid, 'DEBIT', 'All company assets'),
        ('2000', 'Liabilities', 'LIABILITY', NULL, company_uuid, 'CREDIT', 'All company liabilities'),
        ('3000', 'Equity', 'EQUITY', NULL, company_uuid, 'CREDIT', 'Owner equity and retained earnings'),
        ('4000', 'Revenue', 'REVENUE', NULL, company_uuid, 'CREDIT', 'All income and revenue accounts'),
        ('5000', 'Expenses', 'EXPENSE', NULL, company_uuid, 'DEBIT', 'All expense accounts');
    
    -- Insert common sub-accounts under Assets
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, normal_balance, description)
    SELECT 
        '1100', 'Current Assets', 'ASSET', 
        (SELECT id FROM chart_of_accounts WHERE account_code = '1000' AND company_id = company_uuid), 
        company_uuid, 'DEBIT', 'Assets that can be converted to cash within one year';
    
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, normal_balance, description)
    SELECT 
        '1200', 'Fixed Assets', 'ASSET', 
        (SELECT id FROM chart_of_accounts WHERE account_code = '1000' AND company_id = company_uuid), 
        company_uuid, 'DEBIT', 'Long-term assets like property, plant, and equipment';
    
    -- Insert common sub-accounts under Current Assets
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, normal_balance, description)
    SELECT 
        '1110', 'Cash and Cash Equivalents', 'ASSET', 
        (SELECT id FROM chart_of_accounts WHERE account_code = '1100' AND company_id = company_uuid), 
        company_uuid, 'DEBIT', 'Cash, bank accounts, and short-term investments';
    
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, normal_balance, description)
    SELECT 
        '1120', 'Accounts Receivable', 'ASSET', 
        (SELECT id FROM chart_of_accounts WHERE account_code = '1100' AND company_id = company_uuid), 
        company_uuid, 'DEBIT', 'Amounts owed by customers';
    
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, normal_balance, description)
    SELECT 
        '1130', 'Inventory', 'ASSET', 
        (SELECT id FROM chart_of_accounts WHERE account_code = '1100' AND company_id = company_uuid), 
        company_uuid, 'DEBIT', 'Goods held for sale';
    
    -- Insert common sub-accounts under Liabilities
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, normal_balance, description)
    SELECT 
        '2100', 'Current Liabilities', 'LIABILITY', 
        (SELECT id FROM chart_of_accounts WHERE account_code = '2000' AND company_id = company_uuid), 
        company_uuid, 'CREDIT', 'Liabilities due within one year';
    
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, normal_balance, description)
    SELECT 
        '2200', 'Long-term Liabilities', 'LIABILITY', 
        (SELECT id FROM chart_of_accounts WHERE account_code = '2000' AND company_id = company_uuid), 
        company_uuid, 'CREDIT', 'Liabilities due after one year';
    
    -- Insert common sub-accounts under Current Liabilities
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, normal_balance, description)
    SELECT 
        '2110', 'Accounts Payable', 'LIABILITY', 
        (SELECT id FROM chart_of_accounts WHERE account_code = '2100' AND company_id = company_uuid), 
        company_uuid, 'CREDIT', 'Amounts owed to suppliers';
    
    -- Insert common sub-accounts under Equity
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, normal_balance, description)
    SELECT 
        '3100', 'Owner Equity', 'EQUITY', 
        (SELECT id FROM chart_of_accounts WHERE account_code = '3000' AND company_id = company_uuid), 
        company_uuid, 'CREDIT', 'Owner investments and withdrawals';
    
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, normal_balance, description)
    SELECT 
        '3200', 'Retained Earnings', 'EQUITY', 
        (SELECT id FROM chart_of_accounts WHERE account_code = '3000' AND company_id = company_uuid), 
        company_uuid, 'CREDIT', 'Accumulated profits and losses';
    
    -- Insert common sub-accounts under Revenue
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, normal_balance, description)
    SELECT 
        '4100', 'Sales Revenue', 'REVENUE', 
        (SELECT id FROM chart_of_accounts WHERE account_code = '4000' AND company_id = company_uuid), 
        company_uuid, 'CREDIT', 'Revenue from sales of goods and services';
    
    -- Insert common sub-accounts under Expenses
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, normal_balance, description)
    SELECT 
        '5100', 'Cost of Goods Sold', 'EXPENSE', 
        (SELECT id FROM chart_of_accounts WHERE account_code = '5000' AND company_id = company_uuid), 
        company_uuid, 'DEBIT', 'Direct costs of producing goods sold';
    
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, normal_balance, description)
    SELECT 
        '5200', 'Operating Expenses', 'EXPENSE', 
        (SELECT id FROM chart_of_accounts WHERE account_code = '5000' AND company_id = company_uuid), 
        company_uuid, 'DEBIT', 'General operating expenses';
    
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, normal_balance, description)
    SELECT 
        '5210', 'Salaries and Wages', 'EXPENSE', 
        (SELECT id FROM chart_of_accounts WHERE account_code = '5200' AND company_id = company_uuid), 
        company_uuid, 'DEBIT', 'Employee compensation expenses';
    
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, normal_balance, description)
    SELECT 
        '5220', 'Rent Expense', 'EXPENSE', 
        (SELECT id FROM chart_of_accounts WHERE account_code = '5200' AND company_id = company_uuid), 
        company_uuid, 'DEBIT', 'Rent and lease expenses';
    
    INSERT INTO chart_of_accounts (account_code, account_name, account_type, parent_account_id, company_id, normal_balance, description)
    SELECT 
        '5230', 'Utilities', 'EXPENSE', 
        (SELECT id FROM chart_of_accounts WHERE account_code = '5200' AND company_id = company_uuid), 
        company_uuid, 'DEBIT', 'Electricity, water, internet, etc.';
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_default_chart_of_accounts(UUID) TO authenticated;
GRANT ALL ON chart_of_accounts TO authenticated;
