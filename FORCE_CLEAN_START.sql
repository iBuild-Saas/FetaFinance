-- =====================================================
-- FORCE CLEAN START - REMOVE ALL DEPENDENCIES
-- =====================================================
-- This script forcefully removes ALL existing triggers, functions, and dependencies
-- Use this when the regular clean start fails due to dependency conflicts

-- =====================================================
-- 1. FORCE DROP ALL TRIGGERS (CASCADE)
-- =====================================================

-- Drop ALL triggers on purchase_invoices table
DROP TRIGGER IF EXISTS trg_purchase_invoice_stock_movement ON purchase_invoices CASCADE;
DROP TRIGGER IF EXISTS trigger_purchase_invoice_journal ON purchase_invoices CASCADE;
DROP TRIGGER IF EXISTS trigger_purchase_invoice_stock_movement ON purchase_invoices CASCADE;
DROP TRIGGER IF EXISTS trg_purchase_invoice_stock_update ON purchase_invoices CASCADE;

-- Drop ALL triggers on sales_invoices table (that might be using purchase functions)
DROP TRIGGER IF EXISTS trg_sales_invoice_stock_movement ON sales_invoices CASCADE;
DROP TRIGGER IF EXISTS trigger_sales_invoice_stock_movement ON sales_invoices CASCADE;

-- Drop any other related triggers
DROP TRIGGER IF EXISTS trg_invoice_status_update ON purchase_invoices CASCADE;
DROP TRIGGER IF EXISTS trg_invoice_stock_update ON purchase_invoices CASCADE;

-- =====================================================
-- 2. FORCE DROP ALL FUNCTIONS (CASCADE)
-- =====================================================

-- Drop ALL stock movement functions
DROP FUNCTION IF EXISTS create_stock_movement(UUID, UUID, DECIMAL, DECIMAL, VARCHAR, VARCHAR, VARCHAR, UUID, VARCHAR, TEXT) CASCADE;
DROP FUNCTION IF EXISTS record_purchase_invoice_stock_movement(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_purchase_invoice_journal_entry(UUID) CASCADE;
DROP FUNCTION IF EXISTS trigger_purchase_invoice_stock_movement() CASCADE;
DROP FUNCTION IF EXISTS trigger_create_purchase_invoice_journal() CASCADE;
DROP FUNCTION IF EXISTS trigger_sales_invoice_stock_movement() CASCADE;

-- Drop any other related functions
DROP FUNCTION IF EXISTS update_stock_on_receive(UUID) CASCADE;
DROP FUNCTION IF EXISTS trigger_stock_update() CASCADE;
DROP FUNCTION IF EXISTS process_invoice_status_change(UUID, VARCHAR) CASCADE;

-- =====================================================
-- 3. FORCE DROP ALL TABLES (CASCADE)
-- =====================================================

-- Drop ALL stock-related tables
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS stock_items CASCADE;
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS stock_transactions CASCADE;

-- =====================================================
-- 4. FORCE DROP ALL SEQUENCES
-- =====================================================

-- Drop ALL related sequences
DROP SEQUENCE IF EXISTS journal_entry_number_seq CASCADE;
DROP SEQUENCE IF EXISTS stock_movement_number_seq CASCADE;
DROP SEQUENCE IF EXISTS inventory_transaction_seq CASCADE;

-- =====================================================
-- 5. FORCE DROP ALL CONSTRAINTS
-- =====================================================

-- Drop ALL constraints on purchase_invoices
ALTER TABLE purchase_invoices 
DROP CONSTRAINT IF EXISTS purchase_invoices_status_check CASCADE;

-- Drop any other related constraints
ALTER TABLE purchase_invoices 
DROP CONSTRAINT IF EXISTS purchase_invoices_status_valid CASCADE;

-- =====================================================
-- 6. VERIFY CLEAN STATE
-- =====================================================

SELECT '=== FORCE CLEANUP COMPLETED ===' as status;

-- Check if any triggers remain
SELECT 
    'Remaining Triggers' as check_type,
    COUNT(*) as count
FROM information_schema.triggers 
WHERE event_object_table IN ('purchase_invoices', 'sales_invoices')
AND trigger_name LIKE '%stock%' OR trigger_name LIKE '%invoice%';

-- Check if any functions remain
SELECT 
    'Remaining Functions' as check_type,
    COUNT(*) as count
FROM information_schema.routines 
WHERE routine_name LIKE '%stock%' OR routine_name LIKE '%invoice%' OR routine_name LIKE '%movement%';

-- Check if any tables remain
SELECT 
    'Remaining Tables' as check_type,
    COUNT(*) as count
FROM information_schema.tables 
WHERE table_name LIKE '%stock%' OR table_name LIKE '%movement%' OR table_name LIKE '%inventory%';

-- =====================================================
-- 7. READY FOR CLEAN START
-- =====================================================

SELECT '=== READY FOR CLEAN START ===' as status;
SELECT 'All dependencies removed successfully!' as message;
SELECT 'Now run: \i CLEAN_START_PURCHASE_INVOICE_SYSTEM.sql' as next_step;
SELECT 'This will create a completely clean system' as note;
