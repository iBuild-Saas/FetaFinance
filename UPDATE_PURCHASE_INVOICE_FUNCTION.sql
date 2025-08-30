-- Update the purchase invoice journal entry function to use account mappings

DROP FUNCTION IF EXISTS create_purchase_invoice_journal_entry();

CREATE OR REPLACE FUNCTION create_purchase_invoice_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_journal_id UUID;
    v_inventory_account_id UUID;
    v_payable_account_id UUID;
    v_description TEXT;
    v_amount DECIMAL := 100.00;
    v_journal_number VARCHAR(20);
BEGIN
    -- Only process when status changes to 'RECEIVED'
    IF NEW.status != 'RECEIVED' THEN
        RETURN NEW;
    END IF;
    
    -- Generate a short journal number
    v_journal_number := 'JE-' || EXTRACT(YEAR FROM NOW())::text || '-' || 
                       LPAD(EXTRACT(MONTH FROM NOW())::text, 2, '0') || '-' ||
                       LPAD(EXTRACT(DAY FROM NOW())::text, 2, '0') || '-' ||
                       LPAD(FLOOR(RANDOM() * 1000)::text, 3, '0');
    
    -- Get accounts from mapping table
    SELECT account_id INTO v_inventory_account_id
    FROM account_mappings
    WHERE company_id = NEW.company_id 
    AND mapping_type = 'purchase_invoice'
    AND mapping_name = 'inventory'
    LIMIT 1;
    
    SELECT account_id INTO v_payable_account_id
    FROM account_mappings
    WHERE company_id = NEW.company_id 
    AND mapping_type = 'purchase_invoice'
    AND mapping_name = 'accounts_payable'
    LIMIT 1;
    
    -- If no mapping found, try to find accounts by name pattern
    IF v_inventory_account_id IS NULL THEN
        SELECT id INTO v_inventory_account_id
        FROM chart_of_accounts
        WHERE company_id = NEW.company_id
        AND account_code = '5110'  -- Default Inventory/Expense account
        LIMIT 1;
    END IF;
    
    IF v_payable_account_id IS NULL THEN
        SELECT id INTO v_payable_account_id
        FROM chart_of_accounts
        WHERE company_id = NEW.company_id
        AND account_code = '2110'  -- Accounts Payable account
        LIMIT 1;
    END IF;
    
    -- Check if we have the required accounts
    IF v_inventory_account_id IS NULL THEN
        RAISE EXCEPTION 'No inventory/expense account found for purchase invoices';
    END IF;
    
    IF v_payable_account_id IS NULL THEN
        RAISE EXCEPTION 'No accounts payable account found for purchase invoices';
    END IF;
    
    -- Build description using only basic fields
    v_description := 'Purchase Invoice ' || NEW.id::text;
    
    -- Create journal entry
    INSERT INTO journal_entries (
        id, journal_number, description, company_id, 
        reference_type, reference_id, reference_number,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_journal_number, v_description, NEW.company_id,
        'purchase_invoice', NEW.id, NEW.id::text,
        NOW(), NOW()
    ) RETURNING id INTO v_journal_id;
    
    -- 1. Debit Inventory/Expense account
    INSERT INTO journal_entry_lines (
        id, journal_entry_id, account_id,
        debit_amount, credit_amount, description, created_at
    ) VALUES (
        gen_random_uuid(), v_journal_id, v_inventory_account_id,
        v_amount, 0, 'Inventory/Expense - ' || v_description, NOW()
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
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_purchase_invoice_journal ON purchase_invoices;
CREATE TRIGGER trigger_purchase_invoice_journal
    AFTER UPDATE OF status ON purchase_invoices
    FOR EACH ROW
    EXECUTE FUNCTION create_purchase_invoice_journal_entry();

-- Test the updated function by checking current mappings
SELECT '=== CURRENT ACCOUNT MAPPINGS ===' as info;
SELECT 
    mapping_type,
    mapping_name,
    account_id,
    coa.account_name,
    coa.account_code,
    coa.account_type
FROM account_mappings am
LEFT JOIN chart_of_accounts coa ON am.account_id = coa.id
WHERE am.mapping_type = 'purchase_invoice'
ORDER BY am.mapping_name;

-- Show the accounts that will be used
SELECT '=== ACCOUNTS TO BE USED ===' as info;
SELECT 
    account_code,
    account_name,
    account_type,
    id
FROM chart_of_accounts
WHERE account_code IN ('2110', '5110')
ORDER BY account_code;
