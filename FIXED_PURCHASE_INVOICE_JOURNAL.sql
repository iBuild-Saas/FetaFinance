-- =====================================================
-- FIXED PURCHASE INVOICE JOURNAL ENTRY FUNCTION
-- =====================================================
-- This function creates journal entries for purchase invoices when status changes to 'RECEIVED'
-- It uses the company's default account mappings from the companies table

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_purchase_invoice_journal ON purchase_invoices;
DROP FUNCTION IF EXISTS create_purchase_invoice_journal_entry();

-- Create the fixed function
CREATE OR REPLACE FUNCTION create_purchase_invoice_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_journal_id UUID;
    v_inventory_account_id UUID;
    v_payable_account_id UUID;
    v_description TEXT;
    v_amount DECIMAL;
    v_journal_number VARCHAR(20);
    v_company_id UUID;
BEGIN
    -- Debug logging
    RAISE NOTICE 'Purchase invoice journal function triggered for invoice % with status %', NEW.invoice_number, NEW.status;
    
    -- Only process when status changes to 'RECEIVED'
    IF NEW.status != 'RECEIVED' THEN
        RAISE NOTICE 'Skipping journal entry - status is not RECEIVED (current: %)', NEW.status;
        RETURN NEW;
    END IF;
    
    -- Get the actual total amount from the purchase invoice
    v_amount := NEW.total_amount;
    v_company_id := NEW.company_id;
    
    -- Validate amount
    IF v_amount IS NULL OR v_amount <= 0 THEN
        RAISE EXCEPTION 'Invalid amount for purchase invoice %. Amount must be greater than 0', NEW.invoice_number;
    END IF;
    
    -- Generate journal number
    v_journal_number := 'PI-JE-' || EXTRACT(YEAR FROM NOW())::text || '-' || 
                       LPAD(EXTRACT(MONTH FROM NOW())::text, 2, '0') || '-' ||
                       LPAD(EXTRACT(DAY FROM NOW())::text, 2, '0') || '-' ||
                       LPAD(FLOOR(RANDOM() * 1000)::text, 3, '0');
    
    -- Get accounts from company default fields
    SELECT 
        default_inventory_account_id,
        accounts_payable_account_id
    INTO 
        v_inventory_account_id,
        v_payable_account_id
    FROM companies 
    WHERE id = v_company_id;
    
    -- Debug logging
    RAISE NOTICE 'Company %: inventory_account_id = %, payable_account_id = %', 
                 v_company_id, v_inventory_account_id, v_payable_account_id;
    
    -- Verify we have both accounts
    IF v_inventory_account_id IS NULL THEN
        RAISE EXCEPTION 'No Default Inventory/Expense account configured for company %. Please set up the account in company purchase invoice mapping', v_company_id;
    END IF;
    
    IF v_payable_account_id IS NULL THEN
        RAISE EXCEPTION 'No Accounts Payable account configured for company %. Please set up the account in company purchase invoice mapping', v_company_id;
    END IF;
    
    -- Build description
    v_description := 'Purchase Invoice ' || NEW.invoice_number || ' - Amount: ' || v_amount::text;
    
    RAISE NOTICE 'Creating journal entry: % - %', v_journal_number, v_description;
    
    -- Create journal entry header
    INSERT INTO journal_entries (
        id, journal_number, description, company_id, 
        reference_type, reference_id, reference_number,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_journal_number, v_description, v_company_id,
        'purchase_invoice', NEW.id, NEW.invoice_number,
        NOW(), NOW()
    ) RETURNING id INTO v_journal_id;
    
    RAISE NOTICE 'Journal entry created with ID: %', v_journal_id;
    
    -- DEBIT: Default Inventory/Expense Account
    INSERT INTO journal_entry_lines (
        id, journal_entry_id, account_id,
        debit_amount, credit_amount, description, created_at
    ) VALUES (
        gen_random_uuid(), v_journal_id, v_inventory_account_id,
        v_amount, 0, 'Purchase Expense - Invoice ' || NEW.invoice_number, NOW()
    );
    
    RAISE NOTICE 'Debit line created: Inventory/Expense account % for amount %', v_inventory_account_id, v_amount;
    
    -- CREDIT: Accounts Payable Account
    INSERT INTO journal_entry_lines (
        id, journal_entry_id, account_id,
        debit_amount, credit_amount, description, created_at
    ) VALUES (
        gen_random_uuid(), v_journal_id, v_payable_account_id,
        0, v_amount, 'Accounts Payable - Invoice ' || NEW.invoice_number, NOW()
    );
    
    RAISE NOTICE 'Credit line created: Accounts Payable account % for amount %', v_payable_account_id, v_amount;
    
    RAISE NOTICE 'Purchase invoice journal entry completed successfully for invoice %', NEW.invoice_number;
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating purchase invoice journal entry: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_purchase_invoice_journal
    AFTER UPDATE OF status ON purchase_invoices
    FOR EACH ROW
    EXECUTE FUNCTION create_purchase_invoice_journal_entry();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if the function was created
SELECT '=== FUNCTION CREATED ===' as status;

-- Check if the trigger was created
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_purchase_invoice_journal';

-- Check company account mappings
SELECT 
    c.id as company_id,
    c.name as company_name,
    c.default_inventory_account_id,
    c.accounts_payable_account_id,
    inv.account_code as inventory_account_code,
    inv.account_name as inventory_account_name,
    pay.account_code as payable_account_code,
    pay.account_name as payable_account_name
FROM companies c
LEFT JOIN chart_of_accounts inv ON c.default_inventory_account_id = inv.id
LEFT JOIN chart_of_accounts pay ON c.accounts_payable_account_id = pay.id
WHERE c.default_inventory_account_id IS NOT NULL 
   OR c.accounts_payable_account_id IS NOT NULL;

-- Check recent purchase invoices
SELECT 
    pi.id,
    pi.invoice_number,
    pi.status,
    pi.total_amount,
    pi.company_id,
    c.name as company_name
FROM purchase_invoices pi
JOIN companies c ON pi.company_id = c.id
ORDER BY pi.created_at DESC
LIMIT 5;

-- Check if journal entries exist
SELECT 
    je.id,
    je.journal_number,
    je.description,
    je.reference_type,
    je.reference_number,
    je.created_at
FROM journal_entries je
WHERE je.reference_type = 'purchase_invoice'
ORDER BY je.created_at DESC
LIMIT 5;
