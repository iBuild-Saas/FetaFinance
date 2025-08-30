-- Diagnose Journal Entries Issue
-- Check what's actually in the journal_entries table

-- === JOURNAL ENTRIES TABLE STRUCTURE ===
SELECT 'JOURNAL ENTRIES TABLE STRUCTURE' as section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'journal_entries' 
ORDER BY ordinal_position;

-- === ALL JOURNAL ENTRIES (regardless of is_active) ===
SELECT 'ALL JOURNAL ENTRIES' as section;
SELECT 
    je.id,
    je.entry_number,
    je.entry_date,
    je.description,
    je.company_id,
    je.is_active,
    je.reference_type,
    je.reference_id,
    je.reference_number,
    je.status,
    je.created_at,
    je.updated_at
FROM journal_entries je
ORDER BY je.created_at DESC
LIMIT 10;

-- === JOURNAL ENTRIES WITH is_active = true ===
SELECT 'JOURNAL ENTRIES WITH is_active = true' as section;
SELECT 
    je.id,
    je.entry_number,
    je.entry_date,
    je.description,
    je.company_id,
    je.is_active,
    je.reference_type,
    je.reference_id,
    je.reference_number
FROM journal_entries je
WHERE je.is_active = true
ORDER BY je.created_at DESC
LIMIT 10;

-- === JOURNAL ENTRIES WITH is_active IS NULL ===
SELECT 'JOURNAL ENTRIES WITH is_active IS NULL' as section;
SELECT 
    je.id,
    je.entry_number,
    je.entry_date,
    je.description,
    je.company_id,
    je.is_active,
    je.reference_type,
    je.reference_id,
    je.reference_number
FROM journal_entries je
WHERE je.is_active IS NULL
ORDER BY je.created_at DESC
LIMIT 10;

-- === RECENT JOURNAL ENTRY LINES ===
SELECT 'RECENT JOURNAL ENTRY LINES' as section;
SELECT 
    jel.id,
    jel.journal_entry_id,
    jel.account_id,
    coa.account_name,
    jel.line_number,
    jel.debit_amount,
    jel.credit_amount,
    jel.description,
    jel.created_at
FROM journal_entry_lines jel
LEFT JOIN chart_of_accounts coa ON jel.account_id = coa.id
ORDER BY jel.created_at DESC
LIMIT 10;
