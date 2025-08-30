-- Check what columns actually exist in journal_entries table

-- Show the actual table structure
SELECT 'JOURNAL ENTRIES TABLE STRUCTURE' as section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'journal_entries' 
ORDER BY ordinal_position;

-- Show sample data with only existing columns
SELECT 'SAMPLE JOURNAL ENTRIES DATA' as section;
SELECT * FROM journal_entries LIMIT 3;
