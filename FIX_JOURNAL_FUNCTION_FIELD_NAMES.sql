-- Fix Journal Function Field Names
-- Update the function to use the correct field names from the purchase_invoices table

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
        total_amount
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
    
    -- Generate entry number and description
    v_entry_number := 'PI-' || NEW.invoice_number;
    -- Use memo field instead of description
    v_description := 'Purchase Invoice ' || NEW.invoice_number;
    IF NEW.memo IS NOT NULL AND NEW.memo != '' THEN
        v_description := v_description || ' - ' || NEW.memo;
    END IF;
    
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
            id, journal_entry_id, account_id,
            debit_amount, credit_amount, description, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), v_journal_id, v_inventory_account_id,
            v_subtotal, 0, 'Inventory/Expense - ' || v_description, NOW(), NOW()
        );
        v_line_number := v_line_number + 1;
    END IF;
    
    -- 2. Debit Tax account (if tax exists)
    IF v_tax_amount > 0 THEN
        INSERT INTO journal_entry_lines (
            id, journal_entry_id, account_id,
            debit_amount, credit_amount, description, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), v_journal_id, v_payable_account_id,
            v_tax_amount, 0, 'Tax - ' || v_description, NOW(), NOW()
        );
        v_line_number := v_line_number + 1;
    END IF;
    
    -- 3. Credit Accounts Payable (total amount)
    INSERT INTO journal_entry_lines (
        id, journal_entry_id, account_id,
        debit_amount, credit_amount, description, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_journal_id, v_payable_account_id,
        0, v_total_amount, 'Accounts Payable - ' || v_description, NOW(), NOW()
    );
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating purchase invoice journal entry: %', SQLERRM;
END;
$$;

SELECT 'Journal function updated with correct field names!' as result;
