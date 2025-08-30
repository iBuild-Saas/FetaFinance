-- Diagnose the exact cause of the 400 error

-- 1. Check if customer exists
SELECT 'Customer Check:' as test, 
       CASE WHEN EXISTS(SELECT 1 FROM customers WHERE id = '1bc5a61e-04d9-4e58-863b-ff2594dd8efd') 
            THEN 'EXISTS' ELSE 'NOT FOUND - THIS IS THE PROBLEM' END as result;

-- 2. Check if company exists  
SELECT 'Company Check:' as test,
       CASE WHEN EXISTS(SELECT 1 FROM companies WHERE id = 'c6ad1436-6474-43a8-b2e8-f1d078cd0cab') 
            THEN 'EXISTS' ELSE 'NOT FOUND - THIS IS THE PROBLEM' END as result;

-- 3. Check for duplicate invoice numbers
SELECT 'Invoice Number Check:' as test,
       COUNT(*) as existing_count
FROM sales_invoices 
WHERE invoice_number LIKE 'INV-%';

-- 4. Check table structure to see what fields are actually required
SELECT 
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns 
WHERE table_name = 'sales_invoices' 
AND is_nullable = 'NO'
ORDER BY ordinal_position;
