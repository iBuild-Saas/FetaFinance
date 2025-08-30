-- =====================================================
-- COMPLETE AUTO JOURNAL ENTRY SYSTEM FOR INVOICES
-- =====================================================
-- This script creates automatic journal entry generation for purchase and sales invoices
-- when they are saved with SUBMITTED status using default accounts from company master

-- =====================================================
-- 1. DROP EXISTING FUNCTIONS AND TRIGGERS
-- =====================================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS trigger_purchase_invoice_journal ON purchase_invoices;
DROP TRIGGER IF EXISTS trigger_sales_invoice_journal ON sales_invoices;

-- Drop existing functions
DROP FUNCTION IF EXISTS create_purchase_invoice_journal_entry();
DROP FUNCTION IF EXISTS create_sales_invoice_journal_entry();

-- =====================================================
-- 2. CREATE PURCHASE INVOICE AUTO JOURNAL FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION create_purchase_invoice_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_journal_id UUID;
    v_inventory_account_id UUID;
    v_expense_account_id UUID;
    v_payable_account_id UUID;
    v_debit_account_id UUID;
    v_description TEXT;
    v_amount DECIMAL;
    v_journal_number VARCHAR(50);
    v_company_id UUID;
BEGIN
    -- Only process when status is SUBMITTED and we haven't processed this before
    IF NEW.status != 'SUBMITTED' THEN
        RETURN NEW;
    END IF;
    
    -- Skip if already processed (check if journal entry already exists)
    IF EXISTS (
        SELECT 1 FROM journal_entries 
        WHERE reference_type = 'purchase_invoice' 
        AND reference_id = NEW.id
    ) THEN
        RAISE NOTICE 'Journal entry already exists for purchase invoice %', NEW.invoice_number;
        RETURN NEW;
    END IF;
    
    -- Skip if amount is zero or negative
    IF NEW.total_amount IS NULL OR NEW.total_amount <= 0 THEN
        RAISE NOTICE 'Skipping journal entry for purchase invoice % because total amount is not positive', NEW.invoice_number;
        RETURN NEW;
    END IF;
    
    v_amount := NEW.total_amount;
    v_company_id := NEW.company_id;
    
    -- Get default accounts from company master
    SELECT 
        default_inventory_account_id,
        default_expense_account_id,
        accounts_payable_account_id
    INTO 
        v_inventory_account_id,
        v_expense_account_id,
        v_payable_account_id
    FROM companies 
    WHERE id = v_company_id;
    
    -- Determine which debit account to use (prefer inventory, fallback to expense)
    v_debit_account_id := COALESCE(v_inventory_account_id, v_expense_account_id);
    
    -- Verify we have required accounts
    IF v_debit_account_id IS NULL THEN
        RAISE EXCEPTION 'No default inventory or expense account configured for company %. Please set default_inventory_account_id or default_expense_account_id in companies table.', v_company_id;
    END IF;
    
    IF v_payable_account_id IS NULL THEN
        RAISE EXCEPTION 'No accounts payable account configured for company %. Please set accounts_payable_account_id in companies table.', v_company_id;
    END IF;
    
    -- Generate journal number and description
    v_journal_number := 'PI-' || NEW.invoice_number;
    v_description := 'Purchase Invoice ' || NEW.invoice_number || CASE WHEN NEW.notes IS NOT NULL AND NEW.notes != '' THEN ' - ' || NEW.notes ELSE '' END;
    
    -- Create journal entry header
    INSERT INTO journal_entries (
        id, entry_number, entry_date, description, company_id, 
        reference_type, reference_id, reference_number, status,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_journal_number, NEW.invoice_date, v_description, v_company_id,
        'purchase_invoice', NEW.id, NEW.invoice_number, 'POSTED',
        NOW(), NOW()
    ) RETURNING id INTO v_journal_id;
    
    -- DEBIT: Inventory/Expense Account
    INSERT INTO journal_entry_lines (
        id, journal_entry_id, account_id, line_number,
        debit_amount, credit_amount, description, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_journal_id, v_debit_account_id, 1,
        v_amount, 0, 'Inventory/Expense - ' || v_description, NOW(), NOW()
    );
    
    -- CREDIT: Accounts Payable Account
    INSERT INTO journal_entry_lines (
        id, journal_entry_id, account_id, line_number,
        debit_amount, credit_amount, description, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_journal_id, v_payable_account_id, 2,
        0, v_amount, 'Accounts Payable - ' || v_description, NOW(), NOW()
    );
    
    RAISE NOTICE 'Created journal entry % for purchase invoice %', v_journal_number, NEW.invoice_number;
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating purchase invoice journal entry for invoice %: %', NEW.invoice_number, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. CREATE SALES INVOICE AUTO JOURNAL FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION create_sales_invoice_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_journal_id UUID;
    v_revenue_account_id UUID;
    v_receivable_account_id UUID;
    v_sales_tax_payable_account_id UUID;
    v_subtotal DECIMAL;
    v_tax_amount DECIMAL;
    v_total_amount DECIMAL;
    v_journal_number VARCHAR(50);
    v_description TEXT;
    v_company_id UUID;
    v_line_number INTEGER := 1;
