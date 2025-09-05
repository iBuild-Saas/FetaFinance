-- Frontend-ready financial statements with proper formatting

-- 1. ENHANCED INCOME STATEMENT WITH CALCULATIONS
CREATE OR REPLACE FUNCTION get_formatted_income_statement(
    p_company_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    line_item VARCHAR,
    account_code VARCHAR,
    account_name VARCHAR,
    amount NUMERIC,
    percentage NUMERIC,
    is_total BOOLEAN,
    indent_level INTEGER
) AS $$
DECLARE
    total_revenue NUMERIC := 0;
    total_cogs NUMERIC := 0;
    total_expenses NUMERIC := 0;
    gross_profit NUMERIC := 0;
    net_income NUMERIC := 0;
BEGIN
    -- Calculate totals first
    SELECT COALESCE(SUM(CASE WHEN category = 'REVENUE' THEN amount ELSE 0 END), 0) INTO total_revenue
    FROM get_income_statement(p_company_id, p_start_date, p_end_date);
    
    SELECT COALESCE(SUM(CASE WHEN category = 'COGS' THEN amount ELSE 0 END), 0) INTO total_cogs
    FROM get_income_statement(p_company_id, p_start_date, p_end_date);
    
    SELECT COALESCE(SUM(CASE WHEN category = 'EXPENSE' THEN amount ELSE 0 END), 0) INTO total_expenses
    FROM get_income_statement(p_company_id, p_start_date, p_end_date);
    
    gross_profit := total_revenue - total_cogs;
    net_income := gross_profit - total_expenses;
    
    -- Return formatted statement
    RETURN QUERY
    -- Revenue Section
    SELECT 'REVENUE'::VARCHAR, ''::VARCHAR, 'REVENUE'::VARCHAR, 0::NUMERIC, 0::NUMERIC, true, 0
    UNION ALL
    SELECT 'REVENUE_DETAIL', account_code, account_name, amount, 
           CASE WHEN total_revenue > 0 THEN (amount / total_revenue * 100) ELSE 0 END, false, 1
    FROM get_income_statement(p_company_id, p_start_date, p_end_date)
    WHERE category = 'REVENUE'
    UNION ALL
    SELECT 'TOTAL_REVENUE', '', 'Total Revenue', total_revenue, 100.0, true, 0
    
    UNION ALL
    
    -- COGS Section
    SELECT 'COGS', '', 'COST OF GOODS SOLD', 0::NUMERIC, 0::NUMERIC, true, 0
    UNION ALL
    SELECT 'COGS_DETAIL', account_code, account_name, amount,
           CASE WHEN total_revenue > 0 THEN (amount / total_revenue * 100) ELSE 0 END, false, 1
    FROM get_income_statement(p_company_id, p_start_date, p_end_date)
    WHERE category = 'COGS'
    UNION ALL
    SELECT 'TOTAL_COGS', '', 'Total Cost of Goods Sold', total_cogs,
           CASE WHEN total_revenue > 0 THEN (total_cogs / total_revenue * 100) ELSE 0 END, true, 0
    
    UNION ALL
    
    -- Gross Profit
    SELECT 'GROSS_PROFIT', '', 'Gross Profit', gross_profit,
           CASE WHEN total_revenue > 0 THEN (gross_profit / total_revenue * 100) ELSE 0 END, true, 0
    
    UNION ALL
    
    -- Expenses Section
    SELECT 'EXPENSES', '', 'OPERATING EXPENSES', 0::NUMERIC, 0::NUMERIC, true, 0
    UNION ALL
    SELECT 'EXPENSE_DETAIL', account_code, account_name, amount,
           CASE WHEN total_revenue > 0 THEN (amount / total_revenue * 100) ELSE 0 END, false, 1
    FROM get_income_statement(p_company_id, p_start_date, p_end_date)
    WHERE category = 'EXPENSE'
    UNION ALL
    SELECT 'TOTAL_EXPENSES', '', 'Total Operating Expenses', total_expenses,
           CASE WHEN total_revenue > 0 THEN (total_expenses / total_revenue * 100) ELSE 0 END, true, 0
    
    UNION ALL
    
    -- Net Income
    SELECT 'NET_INCOME', '', 'Net Income', net_income,
           CASE WHEN total_revenue > 0 THEN (net_income / total_revenue * 100) ELSE 0 END, true, 0;
END;
$$ LANGUAGE plpgsql;

