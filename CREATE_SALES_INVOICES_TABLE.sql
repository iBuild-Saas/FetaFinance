-- Create sales invoices table with comprehensive fields for invoice management
-- This script creates a new sales_invoices table with all necessary fields

-- Create the sales_invoices table
CREATE TABLE IF NOT EXISTS sales_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number VARCHAR(20) NOT NULL,
    customer_id UUID REFERENCES customers(id) NOT NULL,
    company_id UUID REFERENCES companies(id) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, SENT, PAID, OVERDUE, CANCELLED
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_terms VARCHAR(100),
    notes TEXT,
    terms_and_conditions TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invoice line items table
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES sales_invoices(id) ON DELETE CASCADE NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    tax_rate DECIMAL(5,2) DEFAULT 0.00,
    tax_amount DECIMAL(15,2) DEFAULT 0.00,
    discount_rate DECIMAL(5,2) DEFAULT 0.00,
    discount_amount DECIMAL(15,2) DEFAULT 0.00,
    line_total DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint on invoice_number per company
ALTER TABLE sales_invoices 
ADD CONSTRAINT unique_invoice_number_per_company 
UNIQUE (invoice_number, company_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_invoices_company_id ON sales_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_customer_id ON sales_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_invoice_number ON sales_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_status ON sales_invoices(status);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_invoice_date ON sales_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_due_date ON sales_invoices(due_date);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);

-- Create a function to generate unique invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number(company_uuid UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
    next_number INTEGER;
    new_number VARCHAR(20);
    year_prefix VARCHAR(4);
BEGIN
    -- Get current year
    year_prefix := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    
    -- Get the next available number for this company and year
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 10) AS INTEGER)), 0) + 1
    INTO next_number
    FROM sales_invoices 
    WHERE company_id = company_uuid 
    AND invoice_number LIKE year_prefix || '-INV-%';
    
    -- Generate the new invoice number
    new_number := year_prefix || '-INV-' || LPAD(CAST(next_number AS TEXT), 4, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Create a function to calculate invoice totals
CREATE OR REPLACE FUNCTION calculate_invoice_totals(invoice_uuid UUID)
RETURNS VOID AS $$
DECLARE
    invoice_subtotal DECIMAL(15,2);
    invoice_tax_total DECIMAL(15,2);
    invoice_discount_total DECIMAL(15,2);
    invoice_total DECIMAL(15,2);
BEGIN
    -- Calculate subtotal from line items
    SELECT COALESCE(SUM(line_total), 0)
    INTO invoice_subtotal
    FROM invoice_line_items
    WHERE invoice_id = invoice_uuid;
    
    -- Calculate total tax amount
    SELECT COALESCE(SUM(tax_amount), 0)
    INTO invoice_tax_total
    FROM invoice_line_items
    WHERE invoice_id = invoice_uuid;
    
    -- Calculate total discount amount
    SELECT COALESCE(SUM(discount_amount), 0)
    INTO invoice_discount_total
    FROM invoice_line_items
    WHERE invoice_id = invoice_uuid;
    
    -- Calculate total amount
    invoice_total := invoice_subtotal + invoice_tax_total - invoice_discount_total;
    
    -- Update the invoice with calculated totals
    UPDATE sales_invoices
    SET 
        subtotal = invoice_subtotal,
        tax_amount = invoice_tax_total,
        discount_amount = invoice_discount_total,
        total_amount = invoice_total,
        updated_at = NOW()
    WHERE id = invoice_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically set updated_at
CREATE OR REPLACE FUNCTION update_sales_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_invoice_line_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the triggers
CREATE TRIGGER trigger_update_sales_invoices_updated_at
    BEFORE UPDATE ON sales_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_invoices_updated_at();

CREATE TRIGGER trigger_update_invoice_line_items_updated_at
    BEFORE UPDATE ON invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_line_items_updated_at();

-- Create a trigger to recalculate totals when line items change
CREATE OR REPLACE FUNCTION trigger_recalculate_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate totals for the affected invoice
    PERFORM calculate_invoice_totals(COALESCE(NEW.invoice_id, OLD.invoice_id));
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for line item changes
CREATE TRIGGER trigger_recalculate_totals_on_insert
    AFTER INSERT ON invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalculate_invoice_totals();

CREATE TRIGGER trigger_recalculate_totals_on_update
    AFTER UPDATE ON invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalculate_invoice_totals();

CREATE TRIGGER trigger_recalculate_totals_on_delete
    AFTER DELETE ON invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalculate_invoice_totals();

-- Grant permissions
GRANT ALL ON sales_invoices TO authenticated;
GRANT ALL ON invoice_line_items TO authenticated;

-- Create a view for active invoices with customer and company information
CREATE OR REPLACE VIEW active_invoices_view AS
SELECT 
    si.*,
    c.name as customer_name,
    c.customer_code as customer_code,
    c.email as customer_email,
    comp.name as company_name,
    comp.currency as company_currency
FROM sales_invoices si
JOIN customers c ON si.customer_id = c.id
JOIN companies comp ON si.company_id = comp.id
WHERE si.is_active = true
ORDER BY si.invoice_date DESC, si.invoice_number;

-- Create a view for invoice line items with invoice details
CREATE OR REPLACE VIEW invoice_line_items_view AS
SELECT 
    ili.*,
    si.invoice_number,
    si.invoice_date,
    c.name as customer_name
FROM invoice_line_items ili
JOIN sales_invoices si ON ili.invoice_id = si.id
JOIN customers c ON si.customer_id = c.id
WHERE si.is_active = true
ORDER BY si.invoice_date DESC, si.invoice_number, ili.id;

-- Grant permissions on the views
GRANT SELECT ON active_invoices_view TO authenticated;
GRANT SELECT ON invoice_line_items_view TO authenticated;

-- Insert some sample data for testing (optional)
-- Uncomment the lines below if you want sample data
/*
INSERT INTO sales_invoices (invoice_number, customer_id, company_id, invoice_date, due_date, status, subtotal, tax_amount, total_amount, currency, payment_terms)
VALUES 
    ('2024-INV-0001', (SELECT id FROM customers LIMIT 1), (SELECT id FROM companies LIMIT 1), 
     CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'DRAFT', 1000.00, 100.00, 1100.00, 'USD', 'Net 30'),
    ('2024-INV-0002', (SELECT id FROM customers LIMIT 1), (SELECT id FROM companies LIMIT 1), 
     CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'SENT', 500.00, 50.00, 550.00, 'USD', 'Net 30');

INSERT INTO invoice_line_items (invoice_id, item_name, description, quantity, unit_price, tax_rate, line_total)
VALUES 
    ((SELECT id FROM sales_invoices WHERE invoice_number = '2024-INV-0001'), 'Consulting Services', 'Professional consulting services', 10, 100.00, 10.00, 1000.00),
    ((SELECT id FROM sales_invoices WHERE invoice_number = '2024-INV-0002'), 'Software License', 'Annual software license', 1, 500.00, 10.00, 500.00);
*/

