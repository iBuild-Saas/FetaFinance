-- Add is_active column to journal_entries table

-- Check if is_active column already exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'journal_entries' 
        AND column_name = 'is_active'
    ) THEN
        -- Add is_active column with default value true
        ALTER TABLE journal_entries 
        ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;
        
        -- Update all existing records to be active
        UPDATE journal_entries SET is_active = true;
        
        RAISE NOTICE 'Added is_active column to journal_entries table';
    ELSE
        RAISE NOTICE 'is_active column already exists in journal_entries table';
    END IF;
END $$;

-- Verify the column was added
SELECT 'JOURNAL ENTRIES TABLE STRUCTURE' as section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'journal_entries' 
ORDER BY ordinal_position;

-- Show recent journal entries
SELECT 'RECENT JOURNAL ENTRIES' as section;
SELECT 
    je.id,
    je.description,
    je.company_id,
    je.is_active,
    je.reference_type,
    je.reference_id,
    je.reference_number,
    je.created_at
FROM journal_entries je
ORDER BY je.created_at DESC
LIMIT 5;