-- 2. ENHANCED BALANCE SHEET WITH CALCULATIONS
CREATE OR REPLACE FUNCTION get_formatted_balance_sheet(
    p_company_id UUID,
    p_as_of_date DATE
)
RETURNS TABLE (
    line_item VARCHAR,
    account_code VARCHAR,
    account_name VARCHAR,
    amount NUMERIC,
    percentage NUMERIC,
    is_total BOOLEAN,
    indent_level INTEGER
) AS $$
DECLARE
    total_assets NUMERIC := 0;
    total_current_assets NUMERIC := 0;
    total_fixed_assets NUMERIC := 0;
    total_liabilities NUMERIC := 0;
    total_current_liabilities NUMERIC := 0;
    total_long_term_liabilities NUMERIC := 0;
    total_equity NUMERIC := 0;
BEGIN
    -- Calculate totals
    SELECT COALESCE(SUM(amount), 0) INTO total_assets
    FROM get_balance_sheet(p_company_id, p_as_of_date)
    WHERE category = 'ASSETS';
    
    SELECT COALESCE(SUM(amount), 0) INTO total_current_assets
    FROM get_balance_sheet(p_company_id, p_as_of_date)
    WHERE category = 'ASSETS' AND subcategory = 'CURRENT';
    
    SELECT COALESCE(SUM(amount), 0) INTO total_fixed_assets
    FROM get_balance_sheet(p_company_id, p_as_of_date)
    WHERE category = 'ASSETS' AND subcategory = 'FIXED';
    
    SELECT COALESCE(SUM(amount), 0) INTO total_liabilities
    FROM get_balance_sheet(p_company_id, p_as_of_date)
    WHERE category = 'LIABILITIES';
    
    SELECT COALESCE(SUM(amount), 0) INTO total_equity
    FROM get_balance_sheet(p_company_id, p_as_of_date)
    WHERE category = 'EQUITY';
    
    -- Return formatted balance sheet
    RETURN QUERY
    -- Assets Section
    SELECT 'ASSETS'::VARCHAR, ''::VARCHAR, 'ASSETS'::VARCHAR, 0::NUMERIC, 0::NUMERIC, true, 0
    
    UNION ALL
    SELECT 'CURRENT_ASSETS', '', 'Current Assets', 0::NUMERIC, 0::NUMERIC, true, 1
    UNION ALL
    SELECT 'CURRENT_ASSET_DETAIL', account_code, account_name, amount,
           CASE WHEN total_assets > 0 THEN (amount / total_assets * 100) ELSE 0 END, false, 2
    FROM get_balance_sheet(p_company_id, p_as_of_date)
    WHERE category = 'ASSETS' AND subcategory = 'CURRENT'
    UNION ALL
    SELECT 'TOTAL_CURRENT_ASSETS', '', 'Total Current Assets', total_current_assets,
           CASE WHEN total_assets > 0 THEN (total_current_assets / total_assets * 100) ELSE 0 END, true, 1
    
    UNION ALL
    
    SELECT 'FIXED_ASSETS', '', 'Fixed Assets', 0::NUMERIC, 0::NUMERIC, true, 1
    UNION ALL
    SELECT 'FIXED_ASSET_DETAIL', account_code, account_name, amount,
           CASE WHEN total_assets > 0 THEN (amount / total_assets * 100) ELSE 0 END, false, 2
    FROM get_balance_sheet(p_company_id, p_as_of_date)
    WHERE category = 'ASSETS' AND subcategory = 'FIXED'
    UNION ALL
    SELECT 'TOTAL_FIXED_ASSETS', '', 'Total Fixed Assets', total_fixed_assets,
           CASE WHEN total_assets > 0 THEN (total_fixed_assets / total_assets * 100) ELSE 0 END, true, 1
    
    UNION ALL
    SELECT 'TOTAL_ASSETS', '', 'TOTAL ASSETS', total_assets, 100.0, true, 0
    
    UNION ALL
    
    -- Liabilities Section
    SELECT 'LIABILITIES', '', 'LIABILITIES & EQUITY', 0::NUMERIC, 0::NUMERIC, true, 0
    UNION ALL
    SELECT 'LIABILITY_DETAIL', account_code, account_name, amount,
           CASE WHEN total_assets > 0 THEN (amount / total_assets * 100) ELSE 0 END, false, 1
    FROM get_balance_sheet(p_company_id, p_as_of_date)
    WHERE category = 'LIABILITIES'
    UNION ALL
    SELECT 'TOTAL_LIABILITIES', '', 'Total Liabilities', total_liabilities,
           CASE WHEN total_assets > 0 THEN (total_liabilities / total_assets * 100) ELSE 0 END, true, 0
    
    UNION ALL
    
    -- Equity Section
    SELECT 'EQUITY_DETAIL', account_code, account_name, amount,
           CASE WHEN total_assets > 0 THEN (amount / total_assets * 100) ELSE 0 END, false, 1
    FROM get_balance_sheet(p_company_id, p_as_of_date)
    WHERE category = 'EQUITY'
    UNION ALL
    SELECT 'TOTAL_EQUITY', '', 'Total Equity', total_equity,
           CASE WHEN total_assets > 0 THEN (total_equity / total_assets * 100) ELSE 0 END, true, 0
    
    UNION ALL
    SELECT 'TOTAL_LIAB_EQUITY', '', 'TOTAL LIABILITIES & EQUITY', (total_liabilities + total_equity),
           100.0, true, 0;
