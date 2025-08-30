-- =====================================================
-- CHECK SALES INVOICE SCHEMA
-- =====================================================
-- This script checks the actual structure of your sales invoice tables
-- to identify what might be causing the 400 error

-- =====================================================
-- 1. CHECK IF TABLES EXIST
-- =====================================================

SELECT 'Checking if sales_invoices table exists...' as status;

SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name IN ('sales_invoices', 'sales_invoice_line_items', 'invoice_line_items')
ORDER BY table_name;

-- =====================================================
-- 2. CHECK SALES_INVOICES TABLE STRUCTURE
-- =====================================================

SELECT 'sales_invoices table structure:' as status;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'sales_invoices'
ORDER BY ordinal_position;

-- =====================================================
-- 3. CHECK SALES_INVOICE_LINE_ITEMS TABLE STRUCTURE
-- =====================================================

SELECT 'sales_invoice_line_items table structure:' as status;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'sales_invoice_line_items'
ORDER BY ordinal_position;

-- =====================================================
-- 4. CHECK CONSTRAINTS
-- =====================================================

SELECT 'Checking constraints on sales_invoices:' as status;

SELECT 
    tc.constraint_name,
    tc.constraint_type,
    tc.table_name,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'sales_invoices'
ORDER BY tc.constraint_name;

-- =====================================================
-- 5. CHECK FOREIGN KEYS
-- =====================================================

SELECT 'Checking foreign key relationships:' as status;

SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('sales_invoices', 'sales_invoice_line_items');

-- =====================================================
-- 6. CHECK REQUIRED REFERENCED TABLES
-- =====================================================

SELECT 'Checking if required tables exist:' as status;

SELECT 
    table_name,
    CASE 
        WHEN table_name IS NOT NULL THEN 'EXISTS'
        ELSE 'MISSING'
    END as status
FROM information_schema.tables 
WHERE table_name IN ('companies', 'customers', 'items')
ORDER BY table_name;

-- =====================================================
-- 7. TEST BASIC INSERT PERMISSIONS
-- =====================================================

SELECT 'Testing basic permissions...' as status;

-- Test if we can access the table structure (this should work)
SELECT COUNT(*) as row_count FROM sales_invoices;

-- =====================================================
-- 8. SAMPLE DATA CHECK
-- =====================================================

SELECT 'Sample existing data:' as status;

-- Show a few existing records to understand the data format
SELECT 
    id,
    invoice_number,
    customer_id,
    company_id,
    invoice_date,
    status,
    total_amount,
    created_at
FROM sales_invoices 
ORDER BY created_at DESC 
LIMIT 3;

SELECT '=== SCHEMA CHECK COMPLETE ===' as final_status;
