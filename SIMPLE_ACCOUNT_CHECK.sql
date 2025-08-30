-- Simple check for account lookup issue
SELECT '=== JOURNAL ENTRY LINES WITH ACCOUNT IDs ===' as info;
SELECT 
    jel.id,
    jel.account_id,
    jel.description,
    jel.debit_amount,
    jel.credit_amount
FROM journal_entry_lines jel
ORDER BY jel.created_at DESC
LIMIT 5;

-- Check if these account IDs exist in chart_of_accounts
SELECT '=== CHECKING IF ACCOUNT IDs EXIST ===' as info;
SELECT 
    jel.account_id as journal_line_account_id,
    coa.id as chart_account_id,
    coa.account_name,
    CASE 
        WHEN coa.id IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ NOT FOUND'
    END as status
FROM (
    SELECT DISTINCT account_id 
    FROM journal_entry_lines 
    ORDER BY account_id
    LIMIT 10
) jel
LEFT JOIN chart_of_accounts coa ON jel.account_id = coa.id;

-- Show what accounts actually exist in chart_of_accounts
SELECT '=== ALL ACCOUNTS IN CHART_OF_ACCOUNTS ===' as info;
SELECT 
    id,
    account_name,
    account_code,
    account_type,
    company_id
FROM chart_of_accounts
ORDER BY account_name
LIMIT 10;
