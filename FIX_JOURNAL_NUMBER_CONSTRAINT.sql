-- =====================================================
-- FIX JOURNAL_NUMBER CONSTRAINT ISSUE
-- =====================================================
-- This script fixes the journal_number NOT NULL constraint issue

-- Check current constraints on journal_number
SELECT '=== CURRENT JOURNAL_NUMBER CONSTRAINTS ===' as info;

SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'journal_entries'::regclass 
AND conname LIKE '%journal_number%';

-- Check if journal_number column exists and its properties
SELECT '=== JOURNAL_NUMBER COLUMN PROPERTIES ===' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'journal_entries' 
AND column_name = 'journal_number';

-- Option 1: Make journal_number nullable (if it's not needed)
-- ALTER TABLE journal_entries ALTER COLUMN journal_number DROP NOT NULL;

-- Option 2: Add a default value to journal_number
-- ALTER TABLE journal_entries ALTER COLUMN journal_number SET DEFAULT 'AUTO-' || gen_random_uuid()::text;

-- Option 3: Drop the journal_number column entirely if it's not needed
-- ALTER TABLE journal_entries DROP COLUMN IF EXISTS journal_number;

-- For now, let's make it nullable to avoid the constraint error
SELECT '=== APPLYING FIX ===' as info;

-- Make journal_number nullable
ALTER TABLE journal_entries ALTER COLUMN journal_number DROP NOT NULL;

-- Verify the fix
SELECT '=== VERIFYING FIX ===' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'journal_entries' 
AND column_name = 'journal_number';

-- Test if we can now insert without journal_number
SELECT '=== TESTING INSERT WITHOUT JOURNAL_NUMBER ===' as info;

DO $$
DECLARE
    test_company_id UUID;
    test_entry_id UUID;
BEGIN
    -- Get a company ID
    SELECT id INTO test_company_id FROM companies LIMIT 1;
    
    IF test_company_id IS NULL THEN
        RAISE NOTICE 'No companies found to test with';
        RETURN;
    END IF;
    
    -- Try to insert a test entry without journal_number
    INSERT INTO journal_entries (
        id, company_id, entry_number, entry_date, reference, memo, status,
        total_debit, total_credit, is_balanced, is_active,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), test_company_id, 'TEST-002', CURRENT_DATE,
        'test:constraint_fix', 'Test journal entry after constraint fix', 'POSTED',
        200.00, 200.00, true, true,
        NOW(), NOW()
    ) RETURNING id INTO test_entry_id;
    
    RAISE NOTICE '✅ Successfully created test journal entry with ID: %', test_entry_id;
    
    -- Clean up test entry
    DELETE FROM journal_entries WHERE id = test_entry_id;
    RAISE NOTICE 'Test entry cleaned up';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error creating test journal entry: %', SQLERRM;
END $$;

SELECT '=== CONSTRAINT FIX COMPLETE ===' as info;
SELECT 'The journal_number constraint issue should now be resolved.' as message;
