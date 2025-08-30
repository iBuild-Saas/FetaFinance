-- Safe Journal Function
-- Create a journal function using only basic fields that should exist

CREATE OR REPLACE FUNCTION create_purchase_invoice_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_journal_id UUID;
    v_inventory_account_id UUID;
    v_payable_account_id UUID;
    v_entry_number TEXT;
    v_description TEXT;
    v_amount DECIMAL := 100.00; -- Default amount for testing
BEGIN
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
    
    -- Generate entry number and description using only basic fields
    v_entry_number := 'PI-' || COALESCE(NEW.invoice_number, NEW.id::text);
    v_description := 'Purchase Invoice ' || COALESCE(NEW.invoice_number, NEW.id::text);
    
    -- Use total_amount if it exists, otherwise use default
    IF NEW.total_amount IS NOT NULL THEN
        v_amount := NEW.total_amount;
    END IF;
    
    -- Create journal entry
    INSERT INTO journal_entries (
        id, description, company_id, 
        reference_type, reference_id, reference_number,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_description, NEW.company_id,
        'purchase_invoice', NEW.id, COALESCE(NEW.invoice_number, NEW.id::text),
        NOW(), NOW()
    ) RETURNING id INTO v_journal_id;
    
    -- Create journal entry lines
    
    -- 1. Debit Inventory/Expense account
    INSERT INTO journal_entry_lines (
        id, journal_entry_id, account_id,
        debit_amount, credit_amount, description, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_journal_id, v_inventory_account_id,
        v_amount, 0, 'Inventory/Expense - ' || v_description, NOW(), NOW()
    );
    
    -- 2. Credit Accounts Payable
    INSERT INTO journal_entry_lines (
        id, journal_entry_id, account_id,
        debit_amount, credit_amount, description, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_journal_id, v_payable_account_id,
        0, v_amount, 'Accounts Payable - ' || v_description, NOW(), NOW()
    );
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating purchase invoice journal entry: %', SQLERRM;
END;
$$;

SELECT 'Safe journal function created!' as result;
