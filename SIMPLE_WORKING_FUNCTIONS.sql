-- Create simple working functions without UUID casting issues

DROP FUNCTION IF EXISTS get_income_statement(TEXT, DATE, DATE);
DROP FUNCTION IF EXISTS get_balance_sheet(TEXT, DATE);

-- Simple income statement function without UUID casting
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
    RETURN QUERY
    SELECT 
        COALESCE(coa.account_type, 'UNKNOWN')::TEXT,
        COALESCE(coa.account_code, '0000')::TEXT,
        COALESCE(coa.account_name, 'Unknown Account')::TEXT,
        CASE 
            WHEN coa.account_type IN ('REVENUE', 'INCOME') THEN 
                SUM(COALESCE(jel.credit_amount, 0)) - SUM(COALESCE(jel.debit_amount, 0))
            WHEN coa.account_type IN ('EXPENSE', 'COST_OF_GOODS_SOLD') THEN 
                SUM(COALESCE(jel.debit_amount, 0)) - SUM(COALESCE(jel.credit_amount, 0))
            ELSE 
                SUM(COALESCE(jel.debit_amount, 0)) - SUM(COALESCE(jel.credit_amount, 0))
        END as amount,
        CASE 
            WHEN coa.account_type IN ('REVENUE', 'INCOME') THEN 'REVENUE'::TEXT
            WHEN coa.account_type = 'COST_OF_GOODS_SOLD' THEN 'COGS'::TEXT
            WHEN coa.account_type = 'EXPENSE' THEN 'EXPENSE'::TEXT
            ELSE 'OTHER'::TEXT
        END as category
    FROM journal_entries je
    JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
    LEFT JOIN chart_of_accounts coa ON jel.account_id = coa.id
    WHERE je.status = 'POSTED'
    AND je.company_id::TEXT = p_company_id
    AND je.entry_date BETWEEN p_start_date AND p_end_date
    GROUP BY coa.account_type, coa.account_code, coa.account_name
    HAVING ABS(SUM(COALESCE(jel.debit_amount, 0)) - SUM(COALESCE(jel.credit_amount, 0))) > 0.01
    ORDER BY 
        CASE COALESCE(coa.account_type, 'OTHER')
            WHEN 'REVENUE' THEN 1
            WHEN 'INCOME' THEN 2
            WHEN 'COST_OF_GOODS_SOLD' THEN 3
            WHEN 'EXPENSE' THEN 4
            ELSE 5
        END,
        coa.account_code;
END;
$$ LANGUAGE plpgsql;

-- Simple balance sheet function without UUID casting
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
    RETURN QUERY
    SELECT 
        COALESCE(coa.account_type, 'UNKNOWN')::TEXT,
        COALESCE(coa.account_code, '0000')::TEXT,
        COALESCE(coa.account_name, 'Unknown Account')::TEXT,
        CASE 
            WHEN coa.account_type IN ('ASSET', 'CURRENT_ASSET', 'FIXED_ASSET') THEN 
                SUM(COALESCE(jel.debit_amount, 0)) - SUM(COALESCE(jel.credit_amount, 0))
            WHEN coa.account_type IN ('LIABILITY', 'CURRENT_LIABILITY', 'LONG_TERM_LIABILITY') THEN 
                SUM(COALESCE(jel.credit_amount, 0)) - SUM(COALESCE(jel.debit_amount, 0))
            WHEN coa.account_type IN ('EQUITY', 'RETAINED_EARNINGS') THEN 
                SUM(COALESCE(jel.credit_amount, 0)) - SUM(COALESCE(jel.debit_amount, 0))
            ELSE 
                SUM(COALESCE(jel.debit_amount, 0)) - SUM(COALESCE(jel.credit_amount, 0))
        END as amount,
        CASE 
            WHEN coa.account_type IN ('ASSET', 'CURRENT_ASSET', 'FIXED_ASSET') THEN 'ASSETS'::TEXT
            WHEN coa.account_type IN ('LIABILITY', 'CURRENT_LIABILITY', 'LONG_TERM_LIABILITY') THEN 'LIABILITIES'::TEXT
            WHEN coa.account_type IN ('EQUITY', 'RETAINED_EARNINGS') THEN 'EQUITY'::TEXT
            ELSE 'OTHER'::TEXT
        END as category,
        CASE 
            WHEN coa.account_type = 'CURRENT_ASSET' THEN 'CURRENT'::TEXT
            WHEN coa.account_type = 'FIXED_ASSET' THEN 'FIXED'::TEXT
            WHEN coa.account_type = 'CURRENT_LIABILITY' THEN 'CURRENT'::TEXT
            WHEN coa.account_type = 'LONG_TERM_LIABILITY' THEN 'LONG_TERM'::TEXT
            ELSE 'GENERAL'::TEXT
        END as subcategory
    FROM journal_entries je
    JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
    LEFT JOIN chart_of_accounts coa ON jel.account_id = coa.id
    WHERE je.status = 'POSTED'
    AND je.company_id::TEXT = p_company_id
    AND je.entry_date <= p_as_of_date
    GROUP BY coa.account_type, coa.account_code, coa.account_name
    HAVING ABS(SUM(COALESCE(jel.debit_amount, 0)) - SUM(COALESCE(jel.credit_amount, 0))) > 0.01
    ORDER BY 
        CASE COALESCE(coa.account_type, 'OTHER')
            WHEN 'CURRENT_ASSET' THEN 1
            WHEN 'FIXED_ASSET' THEN 2
            WHEN 'ASSET' THEN 3
            WHEN 'CURRENT_LIABILITY' THEN 4
            WHEN 'LONG_TERM_LIABILITY' THEN 5
            WHEN 'LIABILITY' THEN 6
            WHEN 'EQUITY' THEN 7
            WHEN 'RETAINED_EARNINGS' THEN 8
            ELSE 9
        END,
        coa.account_code;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_income_statement(TEXT, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_balance_sheet(TEXT, DATE) TO authenticated;

-- Test the functions
SELECT 'Testing simplified functions:' as test_message;
SELECT * FROM get_income_statement('1754730703821', '2020-01-01', '2030-12-31') LIMIT 3;
SELECT * FROM get_balance_sheet('1754730703821', '2030-12-31') LIMIT 3;

SELECT 'Simple functions created without UUID casting' as status;
