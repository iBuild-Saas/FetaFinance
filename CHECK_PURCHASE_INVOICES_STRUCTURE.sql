-- Check Purchase Invoices Table Structure
-- Find out what fields actually exist in the purchase_invoices table

-- Show the actual table structure
SELECT 'PURCHASE INVOICES TABLE STRUCTURE' as section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'purchase_invoices' 
ORDER BY ordinal_position;

-- Show sample data to see what fields have values
SELECT 'SAMPLE PURCHASE INVOICES DATA' as section;
SELECT * FROM purchase_invoices LIMIT 2;
