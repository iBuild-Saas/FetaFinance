-- Fix account ledger function for frontend

-- Drop existing problematic function
DROP FUNCTION IF EXISTS get_account_ledger(UUID, UUID, DATE, DATE);
DROP FUNCTION IF EXISTS get_account_ledger(UUID, UUID);
DROP FUNCTION IF EXISTS get_account_ledger;

-- Create working account ledger function
CREATE OR REPLACE FUNCTION get_account_ledger(
    p_account_id UUID,
    p_company_id UUID,
    p_start_date DATE DEFAULT '2023-01-01',
    p_end_date DATE DEFAULT '2025-12-31'
)
RETURNS TABLE (
    entry_date DATE,
    entry_number VARCHAR,
    description TEXT,
    debit_amount NUMERIC,
    credit_amount NUMERIC,
    running_balance NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        je.entry_date,
        je.entry_number,
        COALESCE(jel.description, je.description) as description,
        COALESCE(jel.debit_amount, 0) as debit_amount,
        COALESCE(jel.credit_amount, 0) as credit_amount,
        SUM(COALESCE(jel.debit_amount, 0) - COALESCE(jel.credit_amount, 0)) 
            OVER (ORDER BY je.entry_date, je.entry_number, jel.line_number) as running_balance
    FROM journal_entries je
    JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
    WHERE je.status = 'POSTED'
    AND jel.account_id = p_account_id
    AND je.company_id = p_company_id
    AND je.entry_date BETWEEN p_start_date AND p_end_date
    ORDER BY je.entry_date, je.entry_number, jel.line_number;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_account_ledger(UUID, UUID, DATE, DATE) TO authenticated;

-- Test the function
SELECT 'Testing account ledger function:' as test;

-- Get test data
DO $$
DECLARE
    test_company_id UUID;
    test_account_id UUID;
    record_count INTEGER;
BEGIN
    -- Get first company with journal entries
    SELECT DISTINCT je.company_id INTO test_company_id
    FROM journal_entries je
    WHERE je.status = 'POSTED'
    LIMIT 1;
    
    -- Get first account for this company
    SELECT DISTINCT jel.account_id INTO test_account_id
    FROM journal_entries je
    JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
    WHERE je.status = 'POSTED'
    AND je.company_id = test_company_id
    LIMIT 1;
    
    IF test_company_id IS NOT NULL AND test_account_id IS NOT NULL THEN
        -- Test the function
        SELECT COUNT(*) INTO record_count
        FROM get_account_ledger(test_account_id, test_company_id);
        
        RAISE NOTICE 'Company: %, Account: %, Records: %', test_company_id, test_account_id, record_count;
        RAISE NOTICE 'Account ledger function test completed';
    ELSE
        RAISE NOTICE 'No test data available';
    END IF;
END $$;

SELECT 'Account ledger function created successfully' as status;
