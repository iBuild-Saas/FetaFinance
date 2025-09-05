-- Create Payment Methods Master Data Table
-- Links payment methods to chart of accounts for proper accounting

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    
    -- Constraints
    CONSTRAINT payment_methods_name_company_unique UNIQUE (company_id, name),
    CONSTRAINT payment_methods_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_methods_company_id ON payment_methods(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_account_id ON payment_methods(account_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON payment_methods(company_id, is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_methods_updated_at_trigger
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_methods_updated_at();

-- Insert default payment methods for existing companies
INSERT INTO payment_methods (company_id, name, account_id, description)
SELECT 
    c.id as company_id,
    'Cash' as name,
    coa.id as account_id,
    'Cash payments' as description
FROM companies c
CROSS JOIN chart_of_accounts coa
WHERE coa.account_code = '1010' -- Cash account
AND coa.company_id = c.id
AND NOT EXISTS (
    SELECT 1 FROM payment_methods pm 
    WHERE pm.company_id = c.id AND pm.name = 'Cash'
);

INSERT INTO payment_methods (company_id, name, account_id, description)
SELECT 
    c.id as company_id,
    'Bank Transfer' as name,
    coa.id as account_id,
    'Bank transfer payments' as description
FROM companies c
CROSS JOIN chart_of_accounts coa
WHERE coa.account_code LIKE '1020%' -- Bank accounts
AND coa.company_id = c.id
AND NOT EXISTS (
    SELECT 1 FROM payment_methods pm 
    WHERE pm.company_id = c.id AND pm.name = 'Bank Transfer'
);

INSERT INTO payment_methods (company_id, name, account_id, description)
SELECT 
    c.id as company_id,
    'Credit Card' as name,
    coa.id as account_id,
    'Credit card payments' as description
FROM companies c
CROSS JOIN chart_of_accounts coa
WHERE coa.account_code LIKE '1020%' -- Bank accounts (or create specific credit card account)
AND coa.company_id = c.id
AND NOT EXISTS (
    SELECT 1 FROM payment_methods pm 
    WHERE pm.company_id = c.id AND pm.name = 'Credit Card'
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_methods TO authenticated;

-- Create view for easy querying with account details
CREATE OR REPLACE VIEW payment_methods_view AS
SELECT 
    pm.id,
    pm.company_id,
    pm.name,
    pm.account_id,
    coa.account_code,
    coa.account_name,
    coa.account_type,
    pm.description,
    pm.is_active,
    pm.created_at,
    pm.updated_at
FROM payment_methods pm
JOIN chart_of_accounts coa ON pm.account_id = coa.id
WHERE pm.is_active = true
ORDER BY pm.name;

GRANT SELECT ON payment_methods_view TO authenticated;

SELECT 'Payment methods table created successfully' as status;
