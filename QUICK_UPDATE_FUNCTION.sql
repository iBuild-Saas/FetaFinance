-- Quick update to use account mappings
DROP FUNCTION IF EXISTS create_purchase_invoice_journal_entry();

CREATE OR REPLACE FUNCTION create_purchase_invoice_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_journal_id UUID;
    v_inventory_account_id UUID;
    v_payable_account_id UUID;
    v_description TEXT;
    v_journal_number VARCHAR(20);
BEGIN
    IF NEW.status != 'RECEIVED' THEN
        RETURN NEW;
    END IF;
    
    v_journal_number := 'JE-' || EXTRACT(YEAR FROM NOW())::text || '-' || 
                       LPAD(EXTRACT(MONTH FROM NOW())::text, 2, '0') || '-' ||
                       LPAD(EXTRACT(DAY FROM NOW())::text, 2, '0') || '-' ||
                       LPAD(FLOOR(RANDOM() * 1000)::text, 3, '0');
    
    -- Use account codes from mappings
    SELECT id INTO v_inventory_account_id FROM chart_of_accounts 
    WHERE company_id = NEW.company_id AND account_code = '5110' LIMIT 1;
    
    SELECT id INTO v_payable_account_id FROM chart_of_accounts 
    WHERE company_id = NEW.company_id AND account_code = '2110' LIMIT 1;
    
    v_description := 'Purchase Invoice ' || NEW.id::text;
    
    INSERT INTO journal_entries (
        id, journal_number, description, company_id, 
        reference_type, reference_id, reference_number,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_journal_number, v_description, NEW.company_id,
        'purchase_invoice', NEW.id, NEW.id::text, NOW(), NOW()
    ) RETURNING id INTO v_journal_id;
    
    INSERT INTO journal_entry_lines (
        id, journal_entry_id, account_id, debit_amount, credit_amount, 
        description, created_at
    ) VALUES (
        gen_random_uuid(), v_journal_id, v_inventory_account_id,
        100.00, 0, 'Expense - ' || v_description, NOW()
    );
    
    INSERT INTO journal_entry_lines (
        id, journal_entry_id, account_id, debit_amount, credit_amount, 
        description, created_at
    ) VALUES (
        gen_random_uuid(), v_journal_id, v_payable_account_id,
        0, 100.00, 'Payable - ' || v_description, NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
