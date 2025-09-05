-- Fix Financial Statement Functions to Use UUID Parameters
-- The functions currently expect TEXT but should use UUID for company_id

DROP FUNCTION IF EXISTS get_income_statement(TEXT, DATE, DATE);
DROP FUNCTION IF EXISTS get_balance_sheet(TEXT, DATE);

-- Fixed Income Statement - uses UUID parameter
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
    WITH account_balances AS (
        SELECT 
            coa.id as account_id,
            coa.account_type,
            coa.account_code,
            coa.account_name,
            coa.normal_balance,
            -- Calculate period balance for each account
            SUM(CASE 
                WHEN je.entry_date BETWEEN p_start_date AND p_end_date 
                THEN COALESCE(jel.debit_amount, 0) 
                ELSE 0 
            END) as period_debits,
            SUM(CASE 
                WHEN je.entry_date BETWEEN p_start_date AND p_end_date 
                THEN COALESCE(jel.credit_amount, 0) 
                ELSE 0 
            END) as period_credits
        FROM chart_of_accounts coa
        LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id 
            AND je.company_id = p_company_id 
            AND je.status = 'POSTED'
        WHERE coa.company_id = p_company_id
        AND coa.account_type IN ('REVENUE', 'INCOME', 'EXPENSE', 'COST_OF_GOODS_SOLD', 'OTHER_INCOME', 'OTHER_EXPENSE')
        AND coa.is_active = true
        GROUP BY coa.id, coa.account_type, coa.account_code, coa.account_name, coa.normal_balance
    )
    SELECT 
        ab.account_type::TEXT,
        ab.account_code::TEXT,
        ab.account_name::TEXT,
        CASE 
            -- Revenue accounts: Credit balance is positive
            WHEN ab.account_type IN ('REVENUE', 'INCOME', 'OTHER_INCOME') THEN 
                ab.period_credits - ab.period_debits
            -- Expense accounts: Debit balance is positive  
            WHEN ab.account_type IN ('EXPENSE', 'COST_OF_GOODS_SOLD', 'OTHER_EXPENSE') THEN 
                ab.period_debits - ab.period_credits
            ELSE 0
        END as amount,
        CASE 
            WHEN ab.account_type IN ('REVENUE', 'INCOME', 'OTHER_INCOME') THEN 'REVENUE'::TEXT
            WHEN ab.account_type = 'COST_OF_GOODS_SOLD' THEN 'COGS'::TEXT
            WHEN ab.account_type IN ('EXPENSE', 'OTHER_EXPENSE') THEN 'EXPENSE'::TEXT
            ELSE 'OTHER'::TEXT
        END as category
    FROM account_balances ab
    WHERE ABS(
        CASE 
            WHEN ab.account_type IN ('REVENUE', 'INCOME', 'OTHER_INCOME') THEN 
                ab.period_credits - ab.period_debits
            WHEN ab.account_type IN ('EXPENSE', 'COST_OF_GOODS_SOLD', 'OTHER_EXPENSE') THEN 
                ab.period_debits - ab.period_credits
            ELSE 0
        END
    ) > 0.01
    ORDER BY 
        CASE ab.account_type 
            WHEN 'REVENUE' THEN 1
            WHEN 'INCOME' THEN 2
            WHEN 'OTHER_INCOME' THEN 3
            WHEN 'COST_OF_GOODS_SOLD' THEN 4
            WHEN 'EXPENSE' THEN 5
            WHEN 'OTHER_EXPENSE' THEN 6
            ELSE 7
        END,
        ab.account_code;
END;
$$ LANGUAGE plpgsql;

