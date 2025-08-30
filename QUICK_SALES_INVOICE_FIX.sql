-- Quick fix for sales invoice 400 error
-- Based on the console output, the data looks correct but there might be a constraint issue

-- First, let's check what's actually in the sales_invoices table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'sales_invoices'
ORDER BY ordinal_position;

-- Check if the customer_id and company_id exist
SELECT 'Checking if customer exists:' as check_type, 
       CASE WHEN EXISTS(SELECT 1 FROM customers WHERE id = '1bc5a61e-04d9-4e58-863b-ff2594dd8efd') 
            THEN 'EXISTS' ELSE 'NOT FOUND' END as result;

SELECT 'Checking if company exists:' as check_type,
       CASE WHEN EXISTS(SELECT 1 FROM companies WHERE id = 'c6ad1436-6474-43a8-b2e8-f1d078cd0cab') 
            THEN 'EXISTS' ELSE 'NOT FOUND' END as result;

-- Check for unique constraint on invoice_number
SELECT 'Checking for duplicate invoice number:' as check_type,
       CASE WHEN EXISTS(SELECT 1 FROM sales_invoices WHERE invoice_number LIKE 'INV-%') 
            THEN 'DUPLICATES EXIST' ELSE 'NO DUPLICATES' END as result;

-- Try a simple insert test with minimal data
INSERT INTO sales_invoices (
    customer_id,
    company_id,
    invoice_number,
    invoice_date,
    due_date,
    status,
    subtotal,
    tax_amount,
    discount_amount,
    total_amount
) VALUES (
    '1bc5a61e-04d9-4e58-863b-ff2594dd8efd',
    'c6ad1436-6474-43a8-b2e8-f1d078cd0cab',
    'TEST-' || extract(epoch from now())::text,
    '2025-08-30',
    '2025-09-29',
    'DRAFT',
    1000,
    0,
    0,
    1000
);

-- If the above works, the issue might be with the specific fields or constraints
