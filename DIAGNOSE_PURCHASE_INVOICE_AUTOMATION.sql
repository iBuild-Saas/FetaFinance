-- Diagnose Purchase Invoice Automation
-- This script checks why journal entries and stock movements are not being created

-- =====================================================
-- 1. CHECK TRIGGER STATUS
-- =====================================================

SELECT '=== CHECKING TRIGGER STATUS ===' as section;

-- Check if triggers exist and are enabled
SELECT 
    t.tgname as trigger_name,
    c.relname as table_name,
    CASE 
        WHEN t.tgenabled = 'O' THEN '✅ ENABLED'
        WHEN t.tgenabled = 'D' THEN '❌ DISABLED'
        WHEN t.tgenabled = 'R' THEN '⚠️ REPLICA'
        ELSE '❓ UNKNOWN'
    END as trigger_status,
    p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'purchase_invoices'
ORDER BY t.tgname;

-- =====================================================
-- 2. CHECK FUNCTION STATUS
-- =====================================================

SELECT '=== CHECKING FUNCTION STATUS ===' as section;

-- Check if functions exist
SELECT 
    function_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = f.function_name
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (VALUES 
    ('create_purchase_invoice_journal_entry'),
    ('record_purchase_invoice_stock_movement'),
    ('get_account_from_mapping')
) AS f(function_name);

-- =====================================================
-- 3. CHECK ACCOUNT MAPPINGS
-- =====================================================

SELECT '=== CHECKING ACCOUNT MAPPINGS ===' as section;

-- Check what account mappings exist
SELECT 
    am.mapping_type,
    am.mapping_name,
    am.description,
    ca.account_name,
    ca.account_code,
    ca.account_type,
    am.is_active
FROM account_mappings am
JOIN chart_of_accounts ca ON am.account_id = ca.id
WHERE am.mapping_type = 'purchase_invoice'
ORDER BY am.mapping_name;

-- =====================================================
-- 4. CHECK RECENT PURCHASE INVOICES
-- =====================================================

SELECT '=== CHECKING RECENT PURCHASE INVOICES ===' as section;

-- Show recent purchase invoices and their status
SELECT 
    id,
    invoice_number,
    status,
    company_id,
    total_amount,
    tax_amount,
    created_at,
    updated_at
FROM purchase_invoices 
ORDER BY updated_at DESC
LIMIT 5;

-- =====================================================
-- 5. CHECK JOURNAL ENTRIES
-- =====================================================

SELECT '=== CHECKING JOURNAL ENTRIES ===' as section;

-- Check if any journal entries exist
SELECT 
    COUNT(*) as total_journal_entries,
    COUNT(CASE WHEN reference_type = 'purchase_invoice' THEN 1 END) as purchase_invoice_entries
FROM journal_entries;

-- Show recent journal entries
SELECT 
    id,
    journal_number,
    reference_type,
    reference_id,
    reference_number,
    total_amount,
    created_at
FROM journal_entries 
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================
-- 6. CHECK STOCK MOVEMENTS
-- =====================================================

SELECT '=== CHECKING STOCK MOVEMENTS ===' as section;

-- Check if any stock movements exist
SELECT 
    COUNT(*) as total_stock_movements,
    COUNT(CASE WHEN reference_type = 'purchase_invoice' THEN 1 END) as purchase_invoice_movements
FROM stock_movements;

-- Show recent stock movements
SELECT 
    id,
    movement_type,
    quantity,
    reference_type,
    reference_id,
    reference_number,
    created_at
FROM stock_movements 
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================
-- 7. TEST ACCOUNT MAPPING FUNCTION
-- =====================================================

SELECT '=== TESTING ACCOUNT MAPPING FUNCTION ===' as section;

-- Test the get_account_from_mapping function
DO $$
DECLARE
    v_company_id UUID;
    v_inventory_account_id UUID;
    v_payable_account_id UUID;
    v_tax_account_id UUID;
BEGIN
    -- Get first company
    SELECT id INTO v_company_id FROM companies LIMIT 1;
    
    IF v_company_id IS NULL THEN
        RAISE NOTICE '❌ No companies found';
        RETURN;
    END IF;
    
    RAISE NOTICE '🧪 Testing account mappings for company: %', v_company_id;
    
    -- Test inventory account mapping
    v_inventory_account_id := get_account_from_mapping(v_company_id, 'purchase_invoice', 'inventory_account');
    IF v_inventory_account_id IS NULL THEN
        RAISE NOTICE '❌ No inventory account mapped';
    ELSE
        RAISE NOTICE '✅ Inventory account mapped: %', v_inventory_account_id;
    END IF;
    
    -- Test payable account mapping
    v_payable_account_id := get_account_from_mapping(v_company_id, 'purchase_invoice', 'payable_account');
    IF v_payable_account_id IS NULL THEN
        RAISE NOTICE '❌ No payable account mapped';
    ELSE
        RAISE NOTICE '✅ Payable account mapped: %', v_payable_account_id;
    END IF;
    
    -- Test tax account mapping
    v_tax_account_id := get_account_from_mapping(v_company_id, 'purchase_invoice', 'tax_receivable');
    IF v_tax_account_id IS NULL THEN
        RAISE NOTICE '❌ No tax account mapped';
    ELSE
        RAISE NOTICE '✅ Tax account mapped: %', v_tax_account_id;
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error testing account mappings: %', SQLERRM;
END $$;

-- =====================================================
-- 8. NEXT STEPS
-- =====================================================

SELECT '=== NEXT STEPS ===' as section;

SELECT 'Run this diagnostic to see what is working and what is not' as instruction;
SELECT 'Check the trigger status, function status, and account mappings' as explanation;
SELECT 'Then we can fix the specific issue identified' as next_action;
