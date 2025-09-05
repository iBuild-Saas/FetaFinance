-- Check the mismatch between frontend company data and database company data

-- 1. Check what's actually in the companies table
SELECT 'Companies in database:' as check_type;
SELECT id, name, created_at FROM companies ORDER BY name;

-- 2. Check if there's a separate table storing the numeric IDs
SELECT 'Check for other company-related tables:' as check_type;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%company%' OR table_name LIKE '%companies%'
ORDER BY table_name;

-- 3. Check if companies table has both UUID and numeric ID fields
SELECT 'Companies table structure:' as check_type;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'companies'
ORDER BY ordinal_position;

-- 4. Check if there's a mapping between the numeric IDs and UUIDs
SELECT 'Sample companies data with all fields:' as check_type;
SELECT * FROM companies LIMIT 3;
