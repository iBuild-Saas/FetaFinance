-- =====================================================
-- TEST SALES INVOICE JOURNAL ENTRY SYSTEM
-- =====================================================
-- This script tests the sales invoice journal entry system

-- =====================================================
-- 1. VERIFY CURRENT SETUP
-- =====================================================

SELECT '=== VERIFYING CURRENT SETUP ===' as section;

-- Check if functions exist
SELECT 'Functions exist:' as info,
    EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'create_sales_invoice_journal_entry') as sales_function_exists,
    EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'create_purchase_invoice_journal_entry') as purchase_function_exists;

-- Check if triggers exist
SELECT 'Triggers exist:' as info,
    COUNT(*) FILTER (WHERE trigger_name = 'trigger_sales_invoice_journal') as sales_trigger_count,
    COUNT(*) FILTER (WHERE trigger_name = 'trigger_purchase_invoice_journal') as purchase_trigger_count
FROM information_schema.triggers 
WHERE trigger_name IN ('trigger_sales_invoice_journal', 'trigger_purchase_invoice_journal');

-- Check if required tables exist
SELECT 'Tables exist:' as info,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_invoices') as sales_invoices_exists,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_invoices') as purchase_invoices_exists,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entries') as journal_entries_exists,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entry_lines') as journal_entry_lines_exists,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'account_mappings') as account_mappings_exists;

-- =====================================================
-- 2. CHECK ACCOUNT MAPPINGS
-- =====================================================

SELECT '=== CHECKING ACCOUNT MAPPINGS ===' as section;

-- Show account mappings for sales invoices
SELECT 'Sales Invoice Account Mappings:' as info,
    am.mapping_type,
    am.mapping_name,
    ca.account_name,
    ca.account_code,
    ca.account_type,
    am.is_active
FROM account_mappings am
JOIN chart_of_accounts ca ON am.account_id = ca.id
WHERE am.mapping_type = 'SALES_INVOICE'
ORDER BY am.mapping_name;

-- Show account mappings for purchase invoices
SELECT 'Purchase Invoice Account Mappings:' as info,
    am.mapping_type,
    am.mapping_name,
    ca.account_name,
    ca.account_code,
    ca.account_type,
    am.is_active
FROM account_mappings am
JOIN chart_of_accounts ca ON am.account_id = ca.id
WHERE am.mapping_type = 'PURCHASE_INVOICE'
ORDER BY am.mapping_name;

-- =====================================================
-- 3. CHECK COMPANY DEFAULT ACCOUNTS
-- =====================================================

SELECT '=== CHECKING COMPANY DEFAULT ACCOUNTS ===' as section;

-- Show company default accounts
SELECT 'Company Default Accounts:' as info,
    c.name as company_name,
    COALESCE(rev.account_name, 'NOT SET') as sales_revenue_account,
    COALESCE(rec.account_name, 'NOT SET') as receivable_account,
    COALESCE(tax.account_name, 'NOT SET') as tax_payable_account,
    COALESCE(inv.account_name, 'NOT SET') as inventory_account,
    COALESCE(pay.account_name, 'NOT SET') as payable_account
FROM companies c
LEFT JOIN chart_of_accounts rev ON c.default_sales_revenue_account_id = rev.id
LEFT JOIN chart_of_accounts rec ON c.accounts_receivable_account_id = rec.id
LEFT JOIN chart_of_accounts tax ON c.sales_tax_payable_account_id = tax.id
LEFT JOIN chart_of_accounts inv ON c.default_inventory_account_id = inv.id
LEFT JOIN chart_of_accounts pay ON c.accounts_payable_account_id = pay.id
ORDER BY c.name;

-- =====================================================
-- 4. TEST DATA CREATION
-- =====================================================

SELECT '=== CREATING TEST DATA ===' as section;

-- Check if we have test data to work with
SELECT 'Existing data count:' as info,
    COUNT(*) as companies_count,
    (SELECT COUNT(*) FROM customers) as customers_count,
    (SELECT COUNT(*) FROM chart_of_accounts) as accounts_count,
    (SELECT COUNT(*) FROM sales_invoices) as sales_invoices_count,
    (SELECT COUNT(*) FROM purchase_invoices) as purchase_invoices_count;

