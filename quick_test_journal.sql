-- =====================================================
-- QUICK TEST JOURNAL SYSTEM
-- =====================================================
-- This script quickly tests if the journal system is working

-- 1. Check current table structure
SELECT '=== CURRENT TABLE STRUCTURE ===' as info;

SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('journal_entries', 'journal_entry_lines')
ORDER BY table_name, ordinal_position;

-- 2. Check if we have any existing journal entries
SELECT '=== EXISTING JOURNAL ENTRIES ===' as info;
SELECT COUNT(*) as total_entries FROM journal_entries;

-- 3. Check if we have any purchase invoices to test with
SELECT '=== PURCHASE INVOICES AVAILABLE ===' as info;
SELECT 
    status,
    COUNT(*) as count
FROM purchase_invoices 
GROUP BY status
ORDER BY status;

-- 4. Check if we have companies with account mappings
SELECT '=== COMPANY ACCOUNT MAPPINGS ===' as info;
SELECT 
    c.id as company_id,
    c.name as company_name,
    CASE WHEN c.default_inventory_account_id IS NOT NULL THEN '✅' ELSE '❌' END as inventory_account,
    CASE WHEN c.accounts_payable_account_id IS NOT NULL THEN '✅' ELSE '❌' END as payable_account
FROM companies c
LIMIT 5;

-- 5. Test creating a simple journal entry manually
SELECT '=== TESTING MANUAL JOURNAL ENTRY ===' as info;

-- Try to insert a test journal entry
DO $$
DECLARE
    test_company_id UUID;
    test_entry_id UUID;
BEGIN
    -- Get a company ID
    SELECT id INTO test_company_id FROM companies LIMIT 1;
    
    IF test_company_id IS NULL THEN
        RAISE NOTICE 'No companies found to test with';
        RETURN;
    END IF;
    
    -- Try to insert a test entry
    INSERT INTO journal_entries (
        id, company_id, entry_number, entry_date, reference, memo, status,
        total_debit, total_credit, is_balanced, is_active,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), test_company_id, 'TEST-001', CURRENT_DATE,
        'test:manual', 'Test journal entry', 'POSTED',
        100.00, 100.00, true, true,
        NOW(), NOW()
    ) RETURNING id INTO test_entry_id;
    
    RAISE NOTICE 'Successfully created test journal entry with ID: %', test_entry_id;
    
    -- Clean up test entry
    DELETE FROM journal_entries WHERE id = test_entry_id;
    RAISE NOTICE 'Test entry cleaned up';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating test journal entry: %', SQLERRM;
END $$;

SELECT '=== TEST COMPLETE ===' as info;