BEGIN
    -- Only process when status is SUBMITTED and we haven't processed this before
    IF NEW.status != 'SUBMITTED' THEN
        RETURN NEW;
    END IF;
    
    -- Skip if already processed (check if journal entry already exists)
    IF EXISTS (
        SELECT 1 FROM journal_entries 
        WHERE reference_type = 'sales_invoice' 
        AND reference_id = NEW.id
    ) THEN
        RAISE NOTICE 'Journal entry already exists for sales invoice %', NEW.invoice_number;
        RETURN NEW;
    END IF;
    
    -- Skip if amount is zero or negative
    IF NEW.total_amount IS NULL OR NEW.total_amount <= 0 THEN
        RAISE NOTICE 'Skipping journal entry for sales invoice % because total amount is not positive', NEW.invoice_number;
        RETURN NEW;
    END IF;
    
    -- Get invoice details
    v_company_id := NEW.company_id;
    v_subtotal := COALESCE(NEW.subtotal, 0);
    v_tax_amount := COALESCE(NEW.tax_amount, 0);
    v_total_amount := NEW.total_amount;
    
    -- Get default accounts from company master
    SELECT
        default_sales_revenue_account_id,
        accounts_receivable_account_id,
        sales_tax_payable_account_id
    INTO
        v_revenue_account_id,
        v_receivable_account_id,
        v_sales_tax_payable_account_id
    FROM companies
    WHERE id = v_company_id;
    
    -- Verify we have required accounts
    IF v_revenue_account_id IS NULL THEN
        RAISE EXCEPTION 'No default sales revenue account configured for company %. Please set default_sales_revenue_account_id in companies table.', v_company_id;
    END IF;
    
    IF v_receivable_account_id IS NULL THEN
        RAISE EXCEPTION 'No default accounts receivable account configured for company %. Please set accounts_receivable_account_id in companies table.', v_company_id;
    END IF;
    
    IF v_tax_amount > 0 AND v_sales_tax_payable_account_id IS NULL THEN
        RAISE EXCEPTION 'Sales tax exists but no sales tax payable account configured for company %. Please set sales_tax_payable_account_id in companies table.', v_company_id;
    END IF;
    
    -- Generate journal number and description
    v_journal_number := 'SI-' || NEW.invoice_number;
    v_description := 'Sales Invoice ' || NEW.invoice_number || CASE WHEN NEW.notes IS NOT NULL AND NEW.notes != '' THEN ' - ' || NEW.notes ELSE '' END;
    
    -- Create journal entry header
    INSERT INTO journal_entries (
        id, entry_number, entry_date, description, company_id,
        reference_type, reference_id, reference_number, status,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_journal_number, NEW.invoice_date, v_description, v_company_id,
        'sales_invoice', NEW.id, NEW.invoice_number, 'POSTED',
        NOW(), NOW()
    ) RETURNING id INTO v_journal_id;
    
    -- 1. DEBIT: Accounts Receivable (total amount)
    INSERT INTO journal_entry_lines (
        id, journal_entry_id, account_id, line_number,
        debit_amount, credit_amount, description, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_journal_id, v_receivable_account_id, v_line_number,
        v_total_amount, 0, 'Accounts Receivable - ' || v_description, NOW(), NOW()
    );
    v_line_number := v_line_number + 1;
    
    -- 2. CREDIT: Sales Revenue Account (subtotal amount)
    -- Use subtotal if available, otherwise use total minus tax
    IF v_subtotal > 0 THEN
        INSERT INTO journal_entry_lines (
            id, journal_entry_id, account_id, line_number,
            debit_amount, credit_amount, description, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), v_journal_id, v_revenue_account_id, v_line_number,
            0, v_subtotal, 'Sales Revenue - ' || v_description, NOW(), NOW()
        );
    ELSE
        -- If no subtotal, use total minus tax
        INSERT INTO journal_entry_lines (
            id, journal_entry_id, account_id, line_number,
            debit_amount, credit_amount, description, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), v_journal_id, v_revenue_account_id, v_line_number,
            0, (v_total_amount - v_tax_amount), 'Sales Revenue - ' || v_description, NOW(), NOW()
        );
    END IF;
    v_line_number := v_line_number + 1;
    
    -- 3. CREDIT: Sales Tax Payable Account (if tax exists)
    IF v_tax_amount > 0 AND v_sales_tax_payable_account_id IS NOT NULL THEN
        INSERT INTO journal_entry_lines (
            id, journal_entry_id, account_id, line_number,
            debit_amount, credit_amount, description, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), v_journal_id, v_sales_tax_payable_account_id, v_line_number,
            0, v_tax_amount, 'Sales Tax Payable - ' || v_description, NOW(), NOW()
        );
    END IF;
    
    RAISE NOTICE 'Created journal entry % for sales invoice %', v_journal_number, NEW.invoice_number;
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating sales invoice journal entry for invoice %: %', NEW.invoice_number, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. CREATE TRIGGERS FOR AUTO JOURNAL ENTRY
-- =====================================================