-- =====================================================
-- 5. TEST SALES INVOICE JOURNAL ENTRY
-- =====================================================

SELECT '=== TESTING SALES INVOICE JOURNAL ENTRY ===' as section;

-- Create a test sales invoice if none exist
DO $$
DECLARE
    v_company_id UUID;
    v_customer_id UUID;
    v_invoice_id UUID;
    v_journal_count_before INTEGER;
    v_journal_count_after INTEGER;
BEGIN
    -- Get first company and customer
    SELECT id INTO v_company_id FROM companies LIMIT 1;
    SELECT id INTO v_customer_id FROM customers LIMIT 1;
    
    IF v_company_id IS NULL THEN
        RAISE NOTICE 'No companies found - cannot create test invoice';
        RETURN;
    END IF;
    
    IF v_customer_id IS NULL THEN
        RAISE NOTICE 'No customers found - cannot create test invoice';
        RETURN;
    END IF;
    
    -- Check journal entries before
    SELECT COUNT(*) INTO v_journal_count_before
    FROM journal_entries 
    WHERE reference LIKE 'sales_invoice:%';
    
    RAISE NOTICE 'Journal entries before test: %', v_journal_count_before;
    
    -- Create test sales invoice
    INSERT INTO sales_invoices (
        invoice_number,
        customer_id,
        company_id,
        invoice_date,
        due_date,
        status,
        subtotal,
        tax_amount,
        discount_amount,
        total_amount,
        currency,
        payment_terms,
        notes
    ) VALUES (
        'TEST-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-001',
        v_customer_id,
        v_company_id,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '30 days',
        'DRAFT', -- Start as DRAFT
        1000.00,
        100.00,
        0.00,
        1100.00,
        'USD',
        'Net 30',
        'Test invoice for journal entry testing'
    ) RETURNING id INTO v_invoice_id;
    
    RAISE NOTICE 'Created test sales invoice: %', v_invoice_id;
    
    -- Update status to SUBMITTED to trigger journal entry
    UPDATE sales_invoices 
    SET status = 'SUBMITTED'
    WHERE id = v_invoice_id;
    
    RAISE NOTICE 'Updated invoice status to SUBMITTED';
    
    -- Check journal entries after
    SELECT COUNT(*) INTO v_journal_count_after
    FROM journal_entries 
    WHERE reference LIKE 'sales_invoice:%';
    
    RAISE NOTICE 'Journal entries after test: %', v_journal_count_after;
    
    IF v_journal_count_after > v_journal_count_before THEN
        RAISE NOTICE '✅ SUCCESS: Journal entry was created automatically';
    ELSE
        RAISE NOTICE '❌ FAILURE: No journal entry was created';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERROR creating test invoice: %', SQLERRM;
END $$;

-- =====================================================
-- 6. VERIFY JOURNAL ENTRIES
-- =====================================================

SELECT '=== VERIFYING JOURNAL ENTRIES ===' as section;

-- Show recent journal entries
SELECT 'Recent Journal Entries:' as info,
    je.entry_number,
    je.entry_date,
    je.reference,
    je.memo,
    je.status,
    je.total_debit,
    je.total_credit,
    je.is_balanced
FROM journal_entries je
WHERE je.reference LIKE 'sales_invoice:%'
ORDER BY je.created_at DESC
LIMIT 5;

-- Show journal entry lines for the most recent sales invoice entry
SELECT 'Journal Entry Lines:' as info,
    jel.line_number,
    ca.account_name,
    ca.account_code,
    jel.debit_amount,
    jel.credit_amount,
    jel.description
FROM journal_entries je
JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
JOIN chart_of_accounts ca ON jel.account_id = ca.id
WHERE je.reference LIKE 'sales_invoice:%'
ORDER BY je.created_at DESC, jel.line_number
LIMIT 10;

-- =====================================================
-- 7. TEST PURCHASE INVOICE JOURNAL ENTRY
-- =====================================================

SELECT '=== TESTING PURCHASE INVOICE JOURNAL ENTRY ===' as section;

