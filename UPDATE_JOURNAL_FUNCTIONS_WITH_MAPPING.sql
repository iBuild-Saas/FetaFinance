-- Update Journal Functions to Use Account Mapping System
-- This script updates the journal entry functions to use account mappings instead of hardcoded searches

-- === UPDATE CREATE_PURCHASE_INVOICE_JOURNAL_ENTRY FUNCTION ===
CREATE OR REPLACE FUNCTION create_purchase_invoice_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_journal_id UUID;
    v_company_id UUID;
    v_subtotal DECIMAL;
    v_tax_amount DECIMAL;
    v_total_amount DECIMAL;
    v_inventory_account_id UUID;
    v_payable_account_id UUID;
    v_entry_number TEXT;
    v_description TEXT;
    v_line_number INTEGER := 1;
BEGIN
    -- Get invoice details
    SELECT 
        company_id,
        subtotal,
        tax_amount,
        (subtotal + tax_amount) as total_amount
    INTO 
        v_company_id,
        v_subtotal,
        v_tax_amount,
        v_total_amount
    FROM purchase_invoices 
    WHERE id = NEW.id;
    
    -- Get accounts from mapping
    v_inventory_account_id := get_account_from_mapping('purchase_invoice', 'inventory');
    v_payable_account_id := get_account_from_mapping('purchase_invoice', 'accounts_payable');
    
    -- Check if we have the required accounts
    IF v_inventory_account_id IS NULL THEN
        RAISE EXCEPTION 'No inventory account mapped for purchase invoices';
    END IF;
    
    IF v_payable_account_id IS NULL THEN
        RAISE EXCEPTION 'No accounts payable account mapped for purchase invoices';
    END IF;
    
    -- Generate entry number
    v_entry_number := 'PI-' || NEW.invoice_number;
    v_description := 'Purchase Invoice ' || NEW.invoice_number || ' - ' || NEW.description;
    
    -- Create journal entry
    INSERT INTO journal_entries (
        id, entry_number, entry_date, description, company_id, 
        reference_type, reference_id, reference_number, status,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_entry_number, NEW.invoice_date, v_description, v_company_id,
        'purchase_invoice', NEW.id, NEW.invoice_number, 'POSTED',
        NOW(), NOW()
    ) RETURNING id INTO v_journal_id;
    
    -- Create journal entry lines
    
    -- 1. Debit Inventory/Expense account
    IF v_subtotal > 0 THEN
        INSERT INTO journal_entry_lines (
            id, journal_entry_id, account_id, line_number,
            debit_amount, credit_amount, description, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), v_journal_id, v_inventory_account_id, v_line_number,
            v_subtotal, 0, 'Inventory/Expense - ' || v_description, NOW(), NOW()
        );
        v_line_number := v_line_number + 1;
    END IF;
    
    -- 2. Debit Tax account (if tax exists)
    IF v_tax_amount > 0 THEN
        INSERT INTO journal_entry_lines (
            id, journal_entry_id, account_id, line_number,
            debit_amount, credit_amount, description, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), v_journal_id, v_payable_account_id, v_line_number,
            v_tax_amount, 0, 'Tax - ' || v_description, NOW(), NOW()
        );
        v_line_number := v_line_number + 1;
    END IF;
    
    -- 3. Credit Accounts Payable (total amount)
    INSERT INTO journal_entry_lines (
        id, journal_entry_id, account_id, line_number,
        debit_amount, credit_amount, description, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_journal_id, v_payable_account_id, v_line_number,
        0, v_total_amount, 'Accounts Payable - ' || v_description, NOW(), NOW()
    );
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating purchase invoice journal entry: %', SQLERRM;
END;
$$;

-- === CREATE SALES INVOICE JOURNAL ENTRY FUNCTION ===
CREATE OR REPLACE FUNCTION create_sales_invoice_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_journal_id UUID;
    v_company_id UUID;
    v_subtotal DECIMAL;
    v_tax_amount DECIMAL;
    v_total_amount DECIMAL;
    v_revenue_account_id UUID;
    v_receivable_account_id UUID;
    v_entry_number TEXT;
    v_description TEXT;
    v_line_number INTEGER := 1;
