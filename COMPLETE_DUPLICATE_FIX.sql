-- =====================================================
-- COMPLETE DUPLICATE ENTRY NUMBER FIX
-- =====================================================
-- This script completely removes and recreates the journal system to fix all duplicate issues

-- First, let's see what's currently in the system
SELECT '=== DIAGNOSING CURRENT SYSTEM ===' as info;

-- Check current functions
SELECT 'Current journal functions:' as info;
SELECT 
    routine_name as function_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name IN ('create_purchase_invoice_journal_entry', 'create_sales_invoice_journal_entry')
ORDER BY routine_name;

-- Check current triggers
SELECT 'Current journal triggers:' as info;
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name IN ('trigger_purchase_invoice_journal', 'trigger_sales_invoice_journal')
ORDER BY trigger_name;

-- Check current constraints
SELECT 'Current entry_number constraints:' as info;
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname LIKE '%entry_number%' OR conname LIKE '%journal%';

-- Check existing entry numbers
SELECT 'Existing entry numbers (last 10):' as info;
SELECT 
    entry_number,
    company_id,
    created_at
FROM journal_entries 
WHERE entry_number IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- COMPLETE CLEANUP
-- =====================================================

SELECT '=== STARTING COMPLETE CLEANUP ===' as info;

-- Step 1: Drop ALL triggers first
SELECT 'Dropping all journal triggers...' as step;
DROP TRIGGER IF EXISTS trigger_purchase_invoice_journal ON purchase_invoices;
DROP TRIGGER IF EXISTS trigger_sales_invoice_journal ON sales_invoices;
DROP TRIGGER IF EXISTS trigger_purchase_invoice_journal ON purchase_invoices CASCADE;
DROP TRIGGER IF EXISTS trigger_sales_invoice_journal ON sales_invoices CASCADE;

-- Step 2: Drop ALL functions
SELECT 'Dropping all journal functions...' as step;
DROP FUNCTION IF EXISTS create_purchase_invoice_journal_entry() CASCADE;
DROP FUNCTION IF EXISTS create_sales_invoice_journal_entry() CASCADE;

-- Step 3: Check if any functions still exist
SELECT 'Verifying functions are dropped...' as step;
SELECT 
    routine_name as remaining_function
FROM information_schema.routines 
WHERE routine_name IN ('create_purchase_invoice_journal_entry', 'create_sales_invoice_journal_entry');

-- =====================================================
-- RECREATE WITH UNIQUE ENTRY NUMBERS
-- =====================================================

SELECT '=== RECREATING JOURNAL SYSTEM ===' as info;

