-- Fix Financial Summary Function - Resolve Column Ambiguity
-- Uses table aliases to avoid column reference conflicts

DROP FUNCTION IF EXISTS get_financial_summary(UUID, DATE, DATE);

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
        COALESCE(SUM(CASE WHEN inc.category = 'REVENUE' THEN inc.amount ELSE 0 END), 0) as total_amount
    FROM get_hierarchical_income_statement(p_company_id, p_start_date, p_end_date) inc
    
    UNION ALL
    
    SELECT 
        'INCOME_STATEMENT'::TEXT,
        'TOTAL_EXPENSES'::TEXT,
        COALESCE(SUM(CASE WHEN inc.category IN ('EXPENSE', 'COGS') THEN inc.amount ELSE 0 END), 0)
    FROM get_hierarchical_income_statement(p_company_id, p_start_date, p_end_date) inc
    
    UNION ALL
    
    SELECT 
        'INCOME_STATEMENT'::TEXT,
        'NET_INCOME'::TEXT,
        COALESCE(SUM(CASE WHEN inc.category = 'REVENUE' THEN inc.amount ELSE -inc.amount END), 0)
    FROM get_hierarchical_income_statement(p_company_id, p_start_date, p_end_date) inc
    
    UNION ALL
    
    -- Balance Sheet Totals
    SELECT 
        'BALANCE_SHEET'::TEXT,
        'TOTAL_ASSETS'::TEXT,
        COALESCE(SUM(CASE WHEN bal.category = 'ASSETS' THEN bal.amount ELSE 0 END), 0)
    FROM get_hierarchical_balance_sheet(p_company_id, p_end_date) bal
    
    UNION ALL
    
    SELECT 
        'BALANCE_SHEET'::TEXT,
        'TOTAL_LIABILITIES'::TEXT,
        COALESCE(SUM(CASE WHEN bal.category = 'LIABILITIES' THEN bal.amount ELSE 0 END), 0)
    FROM get_hierarchical_balance_sheet(p_company_id, p_end_date) bal
    
    UNION ALL
    
    SELECT 
        'BALANCE_SHEET'::TEXT,
        'TOTAL_EQUITY'::TEXT,
        COALESCE(SUM(CASE WHEN bal.category = 'EQUITY' THEN bal.amount ELSE 0 END), 0)
    FROM get_hierarchical_balance_sheet(p_company_id, p_end_date) bal;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_financial_summary(UUID, DATE, DATE) TO authenticated;

SELECT 'Financial summary function fixed - column ambiguity resolved' as status;
