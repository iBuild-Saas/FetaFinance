    -- Updated Sales Invoice Journal Entry Function
    -- Uses company default accounts and triggers on INSERT (when saved)

    -- === UPDATE SALES INVOICE JOURNAL ENTRY FUNCTION ===
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
        v_tax_payable_account_id UUID;
        v_entry_number TEXT;
        v_description TEXT;
        v_line_number INTEGER := 1;
    BEGIN
        -- Get invoice details
        SELECT 
            company_id,
            COALESCE(subtotal, 0) as subtotal,
            COALESCE(tax_amount, 0) as tax_amount,
            COALESCE(total_amount, 0) as total_amount
        INTO 
            v_company_id,
            v_subtotal,
            v_tax_amount,
            v_total_amount
        FROM sales_invoices 
        WHERE id = NEW.id;
        
        -- Skip if amount is zero or negative
        IF v_total_amount IS NULL OR v_total_amount <= 0 THEN
            RAISE NOTICE 'Skipping journal entry for sales invoice % - invalid amount: %', NEW.invoice_number, v_total_amount;
            RETURN NEW;
        END IF;
        
        -- Get accounts from company default accounts
        SELECT 
            default_sales_revenue_account_id,
            accounts_receivable_account_id,
            sales_tax_payable_account_id
        INTO 
            v_revenue_account_id,
            v_receivable_account_id,
            v_tax_payable_account_id
        FROM companies 
        WHERE id = v_company_id;
        
        -- Check if we have the required accounts
        IF v_revenue_account_id IS NULL THEN
            RAISE EXCEPTION 'No default sales revenue account configured for company. Please update Account Mappings.';
        END IF;
        
        IF v_receivable_account_id IS NULL THEN
            RAISE EXCEPTION 'No accounts receivable account configured for company. Please update Account Mappings.';
        END IF;
        
        -- Generate entry number
        v_entry_number := 'SI-' || NEW.invoice_number;
        v_description := 'Sales Invoice ' || NEW.invoice_number;
        IF NEW.customer_name IS NOT NULL THEN
            v_description := v_description || ' - ' || NEW.customer_name;
        END IF;
        
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
        
        -- 2. Credit Sales Revenue account (subtotal - net of tax)
        IF v_subtotal > 0 THEN
            INSERT INTO journal_entry_lines (
                id, journal_entry_id, account_id, line_number,
                debit_amount, credit_amount, description, created_at, updated_at
            ) VALUES (
                gen_random_uuid(), v_journal_id, v_revenue_account_id, v_line_number,
                0, v_subtotal, 'Sales Revenue - ' || v_description, NOW(), NOW()
            );
            v_line_number := v_line_number + 1;
        END IF;
        
        -- 3. Credit Sales Tax Payable account (if tax exists and we have the account)
        IF v_tax_amount > 0 AND v_tax_payable_account_id IS NOT NULL THEN
            INSERT INTO journal_entry_lines (
                id, journal_entry_id, account_id, line_number,
                debit_amount, credit_amount, description, created_at, updated_at
            ) VALUES (
                gen_random_uuid(), v_journal_id, v_tax_payable_account_id, v_line_number,
                0, v_tax_amount, 'Sales Tax Payable - ' || v_description, NOW(), NOW()
            );
        END IF;
        
        RAISE NOTICE 'Created journal entry % for sales invoice % with total amount %', v_entry_number, NEW.invoice_number, v_total_amount;
        
        RETURN NEW;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Error creating sales invoice journal entry for invoice %: %', NEW.invoice_number, SQLERRM;
    END;
    $$;

    -- === UPDATE TRIGGER TO FIRE ON INSERT (WHEN SAVED) ===

    -- Drop existing trigger if it exists
    DROP TRIGGER IF EXISTS trigger_sales_invoice_journal ON sales_invoices;

    -- Create sales invoice trigger - fires when invoice is saved (INSERT)
    CREATE TRIGGER trigger_sales_invoice_journal
        AFTER INSERT ON sales_invoices
        FOR EACH ROW
        EXECUTE FUNCTION create_sales_invoice_journal_entry();

    -- === VERIFY THE SETUP ===
    SELECT 'SALES INVOICE JOURNAL FUNCTION UPDATED' as status;

    -- Check if the function exists
    SELECT 'Function exists:' as info, 
        EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'create_sales_invoice_journal_entry') as function_exists;

    -- Check if the trigger exists
    SELECT 'Trigger exists:' as info,
        COUNT(*) as trigger_count
    FROM information_schema.triggers 
    WHERE trigger_name = 'trigger_sales_invoice_journal' 
    AND event_object_table = 'sales_invoices';

    -- Show trigger details
    SELECT 
        trigger_name,
        event_manipulation as event,
        event_object_table as table_name,
        action_timing as timing
    FROM information_schema.triggers 
    WHERE trigger_name = 'trigger_sales_invoice_journal';
