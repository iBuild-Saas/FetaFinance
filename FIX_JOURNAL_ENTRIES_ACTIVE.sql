-- Fix Journal Entries Active Status
-- Update journal entries to have is_active = true

-- === BEFORE: Check current is_active status ===
SELECT 'BEFORE: Current is_active status' as section;
SELECT 
    is_active,
    COUNT(*) as count
FROM journal_entries 
GROUP BY is_active;

-- === FIX: Update NULL or false is_active to true ===
SELECT 'FIX: Updating is_active to true' as section;
UPDATE journal_entries 
SET 
    is_active = true,
    updated_at = NOW()
WHERE is_active IS NULL OR is_active = false;

-- === AFTER: Check updated is_active status ===
SELECT 'AFTER: Updated is_active status' as section;
SELECT 
    is_active,
    COUNT(*) as count
FROM journal_entries 
GROUP BY is_active;

-- === VERIFY: Show recent journal entries ===
SELECT 'VERIFY: Recent journal entries' as section;
SELECT 
    je.id,
    je.entry_number,
    je.entry_date,
    je.description,
    je.is_active,
    je.reference_type,
    je.reference_number,
    je.created_at
FROM journal_entries je
ORDER BY je.created_at DESC
LIMIT 5;
