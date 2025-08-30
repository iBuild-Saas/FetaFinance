-- Fix the get_account_from_mapping function
-- This creates the function with the correct signature that the journal functions expect

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_account_from_mapping(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS get_account_from_mapping(UUID, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS get_account_from_mapping(TEXT, TEXT);

-- Create the function with the signature the journal functions expect
CREATE OR REPLACE FUNCTION get_account_from_mapping(
    p_transaction_type TEXT,
    p_account_type TEXT
) RETURNS UUID AS $$
DECLARE
    v_account_id UUID;
BEGIN
    -- For now, we'll do a simple mapping based on account names in chart_of_accounts
    -- This is a temporary solution until the full mapping system is set up
    
    IF p_transaction_type = 'purchase_invoice' THEN
        IF p_account_type = 'inventory' THEN
            -- Find an inventory account
            SELECT id INTO v_account_id
            FROM chart_of_accounts
            WHERE LOWER(account_name) LIKE '%inventory%'
            OR LOWER(account_name) LIKE '%asset%'
            LIMIT 1;
        ELSIF p_account_type = 'accounts_payable' THEN
            -- Find an accounts payable account
            SELECT id INTO v_account_id
            FROM chart_of_accounts
            WHERE LOWER(account_name) LIKE '%payable%'
            OR LOWER(account_name) LIKE '%liability%'
            LIMIT 1;
        END IF;
    ELSIF p_transaction_type = 'sales_invoice' THEN
        IF p_account_type = 'revenue' THEN
            -- Find a revenue account
            SELECT id INTO v_account_id
            FROM chart_of_accounts
            WHERE LOWER(account_name) LIKE '%revenue%'
            OR LOWER(account_name) LIKE '%sales%'
            OR LOWER(account_name) LIKE '%income%'
            LIMIT 1;
        ELSIF p_account_type = 'accounts_receivable' THEN
            -- Find an accounts receivable account
            SELECT id INTO v_account_id
            FROM chart_of_accounts
            WHERE LOWER(account_name) LIKE '%receivable%'
            OR LOWER(account_name) LIKE '%asset%'
            LIMIT 1;
        END IF;
    END IF;
    
    RETURN v_account_id;
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT 'TESTING GET_ACCOUNT_FROM_MAPPING FUNCTION' as section;

SELECT 'Testing purchase_invoice inventory account:' as test;
SELECT get_account_from_mapping('purchase_invoice', 'inventory') as inventory_account_id;

SELECT 'Testing purchase_invoice accounts_payable account:' as test;
SELECT get_account_from_mapping('purchase_invoice', 'accounts_payable') as payable_account_id;

SELECT 'Function created successfully!' as result;
