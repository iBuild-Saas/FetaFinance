-- Fix Financial Summary Function to Use UUID Parameters
-- Updates the function to call the correct UUID-based financial statement functions

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
        COALESCE(SUM(CASE WHEN category = 'REVENUE' THEN amount ELSE 0 END), 0) as total_amount
    FROM get_hierarchical_income_statement(p_company_id, p_start_date, p_end_date)
    
    UNION ALL
    
    SELECT 
        'INCOME_STATEMENT'::TEXT,
        'TOTAL_EXPENSES'::TEXT,
        COALESCE(SUM(CASE WHEN category IN ('EXPENSE', 'COGS') THEN amount ELSE 0 END), 0)
    FROM get_hierarchical_income_statement(p_company_id, p_start_date, p_end_date)
    
    UNION ALL
    
    SELECT 
        'INCOME_STATEMENT'::TEXT,
        'NET_INCOME'::TEXT,
        COALESCE(SUM(CASE WHEN category = 'REVENUE' THEN amount ELSE -amount END), 0)
    FROM get_hierarchical_income_statement(p_company_id, p_start_date, p_end_date)
    
    UNION ALL
    
    -- Balance Sheet Totals
    SELECT 
        'BALANCE_SHEET'::TEXT,
        'TOTAL_ASSETS'::TEXT,
        COALESCE(SUM(CASE WHEN category = 'ASSETS' THEN amount ELSE 0 END), 0)
    FROM get_hierarchical_balance_sheet(p_company_id, p_end_date)
    
    UNION ALL
    
    SELECT 
        'BALANCE_SHEET'::TEXT,
        'TOTAL_LIABILITIES'::TEXT,
        COALESCE(SUM(CASE WHEN category = 'LIABILITIES' THEN amount ELSE 0 END), 0)
    FROM get_hierarchical_balance_sheet(p_company_id, p_end_date)
    
    UNION ALL
    
    SELECT 
        'BALANCE_SHEET'::TEXT,
        'TOTAL_EQUITY'::TEXT,
        COALESCE(SUM(CASE WHEN category = 'EQUITY' THEN amount ELSE 0 END), 0)
    FROM get_hierarchical_balance_sheet(p_company_id, p_end_date);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_financial_summary(UUID, DATE, DATE) TO authenticated;

SELECT 'Financial summary function updated to use UUID parameters' as status;