-- Fixed Balance Sheet - uses UUID parameter
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
    WITH account_balances AS (
        SELECT 
            coa.id as account_id,
            coa.account_type,
            coa.account_code,
            coa.account_name,
            coa.normal_balance,
            -- Calculate cumulative balance up to the as-of date
            SUM(CASE 
                WHEN je.entry_date <= p_as_of_date 
                THEN COALESCE(jel.debit_amount, 0) 
                ELSE 0 
            END) as cumulative_debits,
            SUM(CASE 
                WHEN je.entry_date <= p_as_of_date 
                THEN COALESCE(jel.credit_amount, 0) 
                ELSE 0 
            END) as cumulative_credits
        FROM chart_of_accounts coa
        LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id 
            AND je.company_id = p_company_id 
            AND je.status = 'POSTED'
        WHERE coa.company_id = p_company_id
        AND coa.account_type IN (
            'ASSET', 'CURRENT_ASSET', 'FIXED_ASSET', 'NON_CURRENT_ASSET',
            'LIABILITY', 'CURRENT_LIABILITY', 'LONG_TERM_LIABILITY', 'NON_CURRENT_LIABILITY',
            'EQUITY', 'RETAINED_EARNINGS', 'CAPITAL'
        )
        AND coa.is_active = true
        GROUP BY coa.id, coa.account_type, coa.account_code, coa.account_name, coa.normal_balance
    )
    SELECT 
        ab.account_type::TEXT,
        ab.account_code::TEXT,
        ab.account_name::TEXT,
        CASE 
            -- Asset accounts: Debit balance is positive
            WHEN ab.account_type IN ('ASSET', 'CURRENT_ASSET', 'FIXED_ASSET', 'NON_CURRENT_ASSET') THEN 
                ab.cumulative_debits - ab.cumulative_credits
            -- Liability accounts: Credit balance is positive
            WHEN ab.account_type IN ('LIABILITY', 'CURRENT_LIABILITY', 'LONG_TERM_LIABILITY', 'NON_CURRENT_LIABILITY') THEN 
                ab.cumulative_credits - ab.cumulative_debits
            -- Equity accounts: Credit balance is positive
            WHEN ab.account_type IN ('EQUITY', 'RETAINED_EARNINGS', 'CAPITAL') THEN 
                ab.cumulative_credits - ab.cumulative_debits
            ELSE 0
        END as amount,
        CASE 
            WHEN ab.account_type IN ('ASSET', 'CURRENT_ASSET', 'FIXED_ASSET', 'NON_CURRENT_ASSET') THEN 'ASSETS'::TEXT
            WHEN ab.account_type IN ('LIABILITY', 'CURRENT_LIABILITY', 'LONG_TERM_LIABILITY', 'NON_CURRENT_LIABILITY') THEN 'LIABILITIES'::TEXT
            WHEN ab.account_type IN ('EQUITY', 'RETAINED_EARNINGS', 'CAPITAL') THEN 'EQUITY'::TEXT
            ELSE 'OTHER'::TEXT
        END as category,
        CASE 
            WHEN ab.account_type IN ('CURRENT_ASSET', 'CURRENT_LIABILITY') THEN 'CURRENT'::TEXT
            WHEN ab.account_type IN ('FIXED_ASSET', 'NON_CURRENT_ASSET', 'LONG_TERM_LIABILITY', 'NON_CURRENT_LIABILITY') THEN 'NON_CURRENT'::TEXT
            WHEN ab.account_type = 'RETAINED_EARNINGS' THEN 'RETAINED_EARNINGS'::TEXT
            WHEN ab.account_type IN ('EQUITY', 'CAPITAL') THEN 'CAPITAL'::TEXT
            ELSE 'GENERAL'::TEXT
        END as subcategory
    FROM account_balances ab
    WHERE ABS(
        CASE 
            WHEN ab.account_type IN ('ASSET', 'CURRENT_ASSET', 'FIXED_ASSET', 'NON_CURRENT_ASSET') THEN 
                ab.cumulative_debits - ab.cumulative_credits
            WHEN ab.account_type IN ('LIABILITY', 'CURRENT_LIABILITY', 'LONG_TERM_LIABILITY', 'NON_CURRENT_LIABILITY') THEN 
                ab.cumulative_credits - ab.cumulative_debits
            WHEN ab.account_type IN ('EQUITY', 'RETAINED_EARNINGS', 'CAPITAL') THEN 
                ab.cumulative_credits - ab.cumulative_debits
            ELSE 0
        END
    ) > 0.01
    ORDER BY 
        CASE ab.account_type 
            WHEN 'CURRENT_ASSET' THEN 1
            WHEN 'FIXED_ASSET' THEN 2
            WHEN 'NON_CURRENT_ASSET' THEN 3
            WHEN 'ASSET' THEN 4
            WHEN 'CURRENT_LIABILITY' THEN 5
            WHEN 'LONG_TERM_LIABILITY' THEN 6
            WHEN 'NON_CURRENT_LIABILITY' THEN 7
            WHEN 'LIABILITY' THEN 8
            WHEN 'EQUITY' THEN 9
            WHEN 'CAPITAL' THEN 10
            WHEN 'RETAINED_EARNINGS' THEN 11
            ELSE 12
        END,
        ab.account_code;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_income_statement(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_balance_sheet(UUID, DATE) TO authenticated;

SELECT 'Financial statement functions fixed to use UUID parameters' as status;
