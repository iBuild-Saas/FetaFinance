-- =====================================================
-- CHECK ACCOUNT MAPPINGS FOR AUTO JOURNAL ENTRY SYSTEM
-- =====================================================
-- This script checks if the required account mappings exist for auto journal entry creation

-- =====================================================
-- 1. CHECK ACCOUNT_MAPPINGS TABLE STATUS
-- =====================================================

SELECT '=== CHECKING ACCOUNT MAPPINGS TABLE ===' as step;

-- Check if account_mappings table exists
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'account_mappings'
    ) THEN '✅ account_mappings table EXISTS' 
    ELSE '❌ account_mappings table MISSING - Run SALES_INVOICE_JOURNAL_ENTRY_SETUP.sql first' 
    END as table_status;

-- Show table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'account_mappings'
ORDER BY ordinal_position;

-- =====================================================
-- 2. CHECK EXISTING ACCOUNT MAPPINGS BY COMPANY
-- =====================================================

SELECT '=== CURRENT ACCOUNT MAPPINGS BY COMPANY ===' as step;

-- Show all account mappings for invoice processing
SELECT 
    c.name as company_name,
    c.id as company_id,
    am.mapping_type,
    am.mapping_name,
    coa.account_code,
    coa.account_name,
    coa.account_type,
    am.is_active,
    am.description
FROM companies c
LEFT JOIN account_mappings am ON c.id = am.company_id
LEFT JOIN chart_of_accounts coa ON am.account_id = coa.id
WHERE am.mapping_type IN ('PURCHASE_INVOICE', 'SALES_INVOICE') OR am.mapping_type IS NULL
ORDER BY c.name, am.mapping_type, am.mapping_name;

-- =====================================================
-- 3. CHECK REQUIRED MAPPINGS FOR EACH COMPANY
-- =====================================================

SELECT '=== REQUIRED MAPPINGS STATUS FOR EACH COMPANY ===' as step;

-- Check purchase invoice mappings
SELECT 
    c.name as company_name,
    c.id as company_id,
    'PURCHASE_INVOICE' as invoice_type,
    CASE WHEN EXISTS (
        SELECT 1 FROM account_mappings 
        WHERE company_id = c.id 
        AND mapping_type = 'PURCHASE_INVOICE' 
        AND mapping_name IN ('inventory_account', 'expense_account')
        AND is_active = true
    ) THEN '✅ Has Inventory/Expense Account' 
    ELSE '❌ Missing Inventory/Expense Account' END as inventory_status,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM account_mappings 
        WHERE company_id = c.id 
        AND mapping_type = 'PURCHASE_INVOICE' 
        AND mapping_name = 'payable_account'
        AND is_active = true
    ) THEN '✅ Has Payable Account' 
    ELSE '❌ Missing Payable Account' END as payable_status
FROM companies c
ORDER BY c.name;

-- Check sales invoice mappings
SELECT 
    c.name as company_name,
    c.id as company_id,
    'SALES_INVOICE' as invoice_type,
    CASE WHEN EXISTS (
        SELECT 1 FROM account_mappings 
        WHERE company_id = c.id 
        AND mapping_type = 'SALES_INVOICE' 
        AND mapping_name = 'sales_account'
        AND is_active = true
    ) THEN '✅ Has Sales Revenue Account' 
    ELSE '❌ Missing Sales Revenue Account' END as revenue_status,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM account_mappings 
        WHERE company_id = c.id 
        AND mapping_type = 'SALES_INVOICE' 
        AND mapping_name = 'receivable_account'
        AND is_active = true
    ) THEN '✅ Has Receivable Account' 
    ELSE '❌ Missing Receivable Account' END as receivable_status,
    
    CASE WHEN EXISTS (
        SELECT 1 FROM account_mappings 
        WHERE company_id = c.id 
        AND mapping_type = 'SALES_INVOICE' 
        AND mapping_name = 'tax_payable_account'
        AND is_active = true
    ) THEN '✅ Has Tax Payable Account' 
    ELSE '⚠️ Missing Tax Payable Account (Optional)' END as tax_status
FROM companies c
ORDER BY c.name;

