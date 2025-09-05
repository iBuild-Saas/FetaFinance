-- Test Financial Summary Function
-- This will help us debug what's going wrong

-- First, check if the functions exist
SELECT 'Checking if functions exist...' as status;

SELECT proname, pronargs 
FROM pg_proc 
WHERE proname IN ('get_hierarchical_income_statement', 'get_hierarchical_balance_sheet', 'get_financial_summary');

-- Test the hierarchical income statement function
SELECT 'Testing hierarchical income statement...' as status;

SELECT COUNT(*) as income_statement_rows
FROM get_hierarchical_income_statement(
    'c6ad1436-6474-43a8-b2e8-f1d078cd0cab'::UUID,
    '2024-01-01'::DATE,
    '2024-12-31'::DATE
);

-- Test the hierarchical balance sheet function  
SELECT 'Testing hierarchical balance sheet...' as status;

SELECT COUNT(*) as balance_sheet_rows
FROM get_hierarchical_balance_sheet(
    'c6ad1436-6474-43a8-b2e8-f1d078cd0cab'::UUID,
    '2024-12-31'::DATE
);

-- Test the financial summary function
SELECT 'Testing financial summary...' as status;

SELECT *
FROM get_financial_summary(
    'c6ad1436-6474-43a8-b2e8-f1d078cd0cab'::UUID,
    '2024-01-01'::DATE,
    '2024-12-31'::DATE
);

SELECT 'Test completed' as status;
