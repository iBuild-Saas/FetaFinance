-- =====================================================
-- SETUP DEFAULT ACCOUNTS FOR AUTO JOURNAL ENTRY SYSTEM
-- =====================================================
-- This script helps configure default accounts in companies table
-- for automatic journal entry creation from invoices

-- =====================================================
-- 1. CHECK CURRENT SYSTEM STATUS
-- =====================================================

SELECT '=== CHECKING SYSTEM STATUS ===' as step;

-- Check if companies table has the required account fields
SELECT 
    column_name,
    data_type,
    is_nullable,
    CASE WHEN column_name LIKE '%account%' THEN '✓ Ready for auto journal' ELSE '' END as status
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name LIKE '%account%'
ORDER BY column_name;

-- Check if we have companies
SELECT 
    'Companies in system' as info,
    COUNT(*) as count
FROM companies;

-- Check if we have chart of accounts
SELECT 
    'Chart of accounts entries' as info,
    COUNT(*) as count
FROM chart_of_accounts;

-- =====================================================
-- 2. SHOW CURRENT COMPANY ACCOUNT CONFIGURATION
-- =====================================================

SELECT '=== CURRENT COMPANY ACCOUNT CONFIGURATION ===' as step;

SELECT 
    c.id,
    c.name as company_name,
    c.currency,
    -- Purchase Invoice Accounts
    COALESCE(inv.account_name, 'NOT CONFIGURED') as inventory_account,
    COALESCE(exp.account_name, 'NOT CONFIGURED') as expense_account,
    COALESCE(pay.account_name, 'NOT CONFIGURED') as payable_account,
    -- Sales Invoice Accounts
    COALESCE(rev.account_name, 'NOT CONFIGURED') as revenue_account,
    COALESCE(rec.account_name, 'NOT CONFIGURED') as receivable_account,
    COALESCE(tax.account_name, 'NOT CONFIGURED') as tax_payable_account
FROM companies c
LEFT JOIN chart_of_accounts inv ON c.default_inventory_account_id = inv.id
LEFT JOIN chart_of_accounts exp ON c.default_expense_account_id = exp.id
LEFT JOIN chart_of_accounts pay ON c.accounts_payable_account_id = pay.id
LEFT JOIN chart_of_accounts rev ON c.default_sales_revenue_account_id = rev.id
LEFT JOIN chart_of_accounts rec ON c.accounts_receivable_account_id = rec.id
LEFT JOIN chart_of_accounts tax ON c.sales_tax_payable_account_id = tax.id
ORDER BY c.name;

-- =====================================================
-- 3. SHOW AVAILABLE ACCOUNTS BY TYPE
-- =====================================================

SELECT '=== AVAILABLE ACCOUNTS FOR CONFIGURATION ===' as step;

-- Show accounts suitable for purchase invoices
SELECT 
    'PURCHASE INVOICE ACCOUNTS' as category,
    account_type,
    account_code,
    account_name,
    id as account_id,
    CASE 
        WHEN account_type IN ('ASSET', 'EXPENSE') THEN 'Good for Inventory/Expense (DR)'
        WHEN account_type = 'LIABILITY' AND account_name ILIKE '%payable%' THEN 'Good for Accounts Payable (CR)'
        ELSE 'Not recommended for purchase invoices'
    END as recommendation
FROM chart_of_accounts 
WHERE is_active = true
AND (
    account_type IN ('ASSET', 'EXPENSE', 'LIABILITY')
    AND (
        account_name ILIKE '%inventory%' OR 
        account_name ILIKE '%expense%' OR 
        account_name ILIKE '%payable%' OR
        account_name ILIKE '%purchase%'
    )
)
ORDER BY account_type, account_name;

-- Show accounts suitable for sales invoices
SELECT 
    'SALES INVOICE ACCOUNTS' as category,
    account_type,
    account_code,
    account_name,
    id as account_id,
    CASE 
        WHEN account_type = 'ASSET' AND account_name ILIKE '%receivable%' THEN 'Good for Accounts Receivable (DR)'
        WHEN account_type = 'REVENUE' THEN 'Good for Sales Revenue (CR)'
        WHEN account_type = 'LIABILITY' AND account_name ILIKE '%tax%' THEN 'Good for Sales Tax Payable (CR)'
        ELSE 'Not recommended for sales invoices'
    END as recommendation
FROM chart_of_accounts 
WHERE is_active = true
AND (
    account_type IN ('ASSET', 'REVENUE', 'LIABILITY')
    AND (
        account_name ILIKE '%receivable%' OR 
        account_name ILIKE '%revenue%' OR 
        account_name ILIKE '%sales%' OR
        account_name ILIKE '%tax%'
    )
)
ORDER BY account_type, account_name;

-- =====================================================
-- 4. CONFIGURATION INSTRUCTIONS
-- =====================================================

SELECT '=== CONFIGURATION INSTRUCTIONS ===' as step;
SELECT 'Use the account IDs from the query above to update your companies with default accounts' as instruction;
SELECT 'Example: UPDATE companies SET default_inventory_account_id = ''your-account-id-here'' WHERE id = ''your-company-id'';' as example;

-- Show template for manual configuration
SELECT '=== MANUAL CONFIGURATION TEMPLATE ===' as step;
SELECT 'Replace the UUIDs below with actual account IDs from your chart of accounts:' as note;

SELECT '
-- Example configuration for a company:
UPDATE companies 
SET 
    -- Purchase Invoice Accounts
    default_inventory_account_id = ''00000000-0000-0000-0000-000000000000'', -- Replace with Inventory account ID
    accounts_payable_account_id = ''00000000-0000-0000-0000-000000000000'',  -- Replace with Accounts Payable account ID
    
    -- Sales Invoice Accounts  
    default_sales_revenue_account_id = ''00000000-0000-0000-0000-000000000000'', -- Replace with Sales Revenue account ID
    accounts_receivable_account_id = ''00000000-0000-0000-0000-000000000000'',   -- Replace with Accounts Receivable account ID
    sales_tax_payable_account_id = ''00000000-0000-0000-0000-000000000000''      -- Replace with Sales Tax Payable account ID (optional)
    
WHERE id = ''your-company-id-here''; -- Replace with your company ID
' as configuration_template;
