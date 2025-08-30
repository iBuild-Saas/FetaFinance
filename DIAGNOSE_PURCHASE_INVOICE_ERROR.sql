-- Diagnose Purchase Invoice Status Update Error
-- Run this to see what's causing the 400 error

-- =====================================================
-- 1. CHECK CURRENT INVOICE STATUS
-- =====================================================

SELECT 'Checking current invoice status...' as step;

-- Check the specific invoice that's failing
SELECT 
    id,
    invoice_number,
    status,
    company_id,
    supplier_id,
    created_at,
    updated_at
FROM purchase_invoices 
WHERE id = '97752a1d-22fd-46ef-949b-03b0ce841e9e';

-- =====================================================
-- 2. CHECK STATUS CONSTRAINTS
-- =====================================================

SELECT 'Checking status constraints...' as step;

-- Check if there are any CHECK constraints on the status field
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'purchase_invoices'::regclass 
AND contype = 'c';

-- Check the table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'purchase_invoices' 
AND column_name = 'status'
ORDER BY ordinal_position;

-- =====================================================
-- 3. CHECK IF REQUIRED TABLES EXIST
-- =====================================================

SELECT 'Checking required tables...' as step;

-- Check if stock_items table exists
SELECT 
    'stock_items' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_items') 
         THEN 'EXISTS' ELSE 'MISSING' END as status;

-- Check if stock_movements table exists
SELECT 
    'stock_movements' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_movements') 
         THEN 'EXISTS' ELSE 'MISSING' END as status;

-- Check if journal_entries table exists
SELECT 
    'journal_entries' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entries') 
         THEN 'EXISTS' ELSE 'MISSING' END as status;

-- Check if journal_entry_lines table exists
SELECT 
    'journal_entry_lines' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_entry_lines') 
         THEN 'EXISTS' ELSE 'MISSING' END as status;

-- =====================================================
-- 4. CHECK IF TRIGGERS EXIST
-- =====================================================

SELECT 'Checking triggers...' as step;

-- Check if the stock movement trigger exists
SELECT 
    'trg_purchase_invoice_stock_movement' as trigger_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trg_purchase_invoice_stock_movement') 
         THEN 'EXISTS' ELSE 'MISSING' END as status;

-- Check if the journal entry trigger exists
SELECT 
    'trigger_purchase_invoice_journal' as trigger_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_purchase_invoice_journal') 
         THEN 'EXISTS' ELSE 'MISSING' END as status;

-- =====================================================
-- 5. CHECK IF FUNCTIONS EXIST
-- =====================================================

SELECT 'Checking functions...' as step;

-- Check if the stock movement function exists
SELECT 
    'record_purchase_invoice_stock_movement' as function_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'record_purchase_invoice_stock_movement') 
         THEN 'EXISTS' ELSE 'MISSING' END as status;

-- Check if the journal entry function exists
SELECT 
    'create_purchase_invoice_journal_entry' as function_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'create_purchase_invoice_journal_entry') 
         THEN 'EXISTS' ELSE 'MISSING' END as status;

-- =====================================================
-- 6. TEST SIMPLE STATUS UPDATE
-- =====================================================

SELECT 'Testing simple status update...' as step;

-- Try to update the status without triggers (if they exist, disable them temporarily)
DO $$
BEGIN
    -- Check if triggers exist and disable them temporarily
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trg_purchase_invoice_stock_movement') THEN
        ALTER TABLE purchase_invoices DISABLE TRIGGER trg_purchase_invoice_stock_movement;
        RAISE NOTICE 'Disabled stock movement trigger temporarily';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_purchase_invoice_journal') THEN
        ALTER TABLE purchase_invoices DISABLE TRIGGER trigger_purchase_invoice_journal;
        RAISE NOTICE 'Disabled journal entry trigger temporarily';
    END IF;
    
    -- Try the update
    UPDATE purchase_invoices 
    SET status = 'RECEIVED', updated_at = NOW()
    WHERE id = '97752a1d-22fd-46ef-949b-03b0ce841e9e';
    
    IF FOUND THEN
        RAISE NOTICE 'Status update SUCCESSFUL without triggers';
    ELSE
        RAISE NOTICE 'Status update FAILED - invoice not found';
    END IF;
    
    -- Re-enable triggers
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trg_purchase_invoice_stock_movement') THEN
        ALTER TABLE purchase_invoices ENABLE TRIGGER trg_purchase_invoice_stock_movement;
        RAISE NOTICE 'Re-enabled stock movement trigger';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_purchase_invoice_journal') THEN
        ALTER TABLE purchase_invoices ENABLE TRIGGER trigger_purchase_invoice_journal;
        RAISE NOTICE 'Re-enabled journal entry trigger';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during test: %', SQLERRM;
        
        -- Re-enable triggers on error
        IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trg_purchase_invoice_stock_movement') THEN
            ALTER TABLE purchase_invoices ENABLE TRIGGER trg_purchase_invoice_stock_movement;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_purchase_invoice_journal') THEN
            ALTER TABLE purchase_invoices ENABLE TRIGGER trigger_purchase_invoice_journal;
        END IF;
END $$;

-- =====================================================
-- 7. SUMMARY
-- =====================================================

SELECT 'Diagnosis Summary' as summary;

SELECT 
    'Missing Tables' as issue,
    COUNT(*) as count,
    'These tables need to be created' as description
FROM information_schema.tables 
WHERE table_name IN ('stock_items', 'stock_movements', 'journal_entries', 'journal_entry_lines')
AND table_name NOT IN (
    SELECT table_name FROM information_schema.tables 
    WHERE table_name IN ('stock_items', 'stock_movements', 'journal_entries', 'journal_entry_lines')
)

UNION ALL

SELECT 
    'Missing Functions' as issue,
    COUNT(*) as count,
    'These functions need to be created' as description
FROM information_schema.routines 
WHERE routine_name IN ('record_purchase_invoice_stock_movement', 'create_purchase_invoice_journal_entry')
AND routine_name NOT IN (
    SELECT routine_name FROM information_schema.routines 
    WHERE routine_name IN ('record_purchase_invoice_stock_movement', 'create_purchase_invoice_journal_entry')
)

UNION ALL

SELECT 
    'Missing Triggers' as issue,
    COUNT(*) as count,
    'These triggers need to be created' as description
FROM information_schema.triggers 
WHERE trigger_name IN ('trg_purchase_invoice_stock_movement', 'trigger_purchase_invoice_journal')
AND trigger_name NOT IN (
    SELECT trigger_name FROM information_schema.triggers 
    WHERE trigger_name IN ('trg_purchase_invoice_stock_movement', 'trigger_purchase_invoice_journal')
);

-- =====================================================
-- 8. NEXT STEPS
-- =====================================================

SELECT 'Next Steps:' as next_steps;
SELECT '1. Run FIX_PURCHASE_INVOICE_INVENTORY.sql to create missing tables/functions/triggers' as step;
SELECT '2. If that fails, run CHECK_EXISTING_TABLES.sql to see detailed table structures' as step;
SELECT '3. Check the database logs for specific error messages' as step;
