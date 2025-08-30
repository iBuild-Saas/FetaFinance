-- Create customers table with comprehensive fields for customer management
-- This script creates a new customers table with all necessary fields

-- Create the customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    contact_person VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100),
    tax_id VARCHAR(50),
    credit_limit DECIMAL(15,2) DEFAULT 0.00,
    payment_terms VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    website VARCHAR(255),
    industry VARCHAR(100),
    customer_type VARCHAR(50) DEFAULT 'RETAIL', -- RETAIL, WHOLESALE, DISTRIBUTOR, etc.
    default_currency VARCHAR(3) DEFAULT 'USD',
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    company_id UUID REFERENCES companies(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint on customer_code per company
ALTER TABLE customers 
ADD CONSTRAINT unique_customer_code_per_company 
UNIQUE (customer_code, company_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_customer_code ON customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- Create a function to generate unique customer codes
CREATE OR REPLACE FUNCTION generate_customer_code(company_uuid UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
    next_number INTEGER;
    new_code VARCHAR(20);
BEGIN
    -- Get the next available number for this company
    SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 6) AS INTEGER)), 0) + 1
    INTO next_number
    FROM customers 
    WHERE company_id = company_uuid;
    
    -- Generate the new code
    new_code := 'CUST-' || LPAD(CAST(next_number AS TEXT), 4, '0');
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically set updated_at
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_customers_updated_at();

-- Grant permissions
GRANT ALL ON customers TO authenticated;

-- Create a view for active customers with company information
CREATE OR REPLACE VIEW active_customers_view AS
SELECT 
    c.*,
    comp.name as company_name,
    comp.currency as company_currency
FROM customers c
JOIN companies comp ON c.company_id = comp.id
WHERE c.is_active = true
ORDER BY c.company_id, c.customer_code;

-- Grant permissions on the view
GRANT SELECT ON active_customers_view TO authenticated;

-- Insert some sample customers for testing (optional)
-- Uncomment the lines below if you want sample data
/*
INSERT INTO customers (customer_code, name, email, phone, contact_person, company_id, customer_type, default_currency)
VALUES 
    ('CUST-0001', 'Sample Customer 1', 'customer1@example.com', '+1-555-0101', 'John Doe', 
     (SELECT id FROM companies LIMIT 1), 'RETAIL', 'USD'),
    ('CUST-0002', 'Sample Customer 2', 'customer2@example.com', '+1-555-0102', 'Jane Smith', 
     (SELECT id FROM companies LIMIT 1), 'WHOLESALE', 'USD');
*/
