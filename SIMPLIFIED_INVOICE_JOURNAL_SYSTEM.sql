-- =====================================================
-- SIMPLIFIED INVOICE JOURNAL SYSTEM
-- =====================================================
-- This script simplifies the invoice system to use only DRAFT/SUBMITTED status
-- and creates journal entries automatically when invoices are saved as SUBMITTED
-- Uses company default accounts for all journal entries

-- =====================================================
-- 1. UPDATE DATABASE CONSTRAINTS
-- =====================================================

-- Update sales invoice status constraint
ALTER TABLE sales_invoices 
DROP CONSTRAINT IF EXISTS sales_invoices_status_check;

ALTER TABLE sales_invoices 
ADD CONSTRAINT sales_invoices_status_check 
CHECK (status IN ('DRAFT', 'SUBMITTED'));

-- Update purchase invoice status constraint  
ALTER TABLE purchase_invoices 
DROP CONSTRAINT IF EXISTS purchase_invoices_status_check;

ALTER TABLE purchase_invoices 
ADD CONSTRAINT purchase_invoices_status_check 
CHECK (status IN ('DRAFT', 'SUBMITTED'));

-- Update default status values
ALTER TABLE sales_invoices 
ALTER COLUMN status SET DEFAULT 'DRAFT';

ALTER TABLE purchase_invoices 
ALTER COLUMN status SET DEFAULT 'DRAFT';

-- =====================================================
-- 2. DROP EXISTING FUNCTIONS AND TRIGGERS
-- =====================================================

-- Drop existing sales invoice triggers and functions
DROP TRIGGER IF EXISTS trigger_sales_invoice_journal ON sales_invoices;
DROP TRIGGER IF EXISTS trigger_sales_stock_movement ON sales_invoices;
DROP FUNCTION IF EXISTS create_sales_invoice_journal_entry();
DROP FUNCTION IF EXISTS create_sales_stock_movement();

-- Drop existing purchase invoice triggers and functions
DROP TRIGGER IF EXISTS trigger_purchase_invoice_journal ON purchase_invoices;
DROP FUNCTION IF EXISTS create_purchase_invoice_journal_entry();

-- =====================================================
-- 3. CREATE SIMPLIFIED PURCHASE INVOICE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION create_purchase_invoice_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_journal_id UUID;
    v_inventory_account_id UUID;
    v_payable_account_id UUID;
    v_description TEXT;
    v_amount DECIMAL;
    v_journal_number VARCHAR(50);
    v_company_id UUID;
BEGIN
    -- Only process when status is SUBMITTED
    IF NEW.status != 'SUBMITTED' THEN
        RETURN NEW;
    END IF;
    
    -- Skip if amount is zero or negative
    IF NEW.total_amount IS NULL OR NEW.total_amount <= 0 THEN
        RAISE NOTICE 'Skipping journal entry for purchase invoice % because total amount is not positive', NEW.invoice_number;
        RETURN NEW;
    END IF;
    
    v_amount := NEW.total_amount;
    v_company_id := NEW.company_id;
    
    -- Get accounts from company default fields
    SELECT 
        default_inventory_account_id,
        accounts_payable_account_id
    INTO 
        v_inventory_account_id,
        v_payable_account_id
    FROM companies 
    WHERE id = v_company_id;
    
    -- Verify we have both accounts
    IF v_inventory_account_id IS NULL THEN
        RAISE EXCEPTION 'No Default Inventory/Expense account configured for company %', v_company_id;
    END IF;
    
    IF v_payable_account_id IS NULL THEN
        RAISE EXCEPTION 'No Accounts Payable account configured for company %', v_company_id;
    END IF;
    
    -- Generate journal number
    v_journal_number := 'PI-' || NEW.invoice_number;
    v_description := 'Purchase Invoice ' || NEW.invoice_number || ' - ' || COALESCE(NEW.notes, '');
    
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
        gen_random_uuid(), v_journal_id, v_inventory_account_id, 1,
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
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating purchase invoice journal entry: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. CREATE SIMPLIFIED SALES INVOICE FUNCTION
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
    -- Only process when status is SUBMITTED
    IF NEW.status != 'SUBMITTED' THEN
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
    
    -- Get accounts from company defaults
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
    
    -- Check if we have the required accounts
    IF v_revenue_account_id IS NULL THEN
        RAISE EXCEPTION 'No default sales revenue account configured for company %', v_company_id;
    END IF;
    
    IF v_receivable_account_id IS NULL THEN
        RAISE EXCEPTION 'No default accounts receivable account configured for company %', v_company_id;
    END IF;
    
    IF v_tax_amount > 0 AND v_sales_tax_payable_account_id IS NULL THEN
        RAISE EXCEPTION 'Sales tax exists but no sales tax payable account configured for company %', v_company_id;
    END IF;
    
    -- Generate journal number and description
    v_journal_number := 'SI-' || NEW.invoice_number;
    v_description := 'Sales Invoice ' || NEW.invoice_number || ' - ' || COALESCE(NEW.notes, '');
    
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
    
    -- 2. CREDIT: Sales Revenue Account (subtotal)
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
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating sales invoice journal entry: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. CREATE TRIGGERS
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
-- 6. VERIFICATION AND CLEANUP
-- =====================================================

-- Show success message
SELECT '=== SIMPLIFIED INVOICE SYSTEM CREATED ===' as status;

-- Verify functions were created
SELECT 
    routine_name as function_name,
    routine_type,
    created
FROM information_schema.routines 
WHERE routine_name IN ('create_purchase_invoice_journal_entry', 'create_sales_invoice_journal_entry')
ORDER BY routine_name;

-- Verify triggers were created
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_name IN ('trigger_purchase_invoice_journal', 'trigger_sales_invoice_journal')
ORDER BY trigger_name;

-- Show company account mappings
SELECT 
    c.id as company_id,
    c.name as company_name,
    -- Purchase Invoice Accounts
    inv.account_code as inventory_account_code,
    inv.account_name as inventory_account_name,
    pay.account_code as payable_account_code,
    pay.account_name as payable_account_name,
    -- Sales Invoice Accounts  
    rev.account_code as revenue_account_code,
    rev.account_name as revenue_account_name,
    rec.account_code as receivable_account_code,
    rec.account_name as receivable_account_name,
    tax.account_code as tax_payable_account_code,
    tax.account_name as tax_payable_account_name
FROM companies c
LEFT JOIN chart_of_accounts inv ON c.default_inventory_account_id = inv.id
LEFT JOIN chart_of_accounts pay ON c.accounts_payable_account_id = pay.id
LEFT JOIN chart_of_accounts rev ON c.default_sales_revenue_account_id = rev.id
LEFT JOIN chart_of_accounts rec ON c.accounts_receivable_account_id = rec.id
LEFT JOIN chart_of_accounts tax ON c.sales_tax_payable_account_id = tax.id
ORDER BY c.name;

-- Instructions
SELECT '=== NEXT STEPS ===' as instruction;
SELECT 'Update your UI to only show DRAFT and SUBMITTED status options' as step1;
SELECT 'Test creating invoices with SUBMITTED status to verify journal entries' as step2;
SELECT 'Journal entries will be created automatically when invoices are saved as SUBMITTED' as step3;
