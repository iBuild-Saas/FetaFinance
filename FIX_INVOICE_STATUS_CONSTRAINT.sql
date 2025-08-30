-- =====================================================
-- FIX INVOICE STATUS CONSTRAINT ERROR
-- =====================================================
-- This script fixes existing invoice status values before applying constraints

-- =====================================================
-- 1. UPDATE EXISTING SALES INVOICES
-- =====================================================

-- First, let's see what status values currently exist
SELECT 'Current sales invoice status values:' as info;
SELECT status, COUNT(*) as count
FROM sales_invoices 
GROUP BY status
ORDER BY status;

-- Update existing sales invoices to use new status values
UPDATE sales_invoices 
SET status = CASE 
    WHEN status IN ('SENT', 'PAID', 'RECEIVED', 'SUBMITTED') THEN 'SUBMITTED'
    WHEN status IN ('DRAFT', 'CANCELLED', 'OVERDUE') THEN 'DRAFT'
    ELSE 'DRAFT'  -- Default fallback
END
WHERE status NOT IN ('DRAFT', 'SUBMITTED');

-- Show updated counts
SELECT 'Updated sales invoice status values:' as info;
SELECT status, COUNT(*) as count
FROM sales_invoices 
GROUP BY status
ORDER BY status;

-- =====================================================
-- 2. UPDATE EXISTING PURCHASE INVOICES  
-- =====================================================

-- Check purchase invoice status values
SELECT 'Current purchase invoice status values:' as info;
SELECT status, COUNT(*) as count
FROM purchase_invoices 
GROUP BY status
ORDER BY status;

-- Update existing purchase invoices to use new status values
UPDATE purchase_invoices 
SET status = CASE 
    WHEN status IN ('RECEIVED', 'PAID', 'SUBMITTED') THEN 'SUBMITTED'
    WHEN status IN ('DRAFT', 'CANCELLED', 'OVERDUE') THEN 'DRAFT'
    ELSE 'DRAFT'  -- Default fallback
END
WHERE status NOT IN ('DRAFT', 'SUBMITTED');

-- Show updated counts
SELECT 'Updated purchase invoice status values:' as info;
SELECT status, COUNT(*) as count
FROM purchase_invoices 
GROUP BY status
ORDER BY status;

-- =====================================================
-- 3. NOW SAFELY APPLY THE CONSTRAINTS
-- =====================================================

-- Drop existing constraints if they exist
ALTER TABLE sales_invoices 
DROP CONSTRAINT IF EXISTS sales_invoices_status_check;

ALTER TABLE purchase_invoices 
DROP CONSTRAINT IF EXISTS purchase_invoices_status_check;

-- Apply new constraints
ALTER TABLE sales_invoices 
ADD CONSTRAINT sales_invoices_status_check 
CHECK (status IN ('DRAFT', 'SUBMITTED'));

ALTER TABLE purchase_invoices 
ADD CONSTRAINT purchase_invoices_status_check 
CHECK (status IN ('DRAFT', 'SUBMITTED'));

-- Update default status values
ALTER TABLE sales_invoices 
ALTER COLUMN status SET DEFAULT 'DRAFT';

ALTER TABLE purchase_invoices 
ALTER COLUMN status SET DEFAULT 'DRAFT';

-- =====================================================
-- 4. DROP EXISTING FUNCTIONS AND TRIGGERS
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
-- 5. CREATE SIMPLIFIED PURCHASE INVOICE FUNCTION
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
-- 6. CREATE SIMPLIFIED SALES INVOICE FUNCTION
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
-- 7. CREATE TRIGGERS
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
-- 8. VERIFICATION
-- =====================================================

-- Show final status counts
SELECT '=== FINAL STATUS VERIFICATION ===' as status;

SELECT 'Sales Invoice Status Counts:' as table_name;
SELECT status, COUNT(*) as count
FROM sales_invoices 
GROUP BY status
ORDER BY status;

SELECT 'Purchase Invoice Status Counts:' as table_name;
SELECT status, COUNT(*) as count
FROM purchase_invoices 
GROUP BY status
ORDER BY status;

-- Verify constraints were applied
SELECT 'Constraints Applied:' as info;
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name
FROM pg_constraint 
WHERE conname IN ('sales_invoices_status_check', 'purchase_invoices_status_check');

-- Verify functions were created
SELECT 'Functions Created:' as info;
SELECT 
    routine_name as function_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name IN ('create_purchase_invoice_journal_entry', 'create_sales_invoice_journal_entry')
ORDER BY routine_name;

-- Verify triggers were created
SELECT 'Triggers Created:' as info;
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_name IN ('trigger_purchase_invoice_journal', 'trigger_sales_invoice_journal')
ORDER BY trigger_name;

SELECT '=== SYSTEM READY ===' as status;
SELECT 'Invoice status values have been updated and constraints applied successfully!' as message;
SELECT 'You can now create invoices with DRAFT or SUBMITTED status.' as instruction;