-- Purchase Invoice Trigger - fires on INSERT and UPDATE when status = SUBMITTED
CREATE TRIGGER trigger_purchase_invoice_journal
    AFTER INSERT OR UPDATE ON purchase_invoices
    FOR EACH ROW
    WHEN (NEW.status = 'SUBMITTED')
    EXECUTE FUNCTION create_purchase_invoice_journal_entry();

-- Sales Invoice Trigger - fires on INSERT and UPDATE when status = SUBMITTED  
CREATE TRIGGER trigger_sales_invoice_journal
    AFTER INSERT OR UPDATE ON sales_invoices
    FOR EACH ROW
    WHEN (NEW.status = 'SUBMITTED')
    EXECUTE FUNCTION create_sales_invoice_journal_entry();

-- =====================================================
-- 5. VERIFICATION AND STATUS
-- =====================================================

-- Show success message
SELECT '=== AUTO JOURNAL ENTRY SYSTEM CREATED SUCCESSFULLY ===' as status;

-- Verify functions were created
SELECT 
    routine_name as function_name,
    routine_type,
    'Created successfully' as status
FROM information_schema.routines 
WHERE routine_name IN ('create_purchase_invoice_journal_entry', 'create_sales_invoice_journal_entry')
ORDER BY routine_name;

-- Verify triggers were created
SELECT 
    trigger_name,
    event_object_table as table_name,
    action_timing,
    event_manipulation,
    'Active' as status
FROM information_schema.triggers 
WHERE trigger_name IN ('trigger_purchase_invoice_journal', 'trigger_sales_invoice_journal')
ORDER BY trigger_name;

-- Show current company account configuration
SELECT 
    c.id as company_id,
    c.name as company_name,
    -- Purchase Invoice Accounts
    CASE WHEN c.default_inventory_account_id IS NOT NULL THEN 'SET' ELSE 'NOT SET' END as inventory_account,
    CASE WHEN c.default_expense_account_id IS NOT NULL THEN 'SET' ELSE 'NOT SET' END as expense_account,
    CASE WHEN c.accounts_payable_account_id IS NOT NULL THEN 'SET' ELSE 'NOT SET' END as payable_account,
    -- Sales Invoice Accounts  
    CASE WHEN c.default_sales_revenue_account_id IS NOT NULL THEN 'SET' ELSE 'NOT SET' END as revenue_account,
    CASE WHEN c.accounts_receivable_account_id IS NOT NULL THEN 'SET' ELSE 'NOT SET' END as receivable_account,
    CASE WHEN c.sales_tax_payable_account_id IS NOT NULL THEN 'SET' ELSE 'NOT SET' END as tax_payable_account
FROM companies c
ORDER BY c.name;

-- Instructions
SELECT '=== SYSTEM READY ===' as instruction;
SELECT 'Auto journal entries will be created when invoices are saved with SUBMITTED status' as info1;
SELECT 'Make sure to configure default accounts in companies table for each company' as info2;
SELECT 'Test by creating a purchase or sales invoice and setting status to SUBMITTED' as info3;
