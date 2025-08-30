-- Check Existing Tables and Columns
-- Run this first to see what's already in your database

-- =====================================================
-- 1. CHECK EXISTING TABLES
-- =====================================================

SELECT 'Checking existing tables...' as step;

-- Check if stock_items table exists and its structure
SELECT 
    'stock_items' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_items') 
         THEN 'EXISTS' ELSE 'MISSING' END as status;

-- If stock_items exists, show its columns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_items') THEN
        RAISE NOTICE 'stock_items table columns:';
        FOR col IN 
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'stock_items'
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  %: % % DEFAULT %', col.column_name, col.data_type, 
                        CASE WHEN col.is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END,
                        COALESCE(col.column_default, 'none');
        END LOOP;
    ELSE
        RAISE NOTICE 'stock_items table does not exist';
    END IF;
END $$;

-- Check if stock_movements table exists and its structure
SELECT 
    'stock_movements' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_movements') 
         THEN 'EXISTS' ELSE 'MISSING' END as status;

-- If stock_movements exists, show its columns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_movements') THEN
        RAISE NOTICE 'stock_movements table columns:';
        FOR col IN 
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'stock_movements'
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  %: % % DEFAULT %', col.column_name, col.data_type, 
                        CASE WHEN col.is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END,
                        COALESCE(col.column_default, 'none');
        END LOOP;
    ELSE
        RAISE NOTICE 'stock_movements table does not exist';
    END IF;
END $$;

-- Check if journal_entries table exists and its structure
SELECT 
    'journal_entries' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entries') 
         THEN 'EXISTS' ELSE 'MISSING' END as status;

-- If journal_entries exists, show its columns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entries') THEN
        RAISE NOTICE 'journal_entries table columns:';
        FOR col IN 
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'journal_entries'
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  %: % % DEFAULT %', col.column_name, col.data_type, 
                        CASE WHEN col.is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END,
                        COALESCE(col.column_default, 'none');
        END LOOP;
    ELSE
        RAISE NOTICE 'journal_entries table does not exist';
    END IF;
END $$;

-- Check if journal_entry_lines table exists and its structure
SELECT 
    'journal_entry_lines' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entry_lines') 
         THEN 'EXISTS' ELSE 'MISSING' END as status;

-- If journal_entry_lines exists, show its columns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entry_lines') THEN
        RAISE NOTICE 'journal_entry_lines table columns:';
        FOR col IN 
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'journal_entry_lines'
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  %: % % DEFAULT %', col.column_name, col.data_type, 
                        CASE WHEN col.is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END,
                        COALESCE(col.column_default, 'none');
        END LOOP;
    ELSE
        RAISE NOTICE 'journal_entry_lines table does not exist';
    END IF;
END $$;

-- =====================================================
-- 2. CHECK REQUIRED TABLES FOR PURCHASE INVOICES
-- =====================================================

SELECT 'Checking purchase invoice tables...' as step;

-- Check purchase_invoices table
SELECT 
    'purchase_invoices' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_invoices') 
         THEN 'EXISTS' ELSE 'MISSING' END as status;

-- Check purchase_invoice_line_items table
SELECT 
    'purchase_invoice_line_items' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_invoice_line_items') 
         THEN 'EXISTS' ELSE 'MISSING' END as status;

-- Check items table
SELECT 
    'items' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'items') 
         THEN 'EXISTS' ELSE 'MISSING' END as status;

-- Check companies table
SELECT 
    'companies' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') 
         THEN 'EXISTS' ELSE 'MISSING' END as status;

-- Check chart_of_accounts table
SELECT 
    'chart_of_accounts' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chart_of_accounts') 
         THEN 'EXISTS' ELSE 'MISSING' END as status;

-- =====================================================
-- 3. CHECK SAMPLE DATA
-- =====================================================

SELECT 'Checking sample data...' as step;

-- Check if there are any purchase invoices
SELECT 
    'purchase_invoices' as table_name,
    COUNT(*) as record_count
FROM purchase_invoices;

-- Check if there are any items
SELECT 
    'items' as table_name,
    COUNT(*) as record_count
FROM items;

-- Check if there are any companies
SELECT 
    'companies' as table_name,
    COUNT(*) as record_count
FROM companies;

-- Check if there are any chart of accounts
SELECT 
    'chart_of_accounts' as table_name,
    COUNT(*) as record_count
FROM chart_of_accounts;

-- =====================================================
-- 4. SUMMARY
-- =====================================================

SELECT 'Table Check Summary' as summary;

SELECT 
    'Required Tables' as category,
    COUNT(*) as count,
    'Core tables needed for the system' as description
FROM information_schema.tables 
WHERE table_name IN ('purchase_invoices', 'purchase_invoice_line_items', 'items', 'companies', 'chart_of_accounts')

UNION ALL

SELECT 
    'Inventory Tables' as category,
    COUNT(*) as count,
    'Tables for stock management' as description
FROM information_schema.tables 
WHERE table_name IN ('stock_items', 'stock_movements')

UNION ALL

SELECT 
    'Accounting Tables' as category,
    COUNT(*) as count,
    'Tables for journal entries' as description
FROM information_schema.tables 
WHERE table_name IN ('journal_entries', 'journal_entry_lines');

-- =====================================================
-- 5. NEXT STEPS
-- =====================================================

SELECT 'Next Steps:' as next_steps;
SELECT '1. Review the table structures above' as step;
SELECT '2. Note any missing tables or columns' as step;
SELECT '3. Run FIX_PURCHASE_INVOICE_INVENTORY.sql to create missing tables' as step;
SELECT '4. Run TEST_PURCHASE_INVOICE_FIX.sql to verify everything works' as step;