-- =====================================================
-- 4. SHOW AVAILABLE ACCOUNTS FOR MAPPING
-- =====================================================

SELECT '=== AVAILABLE ACCOUNTS FOR MAPPING ===' as step;

-- Show accounts suitable for purchase invoice mappings
SELECT 
    'PURCHASE_INVOICE_ACCOUNTS' as category,
    coa.id as account_id,
    coa.account_code,
    coa.account_name,
    coa.account_type,
    coa.company_id,
    c.name as company_name,
    CASE 
        WHEN coa.account_type IN ('ASSET', 'EXPENSE') AND 
             (coa.account_name ILIKE '%inventory%' OR coa.account_name ILIKE '%expense%' OR coa.account_name ILIKE '%purchase%')
        THEN 'Good for inventory_account mapping'
        WHEN coa.account_type = 'LIABILITY' AND coa.account_name ILIKE '%payable%'
        THEN 'Good for payable_account mapping'
        ELSE 'Not recommended for purchase invoices'
    END as recommendation
FROM chart_of_accounts coa
JOIN companies c ON coa.company_id = c.id
WHERE coa.is_active = true
AND (
    (coa.account_type IN ('ASSET', 'EXPENSE') AND 
     (coa.account_name ILIKE '%inventory%' OR coa.account_name ILIKE '%expense%' OR coa.account_name ILIKE '%purchase%'))
    OR
    (coa.account_type = 'LIABILITY' AND coa.account_name ILIKE '%payable%')
)
ORDER BY c.name, coa.account_type, coa.account_name;

-- Show accounts suitable for sales invoice mappings
SELECT 
    'SALES_INVOICE_ACCOUNTS' as category,
    coa.id as account_id,
    coa.account_code,
    coa.account_name,
    coa.account_type,
    coa.company_id,
    c.name as company_name,
    CASE 
        WHEN coa.account_type = 'ASSET' AND coa.account_name ILIKE '%receivable%'
        THEN 'Good for receivable_account mapping'
        WHEN coa.account_type = 'REVENUE' 
        THEN 'Good for sales_account mapping'
        WHEN coa.account_type = 'LIABILITY' AND coa.account_name ILIKE '%tax%'
        THEN 'Good for tax_payable_account mapping'
        ELSE 'Not recommended for sales invoices'
    END as recommendation
FROM chart_of_accounts coa
JOIN companies c ON coa.company_id = c.id
WHERE coa.is_active = true
AND (
    (coa.account_type = 'ASSET' AND coa.account_name ILIKE '%receivable%')
    OR
    (coa.account_type = 'REVENUE')
    OR
    (coa.account_type = 'LIABILITY' AND coa.account_name ILIKE '%tax%')
)
ORDER BY c.name, coa.account_type, coa.account_name;

-- =====================================================
-- 5. SAMPLE MAPPING CONFIGURATION
-- =====================================================

SELECT '=== SAMPLE MAPPING CONFIGURATION ===' as step;
SELECT 'Use the account IDs from above to create mappings like this:' as instruction;

SELECT '
-- Example: Configure mappings for a company
-- Replace the UUIDs with actual IDs from the queries above

-- Purchase Invoice Mappings
INSERT INTO account_mappings (company_id, mapping_type, mapping_name, account_id, description)
VALUES 
    (''your-company-id'', ''PURCHASE_INVOICE'', ''inventory_account'', ''your-inventory-account-id'', ''Default inventory account for purchase invoices''),
    (''your-company-id'', ''PURCHASE_INVOICE'', ''payable_account'', ''your-payable-account-id'', ''Default accounts payable account'');

-- Sales Invoice Mappings  
INSERT INTO account_mappings (company_id, mapping_type, mapping_name, account_id, description)
VALUES 
    (''your-company-id'', ''SALES_INVOICE'', ''sales_account'', ''your-revenue-account-id'', ''Default sales revenue account''),
    (''your-company-id'', ''SALES_INVOICE'', ''receivable_account'', ''your-receivable-account-id'', ''Default accounts receivable account''),
    (''your-company-id'', ''SALES_INVOICE'', ''tax_payable_account'', ''your-tax-account-id'', ''Default sales tax payable account'');
' as sample_configuration;
