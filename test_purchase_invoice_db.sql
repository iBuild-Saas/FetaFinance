-- Test script to verify purchase invoice database setup
-- Run this to check if tables exist and have the correct structure

-- Check if tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name = 'purchase_invoices' THEN 'Main table for purchase invoices'
        WHEN table_name = 'purchase_invoice_line_items' THEN 'Line items for purchase invoices'
        ELSE 'Other table'
    END as description
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('purchase_invoices', 'purchase_invoice_line_items')
ORDER BY table_name;

-- Check purchase_invoices table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'purchase_invoices'
ORDER BY ordinal_position;

-- Check purchase_invoice_line_items table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'purchase_invoice_line_items'
ORDER BY ordinal_position;

-- Check if required indexes exist
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('purchase_invoices', 'purchase_invoice_line_items')
ORDER BY tablename, indexname;

-- Check if triggers exist
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND event_object_table IN ('purchase_invoices', 'purchase_invoice_line_items')
ORDER BY event_object_table, trigger_name;
