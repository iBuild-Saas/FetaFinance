-- Create purchase invoices table with comprehensive fields for purchase invoice management
-- This script creates a new purchase_invoices table with all necessary fields

-- Create the purchase_invoices table
CREATE TABLE IF NOT EXISTS purchase_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number VARCHAR(20) NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) NOT NULL,
    company_id UUID REFERENCES companies(id) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'SUBMITTED', -- SUBMITTED, RECEIVED, PAID, OVERDUE, CANCELLED
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

-- Create purchase invoice line items table
CREATE TABLE IF NOT EXISTS purchase_invoice_line_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES purchase_invoices(id) ON DELETE CASCADE NOT NULL,
    item_id UUID REFERENCES items(id),
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
    uom VARCHAR(10) DEFAULT 'PCS',
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
ALTER TABLE purchase_invoices 
ADD CONSTRAINT unique_purchase_invoice_number_per_company 
UNIQUE (invoice_number, company_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_company_id ON purchase_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier_id ON purchase_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_invoice_number ON purchase_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_status ON purchase_invoices(status);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_invoice_date ON purchase_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_due_date ON purchase_invoices(due_date);

-- Create indexes for line items
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_line_items_invoice_id ON purchase_invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_line_items_item_id ON purchase_invoice_line_items(item_id);

-- Create function to update purchase invoice totals
CREATE OR REPLACE FUNCTION update_purchase_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
    invoice_subtotal DECIMAL(15,2);
    invoice_tax_total DECIMAL(15,2);
    invoice_discount_total DECIMAL(15,2);
    invoice_total DECIMAL(15,2);
BEGIN
    -- Calculate subtotal from line items
    SELECT COALESCE(SUM(line_total), 0)
    INTO invoice_subtotal
    FROM purchase_invoice_line_items
    WHERE invoice_id = NEW.invoice_id;
    
    -- Calculate tax total from line items
    SELECT COALESCE(SUM(tax_amount), 0)
    INTO invoice_tax_total
    FROM purchase_invoice_line_items
    WHERE invoice_id = NEW.invoice_id;
    
    -- Calculate discount total from line items
    SELECT COALESCE(SUM(discount_amount), 0)
    INTO invoice_discount_total
    FROM purchase_invoice_line_items
    WHERE invoice_id = NEW.invoice_id;
    
    -- Calculate total
    invoice_total := invoice_subtotal + invoice_tax_total - invoice_discount_total;
    
    -- Update purchase invoice with calculated totals
    UPDATE purchase_invoices
    SET 
        subtotal = invoice_subtotal,
        tax_amount = invoice_tax_total,
        discount_amount = invoice_discount_total,
        total_amount = invoice_total,
        updated_at = NOW()
    WHERE id = NEW.invoice_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update totals when line items change
CREATE TRIGGER trigger_update_purchase_invoice_totals
    AFTER INSERT OR UPDATE OR DELETE ON purchase_invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_invoice_totals();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_purchase_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_purchase_invoices_updated_at
    BEFORE UPDATE ON purchase_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_invoices_updated_at();

-- Create function to update line items updated_at timestamp
CREATE OR REPLACE FUNCTION update_purchase_invoice_line_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update line items updated_at
CREATE TRIGGER trigger_update_purchase_invoice_line_items_updated_at
    BEFORE UPDATE ON purchase_invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_invoice_line_items_updated_at();

-- Add comments for documentation
COMMENT ON TABLE purchase_invoices IS 'Purchase invoices from suppliers';
COMMENT ON TABLE purchase_invoice_line_items IS 'Line items for purchase invoices';
COMMENT ON COLUMN purchase_invoices.status IS 'Invoice status: SUBMITTED, RECEIVED, PAID, OVERDUE, CANCELLED';
COMMENT ON COLUMN purchase_invoices.payment_terms IS 'Payment terms like NET_30, NET_60, etc.';
