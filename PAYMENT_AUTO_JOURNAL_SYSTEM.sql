-- Payment Auto Journal Entry System
-- Creates automatic journal entries when payments are created or updated

-- First, add payment_method_id field to payments table if it doesn't exist
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES payment_methods(id);

-- Add source tracking fields to journal_entries table if they don't exist
ALTER TABLE journal_entries 
ADD COLUMN IF NOT EXISTS source_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS source_id UUID;

-- Create function to generate journal entries for payments
CREATE OR REPLACE FUNCTION create_payment_journal_entry(
    p_payment_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_payment RECORD;
    v_company RECORD;
    v_payment_method RECORD;
    v_journal_entry_id UUID;
    v_entry_number TEXT;
    v_debit_account_id UUID;
    v_credit_account_id UUID;
BEGIN
    -- Get payment details
    SELECT * INTO v_payment
    FROM payments 
    WHERE id = p_payment_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found: %', p_payment_id;
    END IF;
    
    -- Get company with default accounts
    SELECT c.*, ar.id as ar_account_id, ap.id as ap_account_id
    INTO v_company
    FROM companies c
    LEFT JOIN chart_of_accounts ar ON c.default_accounts_receivable_id = ar.id
    LEFT JOIN chart_of_accounts ap ON c.default_accounts_payable_id = ap.id
    WHERE c.id = v_payment.company_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Company not found: %', v_payment.company_id;
    END IF;
    
    -- Get payment method details
    SELECT pm.*, coa.id as account_id
    INTO v_payment_method
    FROM payment_methods pm
    JOIN chart_of_accounts coa ON pm.account_id = coa.id
    WHERE pm.id = v_payment.payment_method_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment method not found: %', v_payment.payment_method_id;
    END IF;
    
    -- Generate journal entry number
    SELECT 'JE-PAY-' || LPAD(NEXTVAL('journal_entry_number_seq')::TEXT, 6, '0')
    INTO v_entry_number;
    
    -- Determine debit and credit accounts based on payment type
    IF v_payment.payment_type = 'RECEIVE' THEN
        -- Received Payment: DR Payment Method Account, CR Accounts Receivable
        v_debit_account_id := v_payment_method.account_id;
        v_credit_account_id := v_company.ar_account_id;
        
        IF v_credit_account_id IS NULL THEN
            RAISE EXCEPTION 'Company % does not have default Accounts Receivable account configured', v_payment.company_id;
        END IF;
    ELSE
        -- Make Payment: DR Accounts Payable, CR Payment Method Account
        v_debit_account_id := v_company.ap_account_id;
        v_credit_account_id := v_payment_method.account_id;
        
        IF v_debit_account_id IS NULL THEN
            RAISE EXCEPTION 'Company % does not have default Accounts Payable account configured', v_payment.company_id;
        END IF;
    END IF;
    
    -- Create journal entry header
    INSERT INTO journal_entries (
        id,
        company_id,
        entry_number,
        entry_date,
        reference,
        memo,
        status,
        source_type,
        source_id,
        is_active
    ) VALUES (
        gen_random_uuid(),
        v_payment.company_id,
        v_entry_number,
        v_payment.payment_date::DATE,
        'Payment: ' || v_payment.reference_number,
        'Auto-generated from payment: ' || v_payment.reference_number || ' (' || v_payment.payment_type || ')',
        'POSTED',
        'PAYMENT',
        v_payment.id,
        true
    ) RETURNING id INTO v_journal_entry_id;
    
    -- Create debit line
    INSERT INTO journal_entry_lines (
        id,
        journal_entry_id,
        line_number,
        account_id,
        description,
        debit_amount,
        credit_amount,
        customer_id,
        supplier_id,
        party_type,
        reference_document_type,
        reference_document_id
    ) VALUES (
        gen_random_uuid(),
        v_journal_entry_id,
        1,
        v_debit_account_id,
        'Payment: ' || v_payment.reference_number,
        v_payment.amount,
        0,
        CASE WHEN v_payment.payment_type = 'RECEIVE' AND v_debit_account_id = v_payment_method.account_id THEN NULL ELSE v_payment.customer_id END,
        CASE WHEN v_payment.payment_type = 'PAY' AND v_debit_account_id = v_company.ap_account_id THEN v_payment.supplier_id ELSE NULL END,
        CASE 
            WHEN v_payment.payment_type = 'RECEIVE' AND v_debit_account_id = v_company.ar_account_id THEN 'CUSTOMER'
            WHEN v_payment.payment_type = 'PAY' AND v_debit_account_id = v_company.ap_account_id THEN 'SUPPLIER'
            ELSE NULL
        END,
        'PAYMENT',
        v_payment.id
    );
    
    -- Create credit line
    INSERT INTO journal_entry_lines (
        id,
        journal_entry_id,
        line_number,
        account_id,
        description,
        debit_amount,
        credit_amount,
        customer_id,
        supplier_id,
        party_type,
        reference_document_type,
        reference_document_id
    ) VALUES (
        gen_random_uuid(),
        v_journal_entry_id,
        2,
        v_credit_account_id,
        'Payment: ' || v_payment.reference_number,
        0,
        v_payment.amount,
        CASE WHEN v_payment.payment_type = 'RECEIVE' AND v_credit_account_id = v_company.ar_account_id THEN v_payment.customer_id ELSE NULL END,
        CASE WHEN v_payment.payment_type = 'PAY' AND v_credit_account_id = v_payment_method.account_id THEN NULL ELSE v_payment.supplier_id END,
        CASE 
            WHEN v_payment.payment_type = 'RECEIVE' AND v_credit_account_id = v_company.ar_account_id THEN 'CUSTOMER'
            WHEN v_payment.payment_type = 'PAY' AND v_credit_account_id = v_company.ap_account_id THEN 'SUPPLIER'
            ELSE NULL
        END,
        'PAYMENT',
        v_payment.id
    );
    
    RETURN v_journal_entry_id;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for journal entry numbers if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS journal_entry_number_seq START 1;

-- Create trigger function to auto-create journal entries
CREATE OR REPLACE FUNCTION trigger_payment_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_journal_entry_id UUID;
BEGIN
    -- Only create journal entry if payment_method_id is provided and status is COMPLETED
    IF NEW.payment_method_id IS NOT NULL AND NEW.status = 'COMPLETED' THEN
        -- Check if journal entry already exists for this payment
        IF NOT EXISTS (
            SELECT 1 FROM journal_entries 
            WHERE source_type = 'PAYMENT' 
            AND source_id = NEW.id 
            AND is_active = true
        ) THEN
            -- Create journal entry
            SELECT create_payment_journal_entry(NEW.id) INTO v_journal_entry_id;
            
            RAISE NOTICE 'Created journal entry % for payment %', v_journal_entry_id, NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on payments table
DROP TRIGGER IF EXISTS payment_journal_entry_trigger ON payments;
CREATE TRIGGER payment_journal_entry_trigger
    AFTER INSERT OR UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_payment_journal_entry();

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_payment_journal_entry(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_payment_journal_entry() TO authenticated;

-- Update existing payments to link with payment methods (if needed)
-- This is a one-time update to migrate existing data
UPDATE payments 
SET payment_method_id = (
    SELECT id FROM payment_methods pm 
    WHERE pm.company_id = payments.company_id 
    AND LOWER(pm.name) = LOWER(payments.payment_method)
    LIMIT 1
)
WHERE payment_method_id IS NULL 
AND payment_method IS NOT NULL;

SELECT 'Payment auto journal entry system created successfully' as status;