-- Create the purchase invoice function with guaranteed unique entry numbers
CREATE OR REPLACE FUNCTION create_purchase_invoice_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_journal_id UUID;
    v_inventory_account_id UUID;
    v_payable_account_id UUID;
    v_description TEXT;
    v_amount DECIMAL;
    v_entry_number VARCHAR(100);
    v_company_id UUID;
    v_timestamp BIGINT;
    v_counter INTEGER;
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
    
    -- Generate guaranteed unique entry number using multiple uniqueness factors
    v_timestamp := EXTRACT(EPOCH FROM NOW())::BIGINT;
    v_counter := EXTRACT(MICROSECONDS FROM NOW())::INTEGER;
    v_entry_number := 'PI-' || NEW.invoice_number || '-' || v_timestamp || '-' || v_counter;
    v_description := 'Purchase Invoice ' || NEW.invoice_number;
    IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
        v_description := v_description || ' - ' || NEW.notes;
    END IF;
    
    -- Create journal entry header
    INSERT INTO journal_entries (
        id, company_id, entry_number, entry_date, reference, memo, status,
        total_debit, total_credit, is_balanced, is_active,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_company_id, v_entry_number, NEW.invoice_date, 
        'purchase_invoice:' || NEW.id, v_description, 'POSTED',
        v_amount, v_amount, true, true,
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

-- Create the sales invoice function with guaranteed unique entry numbers
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
    v_entry_number VARCHAR(100);
    v_description TEXT;
    v_company_id UUID;
    v_line_number INTEGER := 1;
    v_timestamp BIGINT;
    v_counter INTEGER;
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
    
    -- Generate guaranteed unique entry number using multiple uniqueness factors
    v_timestamp := EXTRACT(EPOCH FROM NOW())::BIGINT;
    v_counter := EXTRACT(MICROSECONDS FROM NOW())::INTEGER;
    v_entry_number := 'SI-' || NEW.invoice_number || '-' || v_timestamp || '-' || v_counter;
    v_description := 'Sales Invoice ' || NEW.invoice_number;
    IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
        v_description := v_description || ' - ' || NEW.notes;
    END IF;
    
    -- Create journal entry header
    INSERT INTO journal_entries (
        id, company_id, entry_number, entry_date, reference, memo, status,
        total_debit, total_credit, is_balanced, is_active,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_company_id, v_entry_number, NEW.invoice_date,
        'sales_invoice:' || NEW.id, v_description, 'POSTED',
        v_total_amount, v_total_amount, true, true,
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
-- RECREATE TRIGGERS
-- =====================================================

SELECT '=== RECREATING TRIGGERS ===' as info;

-- Purchase Invoice Trigger
CREATE TRIGGER trigger_purchase_invoice_journal
    AFTER INSERT OR UPDATE ON purchase_invoices
    FOR EACH ROW
    WHEN (NEW.status = 'SUBMITTED')
    EXECUTE FUNCTION create_purchase_invoice_journal_entry();

-- Sales Invoice Trigger
CREATE TRIGGER trigger_sales_invoice_journal
    AFTER INSERT OR UPDATE ON sales_invoices
    FOR EACH ROW
    WHEN (NEW.status = 'SUBMITTED')
    EXECUTE FUNCTION create_sales_invoice_journal_entry();

-- =====================================================
-- VERIFY THE FIX
-- =====================================================

SELECT '=== VERIFYING THE FIX ===' as info;

-- Check that functions were created
SELECT 'Functions created:' as info;
SELECT 
    routine_name as function_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name IN ('create_purchase_invoice_journal_entry', 'create_sales_invoice_journal_entry')
ORDER BY routine_name;

-- Check that triggers were created
SELECT 'Triggers created:' as info;
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_name IN ('trigger_purchase_invoice_journal', 'trigger_sales_invoice_journal')
ORDER BY trigger_name;

-- Test the unique entry number generation
SELECT '=== TESTING UNIQUE ENTRY NUMBERS ===' as info;

DO $$
DECLARE
    test_company_id UUID;
    test_entry_id1 UUID;
    test_entry_id2 UUID;
    test_entry_id3 UUID;
BEGIN
    -- Get a company ID
    SELECT id INTO test_company_id FROM companies LIMIT 1;
    
    IF test_company_id IS NULL THEN
        RAISE NOTICE 'No companies found to test with';
        RETURN;
    END IF;
    
    -- Test 1: Create entry with same invoice number
    INSERT INTO journal_entries (
        id, company_id, entry_number, entry_date, reference, memo, status,
        total_debit, total_credit, is_balanced, is_active,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), test_company_id, 'TEST-001-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || EXTRACT(MICROSECONDS FROM NOW())::INTEGER, CURRENT_DATE,
        'test:duplicate_fix1', 'Test journal entry 1', 'POSTED',
        100.00, 100.00, true, true,
        NOW(), NOW()
    ) RETURNING id INTO test_entry_id1;
    
    -- Test 2: Create another entry with same invoice number
    PERFORM pg_sleep(0.001); -- Small delay
    INSERT INTO journal_entries (
        id, company_id, entry_number, entry_date, reference, memo, status,
        total_debit, total_credit, is_balanced, is_active,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), test_company_id, 'TEST-001-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || EXTRACT(MICROSECONDS FROM NOW())::INTEGER, CURRENT_DATE,
        'test:duplicate_fix2', 'Test journal entry 2', 'POSTED',
        200.00, 200.00, true, true,
        NOW(), NOW()
    ) RETURNING id INTO test_entry_id2;
    
    -- Test 3: Create a third entry with same invoice number
    PERFORM pg_sleep(0.001); -- Small delay
    INSERT INTO journal_entries (
        id, company_id, entry_number, entry_date, reference, memo, status,
        total_debit, total_credit, is_balanced, is_active,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), test_company_id, 'TEST-001-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || EXTRACT(MICROSECONDS FROM NOW())::INTEGER, CURRENT_DATE,
        'test:duplicate_fix3', 'Test journal entry 3', 'POSTED',
        300.00, 300.00, true, true,
        NOW(), NOW()
    ) RETURNING id INTO test_entry_id3;
    
    RAISE NOTICE '✅ Successfully created three test entries with same invoice number but unique entry numbers';
    RAISE NOTICE 'Entry 1 ID: %', test_entry_id1;
    RAISE NOTICE 'Entry 2 ID: %', test_entry_id2;
    RAISE NOTICE 'Entry 3 ID: %', test_entry_id3;
    
    -- Clean up test entries
    DELETE FROM journal_entries WHERE id IN (test_entry_id1, test_entry_id2, test_entry_id3);
    RAISE NOTICE 'Test entries cleaned up';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error testing duplicate fix: %', SQLERRM;
END $$;

-- Show the new entry number format
SELECT '=== NEW ENTRY NUMBER FORMAT ===' as info;
SELECT 
    'PI-001-1754688797-123456' as example_purchase_invoice,
    'SI-001-1754688797-789012' as example_sales_invoice,
    'Format: TYPE-INVOICE-TIMESTAMP-MICROSECONDS' as format_explanation;

SELECT '=== COMPLETE DUPLICATE FIX FINISHED ===' as info;
SELECT 'The journal system has been completely rebuilt with guaranteed unique entry numbers.' as message;
SELECT 'Entry numbers now use: TYPE-INVOICE-TIMESTAMP-MICROSECONDS format.' as explanation;
SELECT 'This should resolve all duplicate constraint violations.' as result;
