-- Simple debug script to check sales invoice table structure
-- and identify the 400 error cause

-- Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'sales_invoices'
ORDER BY ordinal_position;

-- Check if required tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('companies', 'customers', 'sales_invoices');

-- Test basic select to verify table access
SELECT COUNT(*) as total_invoices FROM sales_invoices;

-- Check for any existing invoices to see data format
SELECT * FROM sales_invoices LIMIT 1;
