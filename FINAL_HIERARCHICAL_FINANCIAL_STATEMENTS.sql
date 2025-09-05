-- Enhanced Financial Statements with Hierarchical Account Structure
-- Shows parent accounts with collapsible sub-accounts
-- Fixed data type mismatch in recursive query

DROP FUNCTION IF EXISTS get_hierarchical_income_statement(UUID, DATE, DATE);
DROP FUNCTION IF EXISTS get_hierarchical_balance_sheet(UUID, DATE);

-- Hierarchical Income Statement - shows parent accounts and sub-accounts
CREATE OR REPLACE FUNCTION get_hierarchical_income_statement(
    p_company_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    account_id UUID,
    account_code TEXT,
    account_name TEXT,
    account_type TEXT,
    parent_account_id UUID,
    parent_account_code TEXT,
    parent_account_name TEXT,
    is_group BOOLEAN,
    level_depth INTEGER,
    amount NUMERIC,
    category TEXT,
    sort_order TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE account_hierarchy AS (
        -- Base case: Root accounts (no parent)
        SELECT 
            coa.id,
            coa.account_code,
            coa.account_name,
            coa.account_type,
            coa.parent_account_id,
            CAST(NULL AS TEXT) as parent_code,
            CAST(NULL AS TEXT) as parent_name,
            coa.is_group,
            0 as level_depth,
            CAST(coa.account_code AS TEXT) as sort_path
        FROM chart_of_accounts coa
        WHERE coa.company_id = p_company_id
        AND coa.parent_account_id IS NULL
        AND coa.account_type IN ('REVENUE', 'INCOME', 'EXPENSE', 'COST_OF_GOODS_SOLD', 'OTHER_INCOME', 'OTHER_EXPENSE')
        AND coa.is_active = true
        
        UNION ALL
        
        -- Recursive case: Child accounts
        SELECT 
            c.id,
            c.account_code,
            c.account_name,
            c.account_type,
            c.parent_account_id,
            p.account_code as parent_code,
            p.account_name as parent_name,
            c.is_group,
            ah.level_depth + 1,
            CAST(ah.sort_path || '.' || c.account_code AS TEXT) as sort_path
        FROM chart_of_accounts c
        INNER JOIN account_hierarchy ah ON c.parent_account_id = ah.id
        INNER JOIN chart_of_accounts p ON c.parent_account_id = p.id
        WHERE c.company_id = p_company_id
        AND c.is_active = true
    ),
    account_balances AS (
        SELECT 
            ah.id as account_id,
            ah.account_code,
            ah.account_name,
            ah.account_type,
            ah.parent_account_id,
            ah.parent_code,
            ah.parent_name,
            ah.is_group,
            ah.level_depth,
            ah.sort_path,
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
        FROM account_hierarchy ah
        LEFT JOIN journal_entry_lines jel ON ah.id = jel.account_id
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id 
            AND je.company_id = p_company_id 
            AND je.status = 'POSTED'
        GROUP BY ah.id, ah.account_code, ah.account_name, ah.account_type, 
                 ah.parent_account_id, ah.parent_code, ah.parent_name, 
                 ah.is_group, ah.level_depth, ah.sort_path
    )
    SELECT 
        ab.account_id,
        ab.account_code::TEXT,
        ab.account_name::TEXT,
        ab.account_type::TEXT,
        ab.parent_account_id,
        ab.parent_code::TEXT,
        ab.parent_name::TEXT,
        ab.is_group,
        ab.level_depth,
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
        END as category,
        ab.sort_path::TEXT as sort_order
    FROM account_balances ab
    WHERE (
        -- Include group accounts (even with zero balance for structure)
        ab.is_group = true
        OR 
        -- Include non-group accounts with balance
        (ab.is_group = false AND ABS(
            CASE 
                WHEN ab.account_type IN ('REVENUE', 'INCOME', 'OTHER_INCOME') THEN 
                    ab.period_credits - ab.period_debits
                WHEN ab.account_type IN ('EXPENSE', 'COST_OF_GOODS_SOLD', 'OTHER_EXPENSE') THEN 
                    ab.period_debits - ab.period_credits
                ELSE 0
            END
        ) > 0.01)
    )
    ORDER BY ab.sort_path;
END;
$$ LANGUAGE plpgsql;

-- Hierarchical Balance Sheet - shows parent accounts and sub-accounts
CREATE OR REPLACE FUNCTION get_hierarchical_balance_sheet(
    p_company_id UUID,
    p_as_of_date DATE
)
RETURNS TABLE (
    account_id UUID,
    account_code TEXT,
    account_name TEXT,
    account_type TEXT,
    parent_account_id UUID,
    parent_account_code TEXT,
    parent_account_name TEXT,
    is_group BOOLEAN,
    level_depth INTEGER,
    amount NUMERIC,
    category TEXT,
    subcategory TEXT,
    sort_order TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE account_hierarchy AS (
        -- Base case: Root accounts (no parent)
        SELECT 
            coa.id,
            coa.account_code,
            coa.account_name,
            coa.account_type,
            coa.parent_account_id,
            CAST(NULL AS TEXT) as parent_code,
            CAST(NULL AS TEXT) as parent_name,
            coa.is_group,
            0 as level_depth,
            CAST(coa.account_code AS TEXT) as sort_path
        FROM chart_of_accounts coa
        WHERE coa.company_id = p_company_id
        AND coa.parent_account_id IS NULL
        AND coa.account_type IN (
            'ASSET', 'CURRENT_ASSET', 'FIXED_ASSET', 'NON_CURRENT_ASSET',
            'LIABILITY', 'CURRENT_LIABILITY', 'LONG_TERM_LIABILITY', 'NON_CURRENT_LIABILITY',
            'EQUITY', 'RETAINED_EARNINGS', 'CAPITAL'
        )
        AND coa.is_active = true
        
        UNION ALL
        
        -- Recursive case: Child accounts
        SELECT 
            c.id,
            c.account_code,
            c.account_name,
            c.account_type,
            c.parent_account_id,
            p.account_code as parent_code,
            p.account_name as parent_name,
            c.is_group,
            ah.level_depth + 1,
            CAST(ah.sort_path || '.' || c.account_code AS TEXT) as sort_path
        FROM chart_of_accounts c
        INNER JOIN account_hierarchy ah ON c.parent_account_id = ah.id
        INNER JOIN chart_of_accounts p ON c.parent_account_id = p.id
        WHERE c.company_id = p_company_id
        AND c.is_active = true
    ),
    account_balances AS (
        SELECT 
            ah.id as account_id,
            ah.account_code,
            ah.account_name,
            ah.account_type,
            ah.parent_account_id,
            ah.parent_code,
            ah.parent_name,
            ah.is_group,
            ah.level_depth,
            ah.sort_path,
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
        FROM account_hierarchy ah
        LEFT JOIN journal_entry_lines jel ON ah.id = jel.account_id
        LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id 
            AND je.company_id = p_company_id 
            AND je.status = 'POSTED'
        GROUP BY ah.id, ah.account_code, ah.account_name, ah.account_type, 
                 ah.parent_account_id, ah.parent_code, ah.parent_name, 
                 ah.is_group, ah.level_depth, ah.sort_path
    )
    SELECT 
        ab.account_id,
        ab.account_code::TEXT,
        ab.account_name::TEXT,
        ab.account_type::TEXT,
        ab.parent_account_id,
        ab.parent_code::TEXT,
        ab.parent_name::TEXT,
        ab.is_group,
        ab.level_depth,
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
        END as subcategory,
        ab.sort_path::TEXT as sort_order
    FROM account_balances ab
    WHERE (
        -- Include group accounts (even with zero balance for structure)
        ab.is_group = true
        OR 
        -- Include non-group accounts with balance
        (ab.is_group = false AND ABS(
            CASE 
                WHEN ab.account_type IN ('ASSET', 'CURRENT_ASSET', 'FIXED_ASSET', 'NON_CURRENT_ASSET') THEN 
                    ab.cumulative_debits - ab.cumulative_credits
                WHEN ab.account_type IN ('LIABILITY', 'CURRENT_LIABILITY', 'LONG_TERM_LIABILITY', 'NON_CURRENT_LIABILITY') THEN 
                    ab.cumulative_credits - ab.cumulative_debits
                WHEN ab.account_type IN ('EQUITY', 'RETAINED_EARNINGS', 'CAPITAL') THEN 
                    ab.cumulative_credits - ab.cumulative_debits
                ELSE 0
            END
        ) > 0.01)
    )
    ORDER BY ab.sort_path;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_hierarchical_income_statement(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_hierarchical_balance_sheet(UUID, DATE) TO authenticated;

SELECT 'Final hierarchical financial statement functions created successfully' as status;
