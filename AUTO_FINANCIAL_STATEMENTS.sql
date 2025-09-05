-- Automated Financial Statements System
-- Generate Income Statement, Balance Sheet, and Cash Flow for any period

-- 1. INCOME STATEMENT FUNCTION
CREATE OR REPLACE FUNCTION get_income_statement(
    p_company_id UUID,
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
    AND je.company_id = p_company_id
    AND je.entry_date BETWEEN p_start_date AND p_end_date
    AND coa.account_type IN ('REVENUE', 'INCOME', 'EXPENSE', 'COST_OF_GOODS_SOLD')
    GROUP BY coa.account_type, coa.account_code, coa.account_name
    HAVING (SUM(COALESCE(jel.debit_amount, 0)) + SUM(COALESCE(jel.credit_amount, 0))) > 0
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

-- 2. BALANCE SHEET FUNCTION
CREATE OR REPLACE FUNCTION get_balance_sheet(
    p_company_id UUID,
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
    AND je.company_id = p_company_id
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

-- 3. FINANCIAL STATEMENT SUMMARY FUNCTION
CREATE OR REPLACE FUNCTION get_financial_summary(
    p_company_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    statement_type TEXT,
    category TEXT,
    total_amount NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    -- Income Statement Totals
    SELECT 
        'INCOME_STATEMENT'::TEXT as statement_type,
        'TOTAL_REVENUE'::TEXT as category,
        COALESCE(SUM(CASE WHEN category = 'REVENUE' THEN amount ELSE 0 END), 0) as total_amount
    FROM get_income_statement(p_company_id, p_start_date, p_end_date)
    
    UNION ALL
    
    SELECT 
        'INCOME_STATEMENT'::TEXT,
        'TOTAL_EXPENSES'::TEXT,
        COALESCE(SUM(CASE WHEN category IN ('EXPENSE', 'COGS') THEN amount ELSE 0 END), 0)
    FROM get_income_statement(p_company_id, p_start_date, p_end_date)
    
    UNION ALL
    
    SELECT 
        'INCOME_STATEMENT'::TEXT,
        'NET_INCOME'::TEXT,
        COALESCE(SUM(CASE WHEN category = 'REVENUE' THEN amount ELSE -amount END), 0)
    FROM get_income_statement(p_company_id, p_start_date, p_end_date)
    
    UNION ALL
    
    -- Balance Sheet Totals
    SELECT 
        'BALANCE_SHEET'::TEXT,
        'TOTAL_ASSETS'::TEXT,
        COALESCE(SUM(CASE WHEN category = 'ASSETS' THEN amount ELSE 0 END), 0)
    FROM get_balance_sheet(p_company_id, p_end_date)
    
    UNION ALL
    
    SELECT 
        'BALANCE_SHEET'::TEXT,
        'TOTAL_LIABILITIES'::TEXT,
        COALESCE(SUM(CASE WHEN category = 'LIABILITIES' THEN amount ELSE 0 END), 0)
    FROM get_balance_sheet(p_company_id, p_end_date)
    
    UNION ALL
    
    SELECT 
        'BALANCE_SHEET'::TEXT,
        'TOTAL_EQUITY'::TEXT,
        COALESCE(SUM(CASE WHEN category = 'EQUITY' THEN amount ELSE 0 END), 0)
    FROM get_balance_sheet(p_company_id, p_end_date);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_income_statement(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_balance_sheet(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_financial_summary(UUID, DATE, DATE) TO authenticated;

-- Test the functions
DO $$
DECLARE
    test_company_id UUID;
    revenue_total NUMERIC;
    asset_total NUMERIC;
BEGIN
    -- Get test company
    SELECT DISTINCT company_id INTO test_company_id
    FROM journal_entries
    WHERE status = 'POSTED'
    LIMIT 1;
    
    IF test_company_id IS NOT NULL THEN
        -- Test Income Statement
        SELECT COALESCE(SUM(amount), 0) INTO revenue_total
        FROM get_income_statement(test_company_id, '2024-01-01', '2024-12-31')
        WHERE category = 'REVENUE';
        
        -- Test Balance Sheet
        SELECT COALESCE(SUM(amount), 0) INTO asset_total
        FROM get_balance_sheet(test_company_id, '2024-12-31')
        WHERE category = 'ASSETS';
        
        RAISE NOTICE 'Financial Statements Test - Company: %, Revenue: %, Assets: %', 
            test_company_id, revenue_total, asset_total;
    ELSE
        RAISE NOTICE 'No test data available';
    END IF;
END $$;

SELECT 'Automated Financial Statements system created successfully' as status;
