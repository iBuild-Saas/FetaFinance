-- Quick Fix for Purchase Invoice Status Update Error
-- This temporarily disables triggers to allow status updates while we fix the underlying issue

-- =====================================================
-- 1. TEMPORARILY DISABLE TRIGGERS
-- =====================================================

SELECT 'Temporarily disabling triggers...' as step;

-- Disable stock movement trigger if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trg_purchase_invoice_stock_movement') THEN
        ALTER TABLE purchase_invoices DISABLE TRIGGER trg_purchase_invoice_stock_movement;
        RAISE NOTICE '✅ Disabled stock movement trigger temporarily';
    ELSE
        RAISE NOTICE 'ℹ️ Stock movement trigger does not exist';
    END IF;
END $$;

-- Disable journal entry trigger if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_purchase_invoice_journal') THEN
        ALTER TABLE purchase_invoices DISABLE TRIGGER trigger_purchase_invoice_journal;
        RAISE NOTICE '✅ Disabled journal entry trigger temporarily';
    ELSE
        RAISE NOTICE 'ℹ️ Journal entry trigger does not exist';
    END IF;
END $$;

-- =====================================================
-- 2. TEST STATUS UPDATE
-- =====================================================

SELECT 'Testing status update...' as step;

-- Try to update the specific invoice that was failing
DO $$
DECLARE
    v_invoice_id UUID := '97752a1d-22fd-46ef-949b-03b0ce841e9e';
    v_old_status VARCHAR(20);
    v_new_status VARCHAR(20) := 'RECEIVED';
BEGIN
    -- Get current status
    SELECT status INTO v_old_status FROM purchase_invoices WHERE id = v_invoice_id;
    
    IF v_old_status IS NULL THEN
        RAISE NOTICE '❌ Invoice not found: %', v_invoice_id;
        RETURN;
    END IF;
    
    RAISE NOTICE '📋 Invoice %: Current status: %, Attempting to change to: %', 
                 v_invoice_id, v_old_status, v_new_status;
    
    -- Update status
    UPDATE purchase_invoices 
    SET status = v_new_status, updated_at = NOW()
    WHERE id = v_invoice_id;
    
    IF FOUND THEN
        RAISE NOTICE '✅ Status update SUCCESSFUL! Invoice % is now %', v_invoice_id, v_new_status;
    ELSE
        RAISE NOTICE '❌ Status update FAILED for invoice %', v_invoice_id;
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error updating status: %', SQLERRM;
END $$;

-- =====================================================
-- 3. CHECK CURRENT STATUS
-- =====================================================

SELECT 'Checking current status...' as step;

SELECT 
    id,
    invoice_number,
    status,
    updated_at
FROM purchase_invoices 
WHERE id = '97752a1d-22fd-46ef-949b-03b0ce841e9e';

-- =====================================================
-- 4. NEXT STEPS
-- =====================================================

SELECT 'Next Steps:' as next_steps;
SELECT '1. The status update should now work in the frontend' as step;
SELECT '2. Run FIX_PURCHASE_INVOICE_INVENTORY.sql to create the missing tables/functions' as step;
SELECT '3. After that succeeds, run RE_ENABLE_TRIGGERS.sql to restore automatic functionality' as step;
SELECT '4. Test the "Mark as Received" button again' as step;

-- =====================================================
-- 5. IMPORTANT NOTE
-- =====================================================

SELECT '⚠️ IMPORTANT:' as warning;
SELECT 'Triggers are currently DISABLED - no automatic stock movements or journal entries will be created' as note;
SELECT 'You must run the fix script and re-enable triggers to restore full functionality' as note;