BEGIN
    -- Get invoice details
    SELECT 
        company_id,
        subtotal,
        tax_amount,
        (subtotal + tax_amount) as total_amount
    INTO 
        v_company_id,
        v_subtotal,
        v_tax_amount,
        v_total_amount
    FROM sales_invoices 
    WHERE id = NEW.id;
    
    -- Get accounts from mapping
    v_revenue_account_id := get_account_from_mapping('sales_invoice', 'revenue');
    v_receivable_account_id := get_account_from_mapping('sales_invoice', 'accounts_receivable');
    
    -- Check if we have the required accounts
    IF v_revenue_account_id IS NULL THEN
        RAISE EXCEPTION 'No revenue account mapped for sales invoices';
    END IF;
    
    IF v_receivable_account_id IS NULL THEN
        RAISE EXCEPTION 'No accounts receivable account mapped for sales invoices';
    END IF;
    
    -- Generate entry number
    v_entry_number := 'SI-' || NEW.invoice_number;
    v_description := 'Sales Invoice ' || NEW.invoice_number || ' - ' || NEW.description;
    
    -- Create journal entry
    INSERT INTO journal_entries (
        id, entry_number, entry_date, description, company_id, 
        reference_type, reference_id, reference_number, status,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_entry_number, NEW.invoice_date, v_description, v_company_id,
        'sales_invoice', NEW.id, NEW.invoice_number, 'POSTED',
        NOW(), NOW()
    ) RETURNING id INTO v_journal_id;
    
    -- Create journal entry lines
    
    -- 1. Debit Accounts Receivable (total amount)
    INSERT INTO journal_entry_lines (
        id, journal_entry_id, account_id, line_number,
        debit_amount, credit_amount, description, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_journal_id, v_receivable_account_id, v_line_number,
        v_total_amount, 0, 'Accounts Receivable - ' || v_description, NOW(), NOW()
    );
    v_line_number := v_line_number + 1;
    
    -- 2. Credit Revenue account (subtotal)
    IF v_subtotal > 0 THEN
        INSERT INTO journal_entry_lines (
            id, journal_entry_id, account_id, line_number,
            debit_amount, credit_amount, description, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), v_journal_id, v_revenue_account_id, v_line_number,
            0, v_subtotal, 'Revenue - ' || v_description, NOW(), NOW()
        );
        v_line_number := v_line_number + 1;
    END IF;
    
    -- 3. Credit Tax account (if tax exists)
    IF v_tax_amount > 0 THEN
        INSERT INTO journal_entry_lines (
            id, journal_entry_id, account_id, line_number,
            debit_amount, credit_amount, description, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), v_journal_id, v_receivable_account_id, v_line_number,
            0, v_tax_amount, 'Tax Payable - ' || v_description, NOW(), NOW()
        );
    END IF;
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating sales invoice journal entry: %', SQLERRM;
END;
$$;

-- === CREATE TRIGGERS ===

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_purchase_invoice_journal ON purchase_invoices;
DROP TRIGGER IF EXISTS trigger_sales_invoice_journal ON sales_invoices;

-- Create purchase invoice trigger
CREATE TRIGGER trigger_purchase_invoice_journal
    AFTER UPDATE ON purchase_invoices
    FOR EACH ROW
    WHEN (OLD.status != NEW.status AND NEW.status = 'RECEIVED')
    EXECUTE FUNCTION create_purchase_invoice_journal_entry();

-- Create sales invoice trigger
CREATE TRIGGER trigger_sales_invoice_journal
    AFTER UPDATE ON sales_invoices
    FOR EACH ROW
    WHEN (OLD.status != NEW.status AND NEW.status = 'SUBMITTED')
    EXECUTE FUNCTION create_sales_invoice_journal_entry();

-- === VERIFY THE SETUP ===
SELECT 'JOURNAL FUNCTIONS UPDATED' as status;
SELECT 'Functions created:' as info;
SELECT proname as function_name FROM pg_proc WHERE proname IN (
    'create_purchase_invoice_journal_entry',
    'create_sales_invoice_journal_entry'
);

SELECT 'Triggers created:' as info;
SELECT 
    t.trigger_name,
    t.event_manipulation,
    t.event_object_table
FROM information_schema.triggers t
WHERE t.trigger_name IN (
    'trigger_purchase_invoice_journal',
    'trigger_sales_invoice_journal'
);
