-- Create suppliers table with comprehensive fields for supplier management
-- This script creates a new suppliers table with all necessary fields

-- Create the suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_code VARCHAR(20) NOT NULL,
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
    supplier_type VARCHAR(50) DEFAULT 'MANUFACTURER', -- MANUFACTURER, DISTRIBUTOR, WHOLESALER, SERVICE, etc.
    default_currency VARCHAR(3) DEFAULT 'USD',
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    company_id UUID REFERENCES companies(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint on supplier_code per company
ALTER TABLE suppliers 
ADD CONSTRAINT unique_supplier_code_per_company 
UNIQUE (supplier_code, company_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_suppliers_company_id ON suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_supplier_code ON suppliers(supplier_code);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

-- Create a function to generate unique supplier codes
CREATE OR REPLACE FUNCTION generate_supplier_code(company_uuid UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
    next_number INTEGER;
    new_code VARCHAR(20);
BEGIN
    -- Get the next available number for this company
    SELECT COALESCE(MAX(CAST(SUBSTRING(supplier_code FROM 7) AS INTEGER)), 0) + 1
    INTO next_number
    FROM suppliers 
    WHERE company_id = company_uuid;
    
    -- Generate the new code
    new_code := 'SUPP-' || LPAD(CAST(next_number AS TEXT), 4, '0');
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically set updated_at
CREATE OR REPLACE FUNCTION update_suppliers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_suppliers_updated_at();

-- Grant permissions
GRANT ALL ON suppliers TO authenticated;

-- Create a view for active suppliers with company information
CREATE OR REPLACE VIEW active_suppliers_view AS
SELECT 
    s.*,
    comp.name as company_name,
    comp.currency as company_currency
FROM suppliers s
JOIN companies comp ON s.company_id = comp.id
WHERE s.is_active = true
ORDER BY s.company_id, s.supplier_code;

-- Grant permissions on the view
GRANT SELECT ON active_suppliers_view TO authenticated;

-- Insert some sample suppliers for testing (optional)
-- Uncomment the lines below if you want sample data
/*
INSERT INTO suppliers (supplier_code, name, email, phone, contact_person, company_id, supplier_type, default_currency)
VALUES 
    ('SUPP-0001', 'Sample Supplier 1', 'supplier1@example.com', '+1-555-0201', 'John Supplier', 
     (SELECT id FROM companies LIMIT 1), 'MANUFACTURER', 'USD'),
    ('SUPP-0002', 'Sample Supplier 2', 'supplier2@example.com', '+1-555-0202', 'Jane Vendor', 
     (SELECT id FROM companies LIMIT 1), 'DISTRIBUTOR', 'USD');
*/
