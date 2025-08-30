-- Create General Ledger views for each company based on journal entries
-- Company-specific account ledger entries

-- 1. GENERAL LEDGER VIEW BY COMPANY AND ACCOUNT
-- This creates a proper general ledger showing all transactions for each account by company
CREATE OR REPLACE VIEW general_ledger_view AS
SELECT 
    je.company_id,
    c.name as company_name,
    je.entry_date,
    je.entry_number,
    coa.account_code,
    coa.account_name,
    coa.account_type,
    jel.line_number,
    COALESCE(jel.description, je.description) as description,
    jel.debit_amount,
    jel.credit_amount,
    -- Running balance calculation
    SUM(COALESCE(jel.debit_amount, 0) - COALESCE(jel.credit_amount, 0)) 
        OVER (PARTITION BY je.company_id, jel.account_id 
              ORDER BY je.entry_date, je.entry_number, jel.line_number 
              ROWS UNBOUNDED PRECEDING) as running_balance,
    je.reference_type,
    je.reference_number,
    je.status as entry_status
FROM journal_entries je
JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
JOIN chart_of_accounts coa ON jel.account_id = coa.id
JOIN companies c ON je.company_id = c.id
WHERE je.status = 'POSTED';

-- 2. ACCOUNT LEDGER VIEW (Detailed ledger for specific account)
-- Shows all transactions for a specific account with running balance
CREATE OR REPLACE VIEW account_ledger_view AS
SELECT 
    je.company_id,
    c.name as company_name,
    coa.account_code,
    coa.account_name,
    je.entry_date,
    je.entry_number,
    COALESCE(jel.description, je.description) as description,
    jel.debit_amount,
    jel.credit_amount,
    COALESCE(jel.debit_amount, 0) - COALESCE(jel.credit_amount, 0) as net_amount,
    -- Running balance for this account
    SUM(COALESCE(jel.debit_amount, 0) - COALESCE(jel.credit_amount, 0)) 
        OVER (PARTITION BY je.company_id, jel.account_id 
              ORDER BY je.entry_date, je.entry_number, jel.line_number 
              ROWS UNBOUNDED PRECEDING) as account_balance,
    je.reference_type,
    je.reference_number
FROM journal_entries je
JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
JOIN chart_of_accounts coa ON jel.account_id = coa.id
JOIN companies c ON je.company_id = c.id
WHERE je.status = 'POSTED';

-- 3. TRIAL BALANCE VIEW BY COMPANY
CREATE OR REPLACE VIEW trial_balance_view AS
SELECT 
    je.company_id,
    c.name as company_name,
    coa.account_code,
    coa.account_name,
    coa.account_type,
    SUM(COALESCE(jel.debit_amount, 0)) as total_debits,
    SUM(COALESCE(jel.credit_amount, 0)) as total_credits,
    SUM(COALESCE(jel.debit_amount, 0)) - SUM(COALESCE(jel.credit_amount, 0)) as balance
FROM journal_entries je
JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
JOIN chart_of_accounts coa ON jel.account_id = coa.id
JOIN companies c ON je.company_id = c.id
WHERE je.status = 'POSTED'
GROUP BY je.company_id, c.name, coa.account_code, coa.account_name, coa.account_type, jel.account_id
HAVING SUM(COALESCE(jel.debit_amount, 0)) > 0 OR SUM(COALESCE(jel.credit_amount, 0)) > 0;

-- 4. USAGE EXAMPLES FOR FRONTEND

-- Get General Ledger for specific company
/*
SELECT * FROM general_ledger_view 
WHERE company_id = 'your-company-id'
AND entry_date BETWEEN '2023-01-01' AND '2025-12-31'
ORDER BY entry_date DESC, entry_number DESC, line_number ASC;
*/

-- Get Account Ledger for specific account and company
/*
SELECT * FROM account_ledger_view 
WHERE company_id = 'your-company-id'
AND account_code = '1100'  -- or specific account
AND entry_date BETWEEN '2023-01-01' AND '2025-12-31'
ORDER BY entry_date ASC, entry_number ASC;
*/

-- Get Trial Balance for specific company
/*
SELECT * FROM trial_balance_view 
WHERE company_id = 'your-company-id'
ORDER BY account_code;
*/

-- 5. TEST THE VIEWS WITH ACTUAL DATA

-- Test General Ledger View
SELECT 
    'General Ledger Test:' as test,
    COUNT(*) as total_entries
FROM general_ledger_view;

-- Show sample general ledger entries
SELECT 
    company_name,
    entry_date,
    entry_number,
    account_code,
    account_name,
    description,
    debit_amount,
    credit_amount,
    running_balance
FROM general_ledger_view 
ORDER BY entry_date DESC, entry_number DESC
LIMIT 20;

-- Test Trial Balance View
SELECT 
    'Trial Balance Test:' as test,
    company_name,
    account_code,
    account_name,
    total_debits,
    total_credits,
    balance
FROM trial_balance_view 
ORDER BY company_name, account_code
LIMIT 20;

-- 6. GRANT PERMISSIONS
GRANT SELECT ON general_ledger_view TO authenticated;
GRANT SELECT ON account_ledger_view TO authenticated;
GRANT SELECT ON trial_balance_view TO authenticated;

SELECT 'Company-specific General Ledger views created successfully' as status;
