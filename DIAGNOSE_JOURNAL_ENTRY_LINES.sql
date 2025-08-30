-- Diagnose Journal Entry Lines Issue
-- Check why journal entries have no lines

-- === JOURNAL ENTRIES TABLE STRUCTURE ===
SELECT 'JOURNAL ENTRIES TABLE STRUCTURE' as section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'journal_entries' 
ORDER BY ordinal_position;

-- === JOURNAL ENTRY LINES TABLE STRUCTURE ===
SELECT 'JOURNAL ENTRY LINES TABLE STRUCTURE' as section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'journal_entry_lines' 
ORDER BY ordinal_position;

-- === RECENT JOURNAL ENTRIES ===
SELECT 'RECENT JOURNAL ENTRIES' as section;
SELECT 
    je.id,
    je.description,
    je.company_id,
    je.reference_type,
    je.reference_id,
    je.reference_number,
    je.created_at
FROM journal_entries je
ORDER BY je.created_at DESC
LIMIT 5;

-- === JOURNAL ENTRY LINES COUNT ===
SELECT 'JOURNAL ENTRY LINES COUNT' as section;
SELECT 
    je.id as journal_entry_id,
    je.description,
    COUNT(jel.id) as line_count,
    SUM(jel.debit_amount) as total_debits,
    SUM(jel.credit_amount) as total_credits
FROM journal_entries je
LEFT JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
GROUP BY je.id, je.description
ORDER BY je.created_at DESC
LIMIT 10;

-- === RECENT JOURNAL ENTRY LINES ===
SELECT 'RECENT JOURNAL ENTRY LINES' as section;
SELECT 
    jel.id,
    jel.journal_entry_id,
    jel.account_id,
    coa.account_name,
    -- jel.line_number, -- Column doesn't exist
    jel.debit_amount,
    jel.credit_amount,
    jel.description,
    jel.created_at
FROM journal_entry_lines jel
LEFT JOIN chart_of_accounts coa ON jel.account_id = coa.id
ORDER BY jel.created_at DESC
LIMIT 10;

-- === CHECK PURCHASE INVOICE JOURNAL FUNCTION ===
SELECT 'PURCHASE INVOICE JOURNAL FUNCTION' as section;
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'create_purchase_invoice_journal_entry'
AND n.nspname = 'public';
