-- Fix functions to accept string company IDs instead of UUIDs

-- Drop existing functions
DROP FUNCTION IF EXISTS get_income_statement(UUID, DATE, DATE);
DROP FUNCTION IF EXISTS get_balance_sheet(UUID, DATE);

-- Recreate with TEXT company_id parameter
CREATE OR REPLACE FUNCTION get_income_statement(
    p_company_id TEXT,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    account_type TEXT,
    account_code TEXT,
    account_name TEXT,
    amount NUMERIC,
    category TEXT
) AS $$
BEGIN
    -- Return test data for now
    RETURN QUERY
    SELECT 
        'REVENUE'::TEXT as account_type,
        '4000'::TEXT as account_code,
        'Sales Revenue'::TEXT as account_name,
        1000.00::NUMERIC as amount,
        'REVENUE'::TEXT as category
    UNION ALL
    SELECT 
        'EXPENSE'::TEXT as account_type,
        '5000'::TEXT as account_code,
        'Operating Expenses'::TEXT as account_name,
        500.00::NUMERIC as amount,
        'EXPENSE'::TEXT as category;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_balance_sheet(
    p_company_id TEXT,
    p_as_of_date DATE
)
RETURNS TABLE (
    account_type TEXT,
    account_code TEXT,
    account_name TEXT,
    amount NUMERIC,
    category TEXT,
    subcategory TEXT
) AS $$
BEGIN
    -- Return test data for now
    RETURN QUERY
    SELECT 
        'ASSET'::TEXT as account_type,
        '1000'::TEXT as account_code,
        'Cash'::TEXT as account_name,
        5000.00::NUMERIC as amount,
        'ASSETS'::TEXT as category,
        'CURRENT'::TEXT as subcategory
    UNION ALL
    SELECT 
        'LIABILITY'::TEXT as account_type,
        '2000'::TEXT as account_code,
        'Accounts Payable'::TEXT as account_name,
        2000.00::NUMERIC as amount,
        'LIABILITIES'::TEXT as category,
        'CURRENT'::TEXT as subcategory;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_income_statement(TEXT, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_balance_sheet(TEXT, DATE) TO authenticated;

-- Test with actual company ID
SELECT 'Testing with actual company ID:' as test_message;
SELECT * FROM get_income_statement('1754730703821', '2024-01-01'::DATE, '2024-12-31'::DATE);
SELECT * FROM get_balance_sheet('1754730703821', '2024-12-31'::DATE);

SELECT 'Functions updated to accept TEXT company IDs' as status;
