-- Fix Party Reports Issue - Complete Setup and Test Data

-- Step 1: Ensure party tracking columns exist
ALTER TABLE journal_entry_lines 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id),
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id),
ADD COLUMN IF NOT EXISTS party_type VARCHAR(20) CHECK (party_type IN ('CUSTOMER', 'SUPPLIER')),
ADD COLUMN IF NOT EXISTS reference_document_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS reference_document_id UUID,
ADD COLUMN IF NOT EXISTS due_date DATE;

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_customer_id ON journal_entry_lines(customer_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_supplier_id ON journal_entry_lines(supplier_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_party_type ON journal_entry_lines(party_type);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_due_date ON journal_entry_lines(due_date);

-- Step 3: Create customer receivables view
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
  AND (jel.debit_amount > 0 OR jel.credit_amount > 0)
  AND coa.account_type IN ('ASSET', 'CURRENT_ASSET')
ORDER BY c.name, je.entry_date;

-- Step 4: Create supplier payables view
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
  AND (jel.debit_amount > 0 OR jel.credit_amount > 0)
  AND coa.account_type IN ('LIABILITY', 'CURRENT_LIABILITY')
ORDER BY s.name, je.entry_date;

-- Step 5: Create aging summary views
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

-- Step 6: Grant permissions
GRANT SELECT ON customer_receivables TO authenticated;
GRANT SELECT ON supplier_payables TO authenticated;
GRANT SELECT ON customer_receivables_aging TO authenticated;
GRANT SELECT ON supplier_payables_aging TO authenticated;

-- Step 7: Create test data (if no existing data)
-- First, let's check if we have any journal entries with party data
DO $$
DECLARE
    party_count INTEGER;
    test_customer_id UUID;
    test_supplier_id UUID;
    test_ar_account_id UUID;
    test_ap_account_id UUID;
    test_company_id UUID;
    test_journal_id UUID;
BEGIN
    -- Check if we have any party data
    SELECT COUNT(*) INTO party_count 
    FROM journal_entry_lines 
    WHERE party_type IS NOT NULL;
    
    IF party_count = 0 THEN
        RAISE NOTICE 'No party data found. Creating test data...';
        
        -- Get test IDs
        SELECT id INTO test_customer_id FROM customers LIMIT 1;
        SELECT id INTO test_supplier_id FROM suppliers LIMIT 1;
        SELECT id INTO test_company_id FROM companies LIMIT 1;
        SELECT id INTO test_ar_account_id FROM chart_of_accounts WHERE account_type = 'CURRENT_ASSET' AND account_name ILIKE '%receivable%' LIMIT 1;
        SELECT id INTO test_ap_account_id FROM chart_of_accounts WHERE account_type = 'CURRENT_LIABILITY' AND account_name ILIKE '%payable%' LIMIT 1;
        
        IF test_customer_id IS NOT NULL AND test_ar_account_id IS NOT NULL AND test_company_id IS NOT NULL THEN
            -- Create test journal entry
            INSERT INTO journal_entries (company_id, entry_date, reference, description, status, is_active)
            VALUES (test_company_id, CURRENT_DATE, 'TEST-AR-001', 'Test Accounts Receivable Entry', 'POSTED', true)
            RETURNING id INTO test_journal_id;
            
            -- Create test receivable line
            INSERT INTO journal_entry_lines (
                journal_entry_id, account_id, description, debit_amount, credit_amount,
                party_type, customer_id, due_date
            ) VALUES (
                test_journal_id, test_ar_account_id, 'Test customer receivable', 1000.00, 0.00,
                'CUSTOMER', test_customer_id, CURRENT_DATE + INTERVAL '30 days'
            );
            
            RAISE NOTICE 'Created test receivable data';
        END IF;
        
        IF test_supplier_id IS NOT NULL AND test_ap_account_id IS NOT NULL AND test_company_id IS NOT NULL THEN
            -- Create test journal entry for payables
            INSERT INTO journal_entries (company_id, entry_date, reference, description, status, is_active)
            VALUES (test_company_id, CURRENT_DATE, 'TEST-AP-001', 'Test Accounts Payable Entry', 'POSTED', true)
            RETURNING id INTO test_journal_id;
            
            -- Create test payable line
            INSERT INTO journal_entry_lines (
                journal_entry_id, account_id, description, debit_amount, credit_amount,
                party_type, supplier_id, due_date
            ) VALUES (
                test_journal_id, test_ap_account_id, 'Test supplier payable', 0.00, 500.00,
                'SUPPLIER', test_supplier_id, CURRENT_DATE + INTERVAL '15 days'
            );
            
            RAISE NOTICE 'Created test payable data';
        END IF;
    ELSE
        RAISE NOTICE 'Found % existing journal entry lines with party data', party_count;
    END IF;
END $$;
