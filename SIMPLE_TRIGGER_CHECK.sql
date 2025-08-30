-- Simple Trigger Check
-- This script checks if triggers exist without complex status verification

-- =====================================================
-- 1. CHECK IF TRIGGERS EXIST
-- =====================================================

SELECT 'Checking if triggers exist...' as step;

-- Check if stock movement trigger exists
SELECT 
    'trg_purchase_invoice_stock_movement' as trigger_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trg_purchase_invoice_stock_movement') 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check if journal entry trigger exists
SELECT 
    'trigger_purchase_invoice_journal' as trigger_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_purchase_invoice_journal') 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- =====================================================
-- 2. CHECK IF FUNCTIONS EXIST
-- =====================================================

SELECT 'Checking if functions exist...' as step;

-- Check if stock movement function exists
SELECT 
    'record_purchase_invoice_stock_movement' as function_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'record_purchase_invoice_stock_movement') 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check if journal entry function exists
SELECT 
    'create_purchase_invoice_journal_entry' as function_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'create_purchase_invoice_journal_entry') 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- =====================================================
-- 3. CHECK IF TABLES EXIST
-- =====================================================

SELECT 'Checking if required tables exist...' as step;

-- Check if stock_items table exists
SELECT 
    'stock_items' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_items') 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check if stock_movements table exists
SELECT 
    'stock_movements' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_movements') 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check if journal_entries table exists
SELECT 
    'journal_entries' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entries') 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check if journal_entry_lines table exists
SELECT 
    'journal_entry_lines' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entry_lines') 
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- =====================================================
-- 4. SUMMARY
-- =====================================================

SELECT 'Summary:' as summary;

SELECT 
    'Missing Components' as category,
    COUNT(*) as count,
    'These need to be created' as description
FROM (
    SELECT 'stock_items' as component
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_items')
    UNION ALL
    SELECT 'stock_movements'
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_movements')
    UNION ALL
    SELECT 'journal_entries'
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entries')
    UNION ALL
    SELECT 'journal_entry_lines'
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entry_lines')
    UNION ALL
    SELECT 'record_purchase_invoice_stock_movement'
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'record_purchase_invoice_stock_movement')
    UNION ALL
    SELECT 'create_purchase_invoice_journal_entry'
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'create_purchase_invoice_journal_entry')
    UNION ALL
    SELECT 'trg_purchase_invoice_stock_movement'
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trg_purchase_invoice_stock_movement')
    UNION ALL
    SELECT 'trigger_purchase_invoice_journal'
    WHERE NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_purchase_invoice_journal')
) missing_components;

-- =====================================================
-- 5. NEXT STEPS
-- =====================================================

SELECT 'Next Steps:' as next_steps;
SELECT '1. If any components are missing, run FIX_PURCHASE_INVOICE_INVENTORY.sql' as step;
SELECT '2. If all components exist, try the "Mark as Received" button in the frontend' as step;
SELECT '3. Check the browser console for any JavaScript errors' as step;
