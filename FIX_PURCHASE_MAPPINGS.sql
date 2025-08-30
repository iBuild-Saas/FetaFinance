-- Fix: Drop trigger first, then function, then recreate both
-- Drop trigger first to remove dependency
DROP TRIGGER IF EXISTS trigger_purchase_invoice_journal ON purchase_invoices;

-- Now drop the function
DROP FUNCTION IF EXISTS create_purchase_invoice_journal_entry();

-- Create the updated function to use Purchase Invoice Mappings
CREATE OR REPLACE FUNCTION create_purchase_invoice_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_journal_id UUID;
    v_expense_account_id UUID;  -- For DEBIT (Default Inventory/Expense)
    v_payable_account_id UUID;  -- For CREDIT (Accounts Payable)
    v_description TEXT;
    v_amount DECIMAL := 100.00;
    v_journal_number VARCHAR(20);
BEGIN
    -- Only process when status changes to 'RECEIVED'
    IF NEW.status != 'RECEIVED' THEN
        RETURN NEW;
    END IF;
    
    -- Generate journal number
    v_journal_number := 'JE-' || EXTRACT(YEAR FROM NOW())::text || '-' || 
                       LPAD(EXTRACT(MONTH FROM NOW())::text, 2, '0') || '-' ||
                       LPAD(EXTRACT(DAY FROM NOW())::text, 2, '0') || '-' ||
                       LPAD(FLOOR(RANDOM() * 1000)::text, 3, '0');
    
    -- Get DEBIT account (Default Inventory/Expense) - Account Code 5110
    SELECT id INTO v_expense_account_id
    FROM chart_of_accounts
    WHERE company_id = NEW.company_id
    AND account_code = '5110'  -- تكلفة البضائع - Expense
    LIMIT 1;
    
    -- Get CREDIT account (Accounts Payable) - Account Code 2110  
    SELECT id INTO v_payable_account_id
    FROM chart_of_accounts
    WHERE company_id = NEW.company_id
    AND account_code = '2110'  -- الموردين - Liability
    LIMIT 1;
    
    -- Verify we have both accounts
    IF v_expense_account_id IS NULL THEN
        RAISE EXCEPTION 'Default Inventory/Expense account (5110) not found for company %', NEW.company_id;
    END IF;
    
    IF v_payable_account_id IS NULL THEN
        RAISE EXCEPTION 'Accounts Payable account (2110) not found for company %', NEW.company_id;
    END IF;
    
    -- Build description
    v_description := 'Purchase Invoice ' || NEW.id::text;
    
    -- Create journal entry header
    INSERT INTO journal_entries (
        id, journal_number, description, company_id, 
        reference_type, reference_id, reference_number,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_journal_number, v_description, NEW.company_id,
        'purchase_invoice', NEW.id, NEW.id::text,
        NOW(), NOW()
    ) RETURNING id INTO v_journal_id;
    
    -- DEBIT: Default Inventory/Expense Account (5110 - تكلفة البضائع)
    INSERT INTO journal_entry_lines (
        id, journal_entry_id, account_id,
        debit_amount, credit_amount, description, created_at
    ) VALUES (
        gen_random_uuid(), v_journal_id, v_expense_account_id,
        v_amount, 0, 'Purchase Expense - ' || v_description, NOW()
    );
    
    -- CREDIT: Accounts Payable Account (2110 - الموردين)
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
CREATE TRIGGER trigger_purchase_invoice_journal
    AFTER UPDATE OF status ON purchase_invoices
    FOR EACH ROW
    EXECUTE FUNCTION create_purchase_invoice_journal_entry();

-- Verify the accounts exist and will be used
SELECT '=== PURCHASE INVOICE MAPPING ACCOUNTS ===' as info;
SELECT 
    account_code,
    account_name,
    account_type,
    'Will be used for: ' || 
    CASE 
        WHEN account_code = '5110' THEN 'DEBIT (Default Inventory/Expense)'
        WHEN account_code = '2110' THEN 'CREDIT (Accounts Payable)'
        ELSE 'Other'
    END as usage
FROM chart_of_accounts
WHERE account_code IN ('5110', '2110')
ORDER BY account_code;

SELECT '=== TRIGGER STATUS ===' as info;
SELECT 'Trigger recreated successfully' as status;
