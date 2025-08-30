-- Check accounts used in journal entries
SELECT '=== ACCOUNTS USED IN JOURNAL ENTRIES ===' as info;

-- Check the specific accounts used in the journal entry lines
SELECT 
    jel.account_id,
    jel.description as line_description,
    jel.debit_amount,
    jel.credit_amount
FROM journal_entry_lines jel
WHERE jel.journal_entry_id = 'f2b151e9-4c2b-42d6-9eb5-4568df06ae6f';

-- Check if these accounts exist in chart_of_accounts
SELECT '=== CHECKING IF ACCOUNTS EXIST ===' as info;
SELECT 
    'Inventory Account' as account_type,
    'f6d5ac71-2982-45ea-9cdd-580f754dac82' as required_id,
    CASE 
        WHEN EXISTS(SELECT 1 FROM chart_of_accounts WHERE id = 'f6d5ac71-2982-45ea-9cdd-580f754dac82') 
        THEN '✅ EXISTS' 
        ELSE '❌ NOT FOUND' 
    END as status;

SELECT 
    'Accounts Payable Account' as account_type,
    '8639984d-2a7c-4124-95fd-11a76e5653b7' as required_id,
    CASE 
        WHEN EXISTS(SELECT 1 FROM chart_of_accounts WHERE id = '8639984d-2a7c-4124-95fd-11a76e5653b7') 
        THEN '✅ EXISTS' 
        ELSE '❌ NOT FOUND' 
    END as status;

-- Show the actual account details if they exist
SELECT '=== ACCOUNT DETAILS ===' as info;
SELECT 
    id,
    account_name,
    account_code,
    account_type,
    is_active,
    is_group,
    company_id
FROM chart_of_accounts 
WHERE id IN ('f6d5ac71-2982-45ea-9cdd-580f754dac82', '8639984d-2a7c-4124-95fd-11a76e5653b7');

-- Show all accounts in the company to see what's available
SELECT '=== ALL ACCOUNTS IN COMPANY ===' as info;
SELECT 
    id,
    account_name,
    account_code,
    account_type,
    is_active,
    is_group,
    company_id
FROM chart_of_accounts 
WHERE company_id = '6e0641dd-87d3-4a47-b109-786538dc58f0'
ORDER BY account_type, account_name;

-- Check specifically for accounts that might match our patterns
SELECT '=== CHECKING FOR INVENTORY ACCOUNTS ===' as info;
SELECT 
    id,
    account_name,
    account_code,
    account_type
FROM chart_of_accounts 
WHERE company_id = '6e0641dd-87d3-4a47-b109-786538dc58f0'
AND (
    LOWER(account_name) LIKE '%inventory%' OR 
    LOWER(account_name) LIKE '%stock%' OR
    account_type = 'Asset'
)
ORDER BY account_name;

SELECT '=== CHECKING FOR PAYABLE ACCOUNTS ===' as info;
SELECT 
    id,
    account_name,
    account_code,
    account_type
FROM chart_of_accounts 
WHERE company_id = '6e0641dd-87d3-4a47-b109-786538dc58f0'
AND (
    LOWER(account_name) LIKE '%payable%' OR 
    LOWER(account_name) LIKE '%liability%' OR
    account_type = 'Liability'
)
ORDER BY account_name;
