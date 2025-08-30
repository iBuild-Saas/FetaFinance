-- Fix general ledger and trial balance not showing journal entries

-- 1. Check if the general ledger view/query is looking at the right tables
-- First, let's see what data exists

-- Check journal entries with proper date filtering
SELECT 
    je.id,
    je.entry_number,
    je.entry_date,
    je.description,
    je.status,
    jel.account_id,
    jel.debit_amount,
    jel.credit_amount,
    jel.description as line_description
FROM journal_entries je
JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
WHERE je.entry_date BETWEEN '2023-01-01' AND '2025-12-31'
AND je.status = 'POSTED'
ORDER BY je.entry_date DESC, je.entry_number DESC;

-- 2. Check if accounts table exists and has proper relationships
SELECT 
    a.id as account_id,
    a.account_code,
    a.account_name,
    COUNT(jel.id) as journal_line_count
FROM chart_of_accounts a
LEFT JOIN journal_entry_lines jel ON a.id = jel.account_id
GROUP BY a.id, a.account_code, a.account_name
HAVING COUNT(jel.id) > 0
ORDER BY journal_line_count DESC;

-- 3. Create a proper general ledger view query
SELECT 
    je.entry_date as date,
    je.entry_number as entry_number,
    coa.account_code || ' - ' || coa.account_name as account,
    jel.description,
    jel.debit_amount as debit,
    jel.credit_amount as credit
FROM journal_entries je
JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
JOIN chart_of_accounts coa ON jel.account_id = coa.id
WHERE je.status = 'POSTED'
AND je.entry_date BETWEEN '2023-01-01' AND '2025-12-31'
ORDER BY je.entry_date DESC, je.entry_number DESC, jel.line_number;

-- 4. Create trial balance query
SELECT 
    coa.account_code,
    coa.account_name,
    SUM(jel.debit_amount) as total_debits,
    SUM(jel.credit_amount) as total_credits,
    SUM(jel.debit_amount) - SUM(jel.credit_amount) as balance
FROM chart_of_accounts coa
LEFT JOIN journal_entry_lines jel ON coa.id = jel.account_id
LEFT JOIN journal_entries je ON jel.journal_entry_id = je.id
WHERE je.status = 'POSTED' OR je.status IS NULL
AND (je.entry_date BETWEEN '2023-01-01' AND '2025-12-31' OR je.entry_date IS NULL)
GROUP BY coa.id, coa.account_code, coa.account_name
HAVING SUM(jel.debit_amount) > 0 OR SUM(jel.credit_amount) > 0
ORDER BY coa.account_code;

-- 5. Check if there are any issues with the journal entry creation
SELECT 
    'Recent sales invoices and their journal entries:' as info;

SELECT 
    si.invoice_number,
    si.status,
    si.total_amount,
    si.created_at as invoice_created,
    je.entry_number,
    je.status as journal_status,
    je.created_at as journal_created
FROM sales_invoices si
LEFT JOIN journal_entries je ON je.reference_id = si.id AND je.reference_type = 'sales_invoice'
WHERE si.status = 'SUBMITTED'
ORDER BY si.created_at DESC
LIMIT 10;
