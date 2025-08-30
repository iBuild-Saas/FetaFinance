-- Final fix for account ledger function - handles all parameter combinations

-- Drop all existing versions completely
DROP FUNCTION IF EXISTS get_account_ledger CASCADE;

-- Create the main function with 4 parameters (what frontend calls)
CREATE OR REPLACE FUNCTION get_account_ledger(
    p_account_id UUID,
    p_company_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    entry_date DATE,
    entry_number VARCHAR,
    description TEXT,
    debit_amount NUMERIC,
    credit_amount NUMERIC,
    running_balance NUMERIC
) AS $$
DECLARE
    actual_start_date DATE;
    actual_end_date DATE;
BEGIN
    -- Handle null dates properly
    actual_start_date := COALESCE(p_start_date, '2020-01-01'::DATE);
    actual_end_date := COALESCE(p_end_date, CURRENT_DATE + INTERVAL '1 year');
    
    RETURN QUERY
    SELECT 
        je.entry_date,
        je.entry_number,
        COALESCE(jel.description, je.description, 'No description') as description,
        COALESCE(jel.debit_amount, 0) as debit_amount,
        COALESCE(jel.credit_amount, 0) as credit_amount,
        SUM(COALESCE(jel.debit_amount, 0) - COALESCE(jel.credit_amount, 0)) 
            OVER (ORDER BY je.entry_date, je.entry_number, jel.line_number 
                  ROWS UNBOUNDED PRECEDING) as running_balance
    FROM journal_entries je
    JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
    WHERE je.status = 'POSTED'
    AND jel.account_id = p_account_id
    AND je.company_id = p_company_id
    AND je.entry_date BETWEEN actual_start_date AND actual_end_date
    ORDER BY je.entry_date, je.entry_number, jel.line_number;
END;
$$ LANGUAGE plpgsql;

-- Create overload for 2 parameters (just in case)
CREATE OR REPLACE FUNCTION get_account_ledger(
    p_account_id UUID,
    p_company_id UUID
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
    SELECT * FROM get_account_ledger(p_account_id, p_company_id, NULL::DATE, NULL::DATE);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for both versions
GRANT EXECUTE ON FUNCTION get_account_ledger(UUID, UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_account_ledger(UUID, UUID) TO authenticated;

-- Test the function
DO $$
DECLARE
    test_company_id UUID;
    test_account_id UUID;
    record_count INTEGER;
BEGIN
    -- Get test data
    SELECT DISTINCT je.company_id INTO test_company_id
    FROM journal_entries je
    WHERE je.status = 'POSTED'
    LIMIT 1;
    
    SELECT DISTINCT jel.account_id INTO test_account_id
    FROM journal_entries je
    JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
    WHERE je.status = 'POSTED'
    AND je.company_id = test_company_id
    LIMIT 1;
    
    IF test_company_id IS NOT NULL AND test_account_id IS NOT NULL THEN
        -- Test 4-parameter version with nulls
        SELECT COUNT(*) INTO record_count
        FROM get_account_ledger(test_account_id, test_company_id, NULL, NULL);
        
        RAISE NOTICE 'Function test (4 params with nulls): Company=%, Account=%, Records=%', 
            test_company_id, test_account_id, record_count;
        
        -- Test 2-parameter version
        SELECT COUNT(*) INTO record_count
        FROM get_account_ledger(test_account_id, test_company_id);
        
        RAISE NOTICE 'Function test (2 params): Records=%', record_count;
    ELSE
        RAISE NOTICE 'No test data found';
    END IF;
END $$;

SELECT 'Account ledger function created with all parameter combinations' as status;
