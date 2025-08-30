-- Check Account Mappings for Journal Entries

-- === ACCOUNT MAPPINGS TABLE ===
SELECT 'ACCOUNT MAPPINGS' as section;
SELECT 
    am.id,
    am.company_id,
    -- am.transaction_type, -- Column doesn't exist
    -- am.account_type, -- Column doesn't exist
    am.account_id,
    coa.account_name,
    coa.account_type as chart_account_type
FROM account_mappings am
LEFT JOIN chart_of_accounts coa ON am.account_id = coa.id
ORDER BY am.id;

-- === TEST GET_ACCOUNT_FROM_MAPPING FUNCTION ===
SELECT 'TESTING GET_ACCOUNT_FROM_MAPPING FUNCTION' as section;

-- Test for purchase invoice accounts
SELECT 'PURCHASE INVOICE - INVENTORY ACCOUNT' as test;
SELECT get_account_from_mapping('purchase_invoice', 'inventory') as inventory_account_id;

SELECT 'PURCHASE INVOICE - ACCOUNTS PAYABLE ACCOUNT' as test;
SELECT get_account_from_mapping('purchase_invoice', 'accounts_payable') as payable_account_id;

-- === CHECK IF REQUIRED ACCOUNTS EXIST ===
SELECT 'REQUIRED ACCOUNTS CHECK' as section;
SELECT 
    'Inventory' as required_account,
    COUNT(*) as found_count,
    STRING_AGG(account_name, ', ') as account_names
FROM chart_of_accounts 
WHERE LOWER(account_name) LIKE '%inventory%'
UNION ALL
SELECT 
    'Accounts Payable' as required_account,
    COUNT(*) as found_count,
    STRING_AGG(account_name, ', ') as account_names
FROM chart_of_accounts 
WHERE LOWER(account_name) LIKE '%payable%' OR LOWER(account_name) LIKE '%liability%';
