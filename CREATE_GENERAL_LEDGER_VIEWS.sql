-- Create General Ledger Views and Functions
-- This script creates views and functions to generate a comprehensive General Ledger

-- Create a view that combines all journal entry lines with account details
CREATE OR REPLACE VIEW general_ledger_view AS
SELECT 
    jel.id as line_id,
    je.id as journal_entry_id,
    je.entry_number,
    je.entry_date,
    je.reference,
    je.memo as journal_memo,
    je.status as entry_status,
    je.company_id,
    coa.id as account_id,
    coa.account_code,
    coa.account_name,
    coa.account_type,
    coa.normal_balance,
    jel.line_number,
    jel.description as line_description,
    jel.debit_amount,
    jel.credit_amount,
    -- Calculate the effect on account balance based on normal balance
    CASE 
        WHEN coa.normal_balance = 'DEBIT' THEN jel.debit_amount - jel.credit_amount
        WHEN coa.normal_balance = 'CREDIT' THEN jel.credit_amount - jel.debit_amount
        ELSE 0
    END as balance_effect,
    jel.created_at as line_created_at,
    je.created_at as entry_created_at
FROM journal_entry_lines jel
JOIN journal_entries je ON jel.journal_entry_id = je.id
JOIN chart_of_accounts coa ON jel.account_id = coa.id
WHERE je.is_active = true 
AND coa.is_active = true
ORDER BY je.entry_date, je.entry_number, jel.line_number;

-- Create a function to get general ledger for a specific account
CREATE OR REPLACE FUNCTION get_account_ledger(
    p_account_id UUID,
    p_company_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    line_id UUID,
    journal_entry_id UUID,
    entry_number VARCHAR,
    entry_date DATE,
    reference VARCHAR,
    journal_memo TEXT,
    line_description TEXT,
    debit_amount DECIMAL,
    credit_amount DECIMAL,
    running_balance DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH ledger_entries AS (
        SELECT 
            gl.line_id,
            gl.journal_entry_id,
            gl.entry_number,
            gl.entry_date,
            gl.reference,
            gl.journal_memo,
            gl.line_description,
            gl.debit_amount,
            gl.credit_amount,
            gl.balance_effect
        FROM general_ledger_view gl
        WHERE gl.account_id = p_account_id
        AND gl.company_id = p_company_id
        AND (p_start_date IS NULL OR gl.entry_date >= p_start_date)
        AND (p_end_date IS NULL OR gl.entry_date <= p_end_date)
        AND gl.entry_status = 'POSTED'
        ORDER BY gl.entry_date, gl.entry_number, gl.line_number
    )
    SELECT 
        le.line_id,
        le.journal_entry_id,
        le.entry_number,
        le.entry_date,
        le.reference,
        le.journal_memo,
        le.line_description,
        le.debit_amount,
        le.credit_amount,
        SUM(le.balance_effect) OVER (ORDER BY le.entry_date, le.entry_number) as running_balance
    FROM ledger_entries le;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get trial balance
CREATE OR REPLACE FUNCTION get_trial_balance(
    p_company_id UUID,
    p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    account_id UUID,
    account_code VARCHAR,
    account_name VARCHAR,
    account_type VARCHAR,
    normal_balance VARCHAR,
    debit_total DECIMAL,
    credit_total DECIMAL,
    balance DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        coa.id as account_id,
        coa.account_code,
        coa.account_name,
        coa.account_type,
        coa.normal_balance,
        COALESCE(SUM(gl.debit_amount), 0) as debit_total,
        COALESCE(SUM(gl.credit_amount), 0) as credit_total,
        CASE 
            WHEN coa.normal_balance = 'DEBIT' THEN 
                COALESCE(SUM(gl.debit_amount), 0) - COALESCE(SUM(gl.credit_amount), 0)
            WHEN coa.normal_balance = 'CREDIT' THEN 
                COALESCE(SUM(gl.credit_amount), 0) - COALESCE(SUM(gl.debit_amount), 0)
            ELSE 0
        END as balance
    FROM chart_of_accounts coa
    LEFT JOIN general_ledger_view gl ON coa.id = gl.account_id 
        AND gl.company_id = p_company_id
        AND gl.entry_date <= p_as_of_date
        AND gl.entry_status = 'POSTED'
    WHERE coa.company_id = p_company_id
    AND coa.is_active = true
    GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type, coa.normal_balance
    HAVING COALESCE(SUM(gl.debit_amount), 0) > 0 OR COALESCE(SUM(gl.credit_amount), 0) > 0
    ORDER BY coa.account_code;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get account balance as of a specific date
CREATE OR REPLACE FUNCTION get_account_balance(
    p_account_id UUID,
    p_company_id UUID,
    p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL AS $$
DECLARE
    account_balance DECIMAL := 0;
    account_normal_balance VARCHAR;
BEGIN
    -- Get the account's normal balance type
    SELECT normal_balance INTO account_normal_balance
    FROM chart_of_accounts
    WHERE id = p_account_id AND company_id = p_company_id;
    
    -- Calculate balance based on normal balance type
    SELECT 
        CASE 
            WHEN account_normal_balance = 'DEBIT' THEN 
                COALESCE(SUM(gl.debit_amount), 0) - COALESCE(SUM(gl.credit_amount), 0)
            WHEN account_normal_balance = 'CREDIT' THEN 
                COALESCE(SUM(gl.credit_amount), 0) - COALESCE(SUM(gl.debit_amount), 0)
            ELSE 0
        END
    INTO account_balance
    FROM general_ledger_view gl
    WHERE gl.account_id = p_account_id
    AND gl.company_id = p_company_id
    AND gl.entry_date <= p_as_of_date
    AND gl.entry_status = 'POSTED';
    
    RETURN COALESCE(account_balance, 0);
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_general_ledger_company_date ON journal_entries(company_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_general_ledger_account_date ON journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_general_ledger_status ON journal_entries(status);

-- Add comments for documentation
COMMENT ON VIEW general_ledger_view IS 'Comprehensive view of all journal entries with account details and balance effects';
COMMENT ON FUNCTION get_account_ledger IS 'Returns detailed ledger for a specific account with running balances';
COMMENT ON FUNCTION get_trial_balance IS 'Returns trial balance showing all account balances as of a specific date';
COMMENT ON FUNCTION get_account_balance IS 'Returns the balance of a specific account as of a given date';

-- Test the views and functions
SELECT 'General Ledger Views and Functions Created Successfully!' as status;
