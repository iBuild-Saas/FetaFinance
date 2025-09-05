-- Fix the company_id data type issue in journal_entries query

-- Check the actual data types in your tables
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('journal_entries', 'companies', 'chart_of_accounts')
AND column_name IN ('company_id', 'id')
ORDER BY table_name, column_name;

-- Drop and recreate functions with proper type casting
DROP FUNCTION IF EXISTS get_income_statement(TEXT, DATE, DATE);
DROP FUNCTION IF EXISTS get_balance_sheet(TEXT, DATE);

-- Create income statement function with type casting
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
        coa.account_type::TEXT,
        coa.account_code::TEXT,
        coa.account_name::TEXT,
        CASE 
            WHEN coa.account_type IN ('REVENUE', 'INCOME') THEN 
                SUM(COALESCE(jel.credit_amount, 0)) - SUM(COALESCE(jel.debit_amount, 0))
            WHEN coa.account_type IN ('EXPENSE', 'COST_OF_GOODS_SOLD') THEN 
                SUM(COALESCE(jel.debit_amount, 0)) - SUM(COALESCE(jel.credit_amount, 0))
            ELSE 0
        END as amount,
        CASE 
            WHEN coa.account_type IN ('REVENUE', 'INCOME') THEN 'REVENUE'::TEXT
            WHEN coa.account_type = 'COST_OF_GOODS_SOLD' THEN 'COGS'::TEXT
            WHEN coa.account_type = 'EXPENSE' THEN 'EXPENSE'::TEXT
            ELSE 'OTHER'::TEXT
        END as category
    FROM journal_entries je
    JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
    JOIN chart_of_accounts coa ON jel.account_id = coa.id
    WHERE je.status = 'POSTED'
    AND je.company_id::TEXT = p_company_id
    AND je.entry_date BETWEEN p_start_date AND p_end_date
    AND coa.account_type IN ('REVENUE', 'INCOME', 'EXPENSE', 'COST_OF_GOODS_SOLD')
    GROUP BY coa.account_type, coa.account_code, coa.account_name
    HAVING ABS(SUM(COALESCE(jel.debit_amount, 0)) - SUM(COALESCE(jel.credit_amount, 0))) > 0.01
    ORDER BY 
        CASE coa.account_type 
            WHEN 'REVENUE' THEN 1
            WHEN 'INCOME' THEN 2
            WHEN 'COST_OF_GOODS_SOLD' THEN 3
            WHEN 'EXPENSE' THEN 4
            ELSE 5
        END,
        coa.account_code;
END;
$$ LANGUAGE plpgsql;

-- Create balance sheet function with type casting
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
        coa.account_type::TEXT,
        coa.account_code::TEXT,
        coa.account_name::TEXT,
        CASE 
            WHEN coa.account_type IN ('ASSET', 'CURRENT_ASSET', 'FIXED_ASSET') THEN 
                SUM(COALESCE(jel.debit_amount, 0)) - SUM(COALESCE(jel.credit_amount, 0))
            WHEN coa.account_type IN ('LIABILITY', 'CURRENT_LIABILITY', 'LONG_TERM_LIABILITY') THEN 
                SUM(COALESCE(jel.credit_amount, 0)) - SUM(COALESCE(jel.debit_amount, 0))
            WHEN coa.account_type IN ('EQUITY', 'RETAINED_EARNINGS') THEN 
                SUM(COALESCE(jel.credit_amount, 0)) - SUM(COALESCE(jel.debit_amount, 0))
            ELSE 0
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
    JOIN chart_of_accounts coa ON jel.account_id = coa.id
    WHERE je.status = 'POSTED'
    AND je.company_id::TEXT = p_company_id
    AND je.entry_date <= p_as_of_date
    AND coa.account_type IN ('ASSET', 'CURRENT_ASSET', 'FIXED_ASSET', 'LIABILITY', 'CURRENT_LIABILITY', 'LONG_TERM_LIABILITY', 'EQUITY', 'RETAINED_EARNINGS')
    GROUP BY coa.account_type, coa.account_code, coa.account_name
    HAVING ABS(SUM(COALESCE(jel.debit_amount, 0)) - SUM(COALESCE(jel.credit_amount, 0))) > 0.01
    ORDER BY 
        CASE coa.account_type 
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

-- Test the functions with proper casting
SELECT 'Testing functions with type casting:' as test_message;

-- Test income statement
SELECT COUNT(*) as income_records 
FROM get_income_statement('1754730703821', '2024-01-01', '2024-12-31');

-- Test balance sheet  
SELECT COUNT(*) as balance_records
FROM get_balance_sheet('1754730703821', '2024-12-31');

-- Show sample data if available
SELECT 'Sample Income Statement Data:' as sample_header;
SELECT * FROM get_income_statement('1754730703821', '2024-01-01', '2024-12-31') LIMIT 5;

SELECT 'Sample Balance Sheet Data:' as sample_header;
SELECT * FROM get_balance_sheet('1754730703821', '2024-12-31') LIMIT 5;

SELECT 'Functions updated with proper type casting' as status;