-- Create a test purchase invoice if none exist
DO $$
DECLARE
    v_company_id UUID;
    v_supplier_id UUID;
    v_invoice_id UUID;
    v_journal_count_before INTEGER;
    v_journal_count_after INTEGER;
BEGIN
    -- Get first company and supplier
    SELECT id INTO v_company_id FROM companies LIMIT 1;
    SELECT id INTO v_supplier_id FROM suppliers LIMIT 1;
    
    IF v_company_id IS NULL THEN
        RAISE NOTICE 'No companies found - cannot create test purchase invoice';
        RETURN;
    END IF;
    
    IF v_supplier_id IS NULL THEN
        RAISE NOTICE 'No suppliers found - cannot create test purchase invoice';
        RETURN;
    END IF;
    
    -- Check journal entries before
    SELECT COUNT(*) INTO v_journal_count_before
    FROM journal_entries 
    WHERE reference LIKE 'purchase_invoice:%';
    
    RAISE NOTICE 'Purchase invoice journal entries before test: %', v_journal_count_before;
    
    -- Create test purchase invoice
    INSERT INTO purchase_invoices (
        invoice_number,
        supplier_id,
        company_id,
        invoice_date,
        due_date,
        status,
        subtotal,
        tax_amount,
        discount_amount,
        total_amount,
        currency,
        payment_terms,
        notes
    ) VALUES (
        'TEST-PI-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-001',
        v_supplier_id,
        v_company_id,
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '30 days',
        'DRAFT', -- Start as DRAFT
        500.00,
        50.00,
        0.00,
        550.00,
        'USD',
        'Net 30',
        'Test purchase invoice for journal entry testing'
    ) RETURNING id INTO v_invoice_id;
    
    RAISE NOTICE 'Created test purchase invoice: %', v_invoice_id;
    
    -- Update status to SUBMITTED to trigger journal entry
    UPDATE purchase_invoices 
    SET status = 'SUBMITTED'
    WHERE id = v_invoice_id;
    
    RAISE NOTICE 'Updated purchase invoice status to SUBMITTED';
    
    -- Check journal entries after
    SELECT COUNT(*) INTO v_journal_count_after
    FROM journal_entries 
    WHERE reference LIKE 'purchase_invoice:%';
    
    RAISE NOTICE 'Purchase invoice journal entries after test: %', v_journal_count_after;
    
    IF v_journal_count_after > v_journal_count_before THEN
        RAISE NOTICE '✅ SUCCESS: Purchase invoice journal entry was created automatically';
    ELSE
        RAISE NOTICE '❌ FAILURE: No purchase invoice journal entry was created';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ ERROR creating test purchase invoice: %', SQLERRM;
END $$;

-- =====================================================
-- 8. FINAL VERIFICATION
-- =====================================================

SELECT '=== FINAL VERIFICATION ===' as section;

-- Show all journal entries created during testing
SELECT 'All Test Journal Entries:' as info,
    je.entry_number,
    je.entry_date,
    je.reference,
    je.memo,
    je.status,
    je.total_debit,
    je.total_credit,
    je.is_balanced,
    je.created_at
FROM journal_entries je
WHERE je.reference LIKE '%TEST%'
   OR je.created_at >= CURRENT_DATE
ORDER BY je.created_at DESC;

-- Show summary of journal entries by type
SELECT 'Journal Entries Summary:' as info,
    CASE 
        WHEN je.reference LIKE 'sales_invoice:%' THEN 'Sales Invoice'
        WHEN je.reference LIKE 'purchase_invoice:%' THEN 'Purchase Invoice'
        ELSE 'Other'
    END as entry_type,
    COUNT(*) as entry_count,
    SUM(je.total_debit) as total_debits,
    SUM(je.total_credit) as total_credits
FROM journal_entries je
WHERE je.reference LIKE '%invoice:%'
GROUP BY 
    CASE 
        WHEN je.reference LIKE 'sales_invoice:%' THEN 'Sales Invoice'
        WHEN je.reference LIKE 'purchase_invoice:%' THEN 'Purchase Invoice'
        ELSE 'Other'
    END
ORDER BY entry_type;

SELECT '=== TESTING COMPLETE ===' as status;
