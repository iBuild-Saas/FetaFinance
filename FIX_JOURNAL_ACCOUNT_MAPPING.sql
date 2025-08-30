-- Fix journal entry account mapping to use existing accounts
-- First, let's see what accounts we have available

SELECT '=== AVAILABLE ACCOUNTS ===' as info;
SELECT 
    id,
    account_name,
    account_type,
    account_code
FROM chart_of_accounts
WHERE company_id = '6e0641dd-87d3-4a47-b109-786538dc58f0'
AND (
    LOWER(account_name) LIKE '%inventory%' OR
    LOWER(account_name) LIKE '%payable%' OR
    LOWER(account_name) LIKE '%asset%' OR
    LOWER(account_name) LIKE '%liability%' OR
    account_type IN ('Asset', 'Liability')
)
ORDER BY account_type, account_name;

-- Check current journal entry lines with wrong account IDs
SELECT '=== CURRENT JOURNAL ENTRY LINES ===' as info;
SELECT 
    id,
    account_id,
    description,
    debit_amount,
    credit_amount
FROM journal_entry_lines
WHERE journal_entry_id = 'f2b151e9-4c2b-42d6-9eb5-4568df06ae6f';

-- Update journal entry lines to use existing accounts
-- We'll find the best matching accounts and update the lines

DO $$
DECLARE
    v_inventory_account_id UUID;
    v_payable_account_id UUID;
    v_line_1_id UUID;
    v_line_2_id UUID;
BEGIN
    -- Find suitable accounts
    SELECT id INTO v_inventory_account_id
    FROM chart_of_accounts
    WHERE company_id = '6e0641dd-87d3-4a47-b109-786538dc58f0'
    AND (
        LOWER(account_name) LIKE '%inventory%' OR
        account_type = 'Asset'
    )
    ORDER BY 
        CASE WHEN LOWER(account_name) LIKE '%inventory%' THEN 1 ELSE 2 END,
        account_name
    LIMIT 1;
    
    SELECT id INTO v_payable_account_id
    FROM chart_of_accounts
    WHERE company_id = '6e0641dd-87d3-4a47-b109-786538dc58f0'
    AND (
        LOWER(account_name) LIKE '%payable%' OR
        account_type = 'Liability'
    )
    ORDER BY 
        CASE WHEN LOWER(account_name) LIKE '%payable%' THEN 1 ELSE 2 END,
        account_name
    LIMIT 1;
    
    -- Get journal entry line IDs
    SELECT id INTO v_line_1_id
    FROM journal_entry_lines
    WHERE journal_entry_id = 'f2b151e9-4c2b-42d6-9eb5-4568df06ae6f'
    AND debit_amount > 0
    LIMIT 1;
    
    SELECT id INTO v_line_2_id
    FROM journal_entry_lines
    WHERE journal_entry_id = 'f2b151e9-4c2b-42d6-9eb5-4568df06ae6f'
    AND credit_amount > 0
    LIMIT 1;
    
    -- Show what we found
    RAISE NOTICE '=== ACCOUNT MAPPING ===';
    RAISE NOTICE 'Inventory Account ID: %', v_inventory_account_id;
    RAISE NOTICE 'Payable Account ID: %', v_payable_account_id;
    RAISE NOTICE 'Line 1 ID (Debit): %', v_line_1_id;
    RAISE NOTICE 'Line 2 ID (Credit): %', v_line_2_id;
    
    -- Update the journal entry lines if we found suitable accounts
    IF v_inventory_account_id IS NOT NULL AND v_line_1_id IS NOT NULL THEN
        UPDATE journal_entry_lines
        SET account_id = v_inventory_account_id
        WHERE id = v_line_1_id;
        RAISE NOTICE '✅ Updated debit line to use inventory account';
    END IF;
    
    IF v_payable_account_id IS NOT NULL AND v_line_2_id IS NOT NULL THEN
        UPDATE journal_entry_lines
        SET account_id = v_payable_account_id
        WHERE id = v_line_2_id;
        RAISE NOTICE '✅ Updated credit line to use payable account';
    END IF;
    
END $$;

-- Verify the updates
SELECT '=== UPDATED JOURNAL ENTRY LINES ===' as info;
SELECT 
    jel.id,
    jel.account_id,
    coa.account_name,
    coa.account_type,
    jel.description,
    jel.debit_amount,
    jel.credit_amount
FROM journal_entry_lines jel
LEFT JOIN chart_of_accounts coa ON jel.account_id = coa.id
WHERE jel.journal_entry_id = 'f2b151e9-4c2b-42d6-9eb5-4568df06ae6f';
