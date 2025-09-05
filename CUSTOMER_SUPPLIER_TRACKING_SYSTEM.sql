-- Customer and Supplier Tracking System for Receivables and Payables
-- Adds party tracking to journal entry lines for detailed AR/AP reporting

-- Add party tracking fields to journal_entry_lines table
ALTER TABLE journal_entry_lines 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id),
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id),
ADD COLUMN IF NOT EXISTS party_type VARCHAR(20) CHECK (party_type IN ('CUSTOMER', 'SUPPLIER')),
ADD COLUMN IF NOT EXISTS reference_document_type VARCHAR(50), -- 'SALES_INVOICE', 'PURCHASE_INVOICE', 'PAYMENT', etc.
ADD COLUMN IF NOT EXISTS reference_document_id UUID,
ADD COLUMN IF NOT EXISTS due_date DATE; -- For tracking payment due dates

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_customer_id ON journal_entry_lines(customer_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_supplier_id ON journal_entry_lines(supplier_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_party_type ON journal_entry_lines(party_type);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_due_date ON journal_entry_lines(due_date);

-- Create view for customer receivables (AR)
CREATE OR REPLACE VIEW customer_receivables AS
SELECT 
    c.id as customer_id,
    c.name as customer_name,
    c.email,
    c.phone,
    coa.account_code,
    coa.account_name,
    jel.reference_document_type,
    jel.reference_document_id,
    je.entry_date,
    jel.due_date,
    jel.description,
    je.reference,
    jel.debit_amount - jel.credit_amount as balance,
    CASE 
        WHEN jel.due_date IS NULL THEN 'No Due Date'
        WHEN jel.due_date >= CURRENT_DATE THEN 'Current'
        WHEN jel.due_date >= CURRENT_DATE - INTERVAL '30 days' THEN '1-30 Days'
        WHEN jel.due_date >= CURRENT_DATE - INTERVAL '60 days' THEN '31-60 Days'
        WHEN jel.due_date >= CURRENT_DATE - INTERVAL '90 days' THEN '61-90 Days'
        ELSE 'Over 90 Days'
    END as aging_bucket,
    CURRENT_DATE - jel.due_date as days_overdue
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.journal_entry_id = je.id
JOIN chart_of_accounts coa ON jel.account_id = coa.id
JOIN customers c ON jel.customer_id = c.id
WHERE jel.party_type = 'CUSTOMER'
  AND je.status = 'POSTED'
  AND je.is_active = true
  AND (jel.debit_amount > 0 OR jel.credit_amount > 0) -- Has balance
  AND coa.account_type IN ('ASSET', 'CURRENT_ASSET') -- AR accounts
ORDER BY c.name, je.entry_date;

-- Create view for supplier payables (AP)
CREATE OR REPLACE VIEW supplier_payables AS
SELECT 
    s.id as supplier_id,
    s.name as supplier_name,
    s.email,
    s.phone,
    coa.account_code,
    coa.account_name,
    jel.reference_document_type,
    jel.reference_document_id,
    je.entry_date,
    jel.due_date,
    jel.description,
    je.reference,
    jel.credit_amount - jel.debit_amount as balance,
    CASE 
        WHEN jel.due_date IS NULL THEN 'No Due Date'
        WHEN jel.due_date >= CURRENT_DATE THEN 'Current'
        WHEN jel.due_date >= CURRENT_DATE - INTERVAL '30 days' THEN '1-30 Days'
        WHEN jel.due_date >= CURRENT_DATE - INTERVAL '60 days' THEN '31-60 Days'
        WHEN jel.due_date >= CURRENT_DATE - INTERVAL '90 days' THEN '61-90 Days'
        ELSE 'Over 90 Days'
    END as aging_bucket,
    CURRENT_DATE - jel.due_date as days_overdue
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.journal_entry_id = je.id
JOIN chart_of_accounts coa ON jel.account_id = coa.id
JOIN suppliers s ON jel.supplier_id = s.id
WHERE jel.party_type = 'SUPPLIER'
  AND je.status = 'POSTED'
  AND je.is_active = true
  AND (jel.debit_amount > 0 OR jel.credit_amount > 0) -- Has balance
  AND coa.account_type IN ('LIABILITY', 'CURRENT_LIABILITY') -- AP accounts
ORDER BY s.name, je.entry_date;

-- Create summary view for customer receivables aging
CREATE OR REPLACE VIEW customer_receivables_aging AS
SELECT 
    customer_id,
    customer_name,
    SUM(CASE WHEN aging_bucket = 'Current' THEN balance ELSE 0 END) as current_amount,
    SUM(CASE WHEN aging_bucket = '1-30 Days' THEN balance ELSE 0 END) as days_1_30,
    SUM(CASE WHEN aging_bucket = '31-60 Days' THEN balance ELSE 0 END) as days_31_60,
    SUM(CASE WHEN aging_bucket = '61-90 Days' THEN balance ELSE 0 END) as days_61_90,
    SUM(CASE WHEN aging_bucket = 'Over 90 Days' THEN balance ELSE 0 END) as over_90_days,
    SUM(balance) as total_balance
FROM customer_receivables
GROUP BY customer_id, customer_name
HAVING SUM(balance) != 0
ORDER BY total_balance DESC;

-- Create summary view for supplier payables aging
CREATE OR REPLACE VIEW supplier_payables_aging AS
SELECT 
    supplier_id,
    supplier_name,
    SUM(CASE WHEN aging_bucket = 'Current' THEN balance ELSE 0 END) as current_amount,
    SUM(CASE WHEN aging_bucket = '1-30 Days' THEN balance ELSE 0 END) as days_1_30,
    SUM(CASE WHEN aging_bucket = '31-60 Days' THEN balance ELSE 0 END) as days_31_60,
    SUM(CASE WHEN aging_bucket = '61-90 Days' THEN balance ELSE 0 END) as days_61_90,
    SUM(CASE WHEN aging_bucket = 'Over 90 Days' THEN balance ELSE 0 END) as over_90_days,
    SUM(balance) as total_balance
FROM supplier_payables
GROUP BY supplier_id, supplier_name
HAVING SUM(balance) != 0
ORDER BY total_balance DESC;

-- Create function to get customer account balance
CREATE OR REPLACE FUNCTION get_customer_balance(
    p_customer_id UUID,
    p_company_id UUID DEFAULT NULL
)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    v_balance DECIMAL(15,2);
BEGIN
    SELECT COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0)
    INTO v_balance
    FROM journal_entry_lines jel
    JOIN journal_entries je ON jel.journal_entry_id = je.id
    JOIN chart_of_accounts coa ON jel.account_id = coa.id
    WHERE jel.customer_id = p_customer_id
      AND jel.party_type = 'CUSTOMER'
      AND je.status = 'POSTED'
      AND je.is_active = true
      AND coa.account_type IN ('ASSET', 'CURRENT_ASSET')
      AND (p_company_id IS NULL OR je.company_id = p_company_id);
    
    RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- Create function to get supplier account balance
CREATE OR REPLACE FUNCTION get_supplier_balance(
    p_supplier_id UUID,
    p_company_id UUID DEFAULT NULL
)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    v_balance DECIMAL(15,2);
BEGIN
    SELECT COALESCE(SUM(jel.credit_amount - jel.debit_amount), 0)
    INTO v_balance
    FROM journal_entry_lines jel
    JOIN journal_entries je ON jel.journal_entry_id = je.id
    JOIN chart_of_accounts coa ON jel.account_id = coa.id
    WHERE jel.supplier_id = p_supplier_id
      AND jel.party_type = 'SUPPLIER'
      AND je.status = 'POSTED'
      AND je.is_active = true
      AND coa.account_type IN ('LIABILITY', 'CURRENT_LIABILITY')
      AND (p_company_id IS NULL OR je.company_id = p_company_id);
    
    RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON customer_receivables TO authenticated;
GRANT SELECT ON supplier_payables TO authenticated;
GRANT SELECT ON customer_receivables_aging TO authenticated;
GRANT SELECT ON supplier_payables_aging TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_balance(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_supplier_balance(UUID, UUID) TO authenticated;

SELECT 'Customer and Supplier tracking system created successfully' as status;
