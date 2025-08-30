-- Create payments table for handling both customer and supplier payments
-- This script creates a unified payments table that can handle both receiving and making payments

-- Create the payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('RECEIVE', 'PAY')), -- RECEIVE = from customer, PAY = to supplier
    customer_id UUID REFERENCES customers(id), -- NULL when payment_type = 'PAY'
    supplier_id UUID REFERENCES suppliers(id), -- NULL when payment_type = 'RECEIVE'
    invoice_id UUID, -- Can reference either sales_invoices or purchase_invoices
    company_id UUID REFERENCES companies(id) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- BANK_TRANSFER, CASH, CHECK, CREDIT_CARD, DEBIT_CARD, WIRE_TRANSFER
    reference_number VARCHAR(100) UNIQUE NOT NULL,
    amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'PENDING', 'FAILED', 'CANCELLED')),
    currency VARCHAR(3) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint on reference_number per company
ALTER TABLE payments 
ADD CONSTRAINT unique_payment_reference_per_company 
UNIQUE (reference_number, company_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_company_id ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_supplier_id ON payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_reference_number ON payments(reference_number);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();

-- Add comments for documentation
COMMENT ON TABLE payments IS 'Unified payments table for both customer receipts and supplier payments';
COMMENT ON COLUMN payments.payment_type IS 'RECEIVE = payment received from customer, PAY = payment made to supplier';
COMMENT ON COLUMN payments.customer_id IS 'Reference to customer when receiving payment (payment_type = RECEIVE)';
COMMENT ON COLUMN payments.supplier_id IS 'Reference to supplier when making payment (payment_type = PAY)';
COMMENT ON COLUMN payments.invoice_id IS 'Optional reference to related invoice (sales or purchase)';
COMMENT ON COLUMN payments.payment_method IS 'Method of payment: BANK_TRANSFER, CASH, CHECK, CREDIT_CARD, DEBIT_CARD, WIRE_TRANSFER';
COMMENT ON COLUMN payments.reference_number IS 'Unique payment reference number for tracking';
COMMENT ON COLUMN payments.status IS 'Payment status: COMPLETED, PENDING, FAILED, CANCELLED';
