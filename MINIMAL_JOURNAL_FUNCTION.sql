-- Minimal Journal Function
-- Use only the most basic fields that should definitely exist

CREATE OR REPLACE FUNCTION create_purchase_invoice_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_journal_id UUID;
    v_inventory_account_id UUID;
    v_payable_account_id UUID;
    v_description TEXT;
    v_amount DECIMAL := 100.00;
    v_journal_number VARCHAR(20);
BEGIN
    -- Generate a short journal number
    v_journal_number := 'JE-' || EXTRACT(YEAR FROM NOW())::text || '-' || 
                       LPAD(EXTRACT(MONTH FROM NOW())::text, 2, '0') || '-' ||
                       LPAD(EXTRACT(DAY FROM NOW())::text, 2, '0') || '-' ||
                       LPAD(FLOOR(RANDOM() * 1000)::text, 3, '0');
    
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
    
    -- Build description using only basic fields
    v_description := 'Purchase Invoice ' || NEW.id::text;
    
    -- Create journal entry with minimal fields
    INSERT INTO journal_entries (
        id, journal_number, description, company_id, 
        reference_type, reference_id, reference_number,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_journal_number, v_description, NEW.company_id,
        'purchase_invoice', NEW.id, NEW.id::text,
        NOW(), NOW()
    ) RETURNING id INTO v_journal_id;
    
    -- Create journal entry lines
    
    -- 1. Debit Inventory/Expense account
    INSERT INTO journal_entry_lines (
        id, journal_entry_id, account_id,
        debit_amount, credit_amount, description, created_at
    ) VALUES (
        gen_random_uuid(), v_journal_id, v_inventory_account_id,
        v_amount, 0, 'Inventory - ' || v_description, NOW()
    );
    
    -- 2. Credit Accounts Payable
    INSERT INTO journal_entry_lines (
        id, journal_entry_id, account_id,
        debit_amount, credit_amount, description, created_at
    ) VALUES (
        gen_random_uuid(), v_journal_id, v_payable_account_id,
        0, v_amount, 'Accounts Payable - ' || v_description, NOW()
    );
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating purchase invoice journal entry: %', SQLERRM;
END;
$$;

SELECT 'Minimal journal function created with only basic fields!' as result;

