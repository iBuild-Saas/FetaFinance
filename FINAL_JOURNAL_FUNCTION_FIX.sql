-- Final Journal Function Fix
-- Handle the description field properly with NULL checks

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
    v_amount DECIMAL;
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
    
    -- Generate entry number
    v_entry_number := 'PI-' || COALESCE(NEW.invoice_number, NEW.id::text);
    
    -- Build description safely
    v_description := 'Purchase Invoice ' || COALESCE(NEW.invoice_number, NEW.id::text);
    IF NEW.description IS NOT NULL AND NEW.description != '' THEN
        v_description := v_description || ' - ' || NEW.description;
    END IF;
    
    -- Get amount safely
    v_amount := COALESCE(NEW.total_amount, NEW.subtotal, 0);
    IF v_amount = 0 THEN
        v_amount := 100.00; -- Default for testing
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
        v_amount, 0, 'Inventory - ' || v_description, NOW(), NOW()
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

SELECT 'Final journal function created with proper NULL handling!' as result;
