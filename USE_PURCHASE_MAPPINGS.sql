-- Create simple purchase invoice auto journal function
-- This function gets accounts from company purchase invoice mapping fields

-- Drop any existing function and trigger
DROP TRIGGER IF EXISTS trigger_purchase_invoice_journal ON purchase_invoices;
DROP FUNCTION IF EXISTS create_purchase_invoice_journal_entry();

-- Create the function
CREATE OR REPLACE FUNCTION create_purchase_invoice_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_journal_id UUID;
    v_inventory_account_id UUID;  -- For DEBIT (Default Inventory/Expense)
    v_payable_account_id UUID;    -- For CREDIT (Accounts Payable)
    v_description TEXT;
    v_amount DECIMAL;
    v_journal_number VARCHAR(20);
BEGIN
    -- Only process when status changes to 'RECEIVED'
    IF NEW.status != 'RECEIVED' THEN
        RETURN NEW;
    END IF;
    
    -- Get the actual total amount from the purchase invoice
    v_amount := NEW.total_amount;
    
    -- Validate amount
    IF v_amount IS NULL OR v_amount <= 0 THEN
        RAISE EXCEPTION 'Invalid amount for purchase invoice %. Amount must be greater than 0', NEW.id;
    END IF;
    
    -- Generate journal number
    v_journal_number := 'JE-' || EXTRACT(YEAR FROM NOW())::text || '-' || 
                       LPAD(EXTRACT(MONTH FROM NOW())::text, 2, '0') || '-' ||
                       LPAD(EXTRACT(DAY FROM NOW())::text, 2, '0') || '-' ||
                       LPAD(FLOOR(RANDOM() * 1000)::text, 3, '0');
    
    -- Get accounts from company purchase invoice mapping fields
    -- You need to replace these with the actual field names from your company table
    
    -- Option 1: If accounts are stored in company table fields
    SELECT 
        COALESCE(default_inventory_account_id, default_expense_account_id) INTO v_inventory_account_id
    FROM companies 
    WHERE id = NEW.company_id;
    
    SELECT 
        COALESCE(accounts_payable_account_id, default_payable_account_id) INTO v_payable_account_id
    FROM companies 
    WHERE id = NEW.company_id;
    
    -- Option 2: If accounts are stored in a separate company_settings table
    -- Uncomment and modify these lines if you have a company_settings table
    /*
    SELECT 
        COALESCE(default_inventory_account_id, default_expense_account_id) INTO v_inventory_account_id
    FROM company_settings 
    WHERE company_id = NEW.company_id;
    
    SELECT 
        COALESCE(accounts_payable_account_id, default_payable_account_id) INTO v_payable_account_id
    FROM company_settings 
    WHERE company_id = NEW.company_id;
    */
    
    -- Verify we have both accounts
    IF v_inventory_account_id IS NULL THEN
        RAISE EXCEPTION 'No Default Inventory/Expense account configured for company %. Please set up the account in company purchase invoice mapping', NEW.company_id;
    END IF;
    
    IF v_payable_account_id IS NULL THEN
        RAISE EXCEPTION 'No Accounts Payable account configured for company %. Please set up the account in company purchase invoice mapping', NEW.company_id;
    END IF;
    
    -- Build description
    v_description := 'Purchase Invoice ' || NEW.invoice_number || ' - Amount: ' || v_amount::text;
    
    -- Create journal entry header
    INSERT INTO journal_entries (
        id, journal_number, description, company_id, 
        reference_type, reference_id, reference_number,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_journal_number, v_description, NEW.company_id,
        'purchase_invoice', NEW.id, NEW.invoice_number,
        NOW(), NOW()
    ) RETURNING id INTO v_journal_id;
    
    -- DEBIT: Default Inventory/Expense Account
    INSERT INTO journal_entry_lines (
        id, journal_entry_id, account_id,
        debit_amount, credit_amount, description, created_at
    ) VALUES (
        gen_random_uuid(), v_journal_id, v_inventory_account_id,
        v_amount, 0, 'Purchase Expense - Invoice ' || NEW.invoice_number, NOW()
    );
    
    -- CREDIT: Accounts Payable Account
    INSERT INTO journal_entry_lines (
        id, journal_entry_id, account_id,
        debit_amount, credit_amount, description, created_at
    ) VALUES (
        gen_random_uuid(), v_journal_id, v_payable_account_id,
        0, v_amount, 'Accounts Payable - Invoice ' || NEW.invoice_number, NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_purchase_invoice_journal
    AFTER UPDATE OF status ON purchase_invoices
    FOR EACH ROW
    EXECUTE FUNCTION create_purchase_invoice_journal_entry();

-- =====================================================
-- NEXT STEPS - CONFIGURE ACCOUNT FIELDS
-- =====================================================

SELECT '=== FUNCTION CREATED ===' as status;
SELECT 'Next: Configure account fields in your company table' as instruction;
SELECT 'The function expects these fields to exist:' as explanation;
SELECT '  - default_inventory_account_id OR default_expense_account_id (for DEBIT)' as field1;
SELECT '  - accounts_payable_account_id OR default_payable_account_id (for CREDIT)' as field2;

-- Show current company structure to help identify field names
SELECT '=== CURRENT COMPANY TABLE STRUCTURE ===' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name LIKE '%account%'
ORDER BY column_name;