END;
$$ LANGUAGE plpgsql;

-- 3. FINANCIAL RATIOS FUNCTION
CREATE OR REPLACE FUNCTION get_financial_ratios(
    p_company_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    ratio_category VARCHAR,
    ratio_name VARCHAR,
    ratio_value NUMERIC,
    ratio_formula VARCHAR
) AS $$
DECLARE
    total_revenue NUMERIC := 0;
    net_income NUMERIC := 0;
    total_assets NUMERIC := 0;
    current_assets NUMERIC := 0;
    current_liabilities NUMERIC := 0;
    total_equity NUMERIC := 0;
BEGIN
    -- Get financial data
    SELECT COALESCE(SUM(CASE WHEN category = 'REVENUE' THEN amount ELSE 0 END), 0) INTO total_revenue
    FROM get_income_statement(p_company_id, p_start_date, p_end_date);
    
    SELECT COALESCE(SUM(CASE WHEN category = 'REVENUE' THEN amount ELSE -amount END), 0) INTO net_income
    FROM get_income_statement(p_company_id, p_start_date, p_end_date);
    
    SELECT COALESCE(SUM(amount), 0) INTO total_assets
    FROM get_balance_sheet(p_company_id, p_end_date)
    WHERE category = 'ASSETS';
    
    SELECT COALESCE(SUM(amount), 0) INTO current_assets
    FROM get_balance_sheet(p_company_id, p_end_date)
    WHERE category = 'ASSETS' AND subcategory = 'CURRENT';
    
    SELECT COALESCE(SUM(amount), 0) INTO current_liabilities
    FROM get_balance_sheet(p_company_id, p_end_date)
    WHERE category = 'LIABILITIES' AND subcategory = 'CURRENT';
    
    SELECT COALESCE(SUM(amount), 0) INTO total_equity
    FROM get_balance_sheet(p_company_id, p_end_date)
    WHERE category = 'EQUITY';
    
    RETURN QUERY
    SELECT 
        'PROFITABILITY'::VARCHAR,
        'Net Profit Margin'::VARCHAR,
        CASE WHEN total_revenue > 0 THEN (net_income / total_revenue * 100) ELSE 0 END,
        'Net Income / Total Revenue'::VARCHAR
    UNION ALL
    SELECT 
        'PROFITABILITY',
        'Return on Assets (ROA)',
        CASE WHEN total_assets > 0 THEN (net_income / total_assets * 100) ELSE 0 END,
        'Net Income / Total Assets'
    UNION ALL
    SELECT 
        'PROFITABILITY',
        'Return on Equity (ROE)',
        CASE WHEN total_equity > 0 THEN (net_income / total_equity * 100) ELSE 0 END,
        'Net Income / Total Equity'
    UNION ALL
    SELECT 
        'LIQUIDITY',
        'Current Ratio',
        CASE WHEN current_liabilities > 0 THEN (current_assets / current_liabilities) ELSE 0 END,
        'Current Assets / Current Liabilities'
    UNION ALL
    SELECT 
        'LEVERAGE',
        'Debt to Equity Ratio',
        CASE WHEN total_equity > 0 THEN ((total_assets - total_equity) / total_equity) ELSE 0 END,
        'Total Liabilities / Total Equity';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_formatted_income_statement(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_formatted_balance_sheet(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_financial_ratios(UUID, DATE, DATE) TO authenticated;

SELECT 'Enhanced Financial Statements with formatting and ratios created' as status;
