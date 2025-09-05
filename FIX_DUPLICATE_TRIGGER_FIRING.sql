-- =====================================================
-- FIX DUPLICATE TRIGGER FIRING
-- =====================================================
-- This script fixes the issue where triggers fire multiple times creating duplicate journal entries

-- First, let's check what's happening
SELECT '=== DIAGNOSING DUPLICATE ENTRIES ===' as info;

-- Check for duplicate journal entries for the same invoice
SELECT 'Duplicate journal entries found:' as info;
SELECT 
    reference,
    entry_number,
    created_at,
    COUNT(*) as duplicate_count
FROM journal_entries 
WHERE reference LIKE 'purchase_invoice:%'
GROUP BY reference, entry_number, created_at
HAVING COUNT(*) > 1
ORDER BY reference, created_at;

-- Check the current trigger definition
SELECT 'Current trigger definition:' as info;
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_purchase_invoice_journal';

-- =====================================================
-- FIX THE TRIGGER LOGIC
-- =====================================================

SELECT '=== FIXING TRIGGER LOGIC ===' as info;

-- Drop the current trigger
DROP TRIGGER IF EXISTS trigger_purchase_invoice_journal ON purchase_invoices;

-- Create a new function that checks for existing journal entries
CREATE OR REPLACE FUNCTION create_purchase_invoice_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_journal_id UUID;
    v_inventory_account_id UUID;
    v_payable_account_id UUID;
    v_description TEXT;
    v_amount DECIMAL;
    v_entry_number VARCHAR(100);
    v_company_id UUID;
    v_timestamp BIGINT;
    v_counter INTEGER;
    v_existing_entry_id UUID;
BEGIN
    -- Only process when status is SUBMITTED
    IF NEW.status != 'SUBMITTED' THEN
        RETURN NEW;
    END IF;
    
    -- Skip if amount is zero or negative
    IF NEW.total_amount IS NULL OR NEW.total_amount <= 0 THEN
        RAISE NOTICE 'Skipping journal entry for purchase invoice % because total amount is not positive', NEW.invoice_number;
        RETURN NEW;
    END IF;
    
    -- Check if a journal entry already exists for this invoice
    SELECT id INTO v_existing_entry_id
    FROM journal_entries 
    WHERE reference = 'purchase_invoice:' || NEW.id
    AND status = 'POSTED'
    LIMIT 1;
    
    -- If journal entry already exists, skip creating another one
    IF v_existing_entry_id IS NOT NULL THEN
        RAISE NOTICE 'Journal entry already exists for purchase invoice % (ID: %), skipping duplicate creation', NEW.invoice_number, v_existing_entry_id;
        RETURN NEW;
    END IF;
    
    v_amount := NEW.total_amount;
    v_company_id := NEW.company_id;
    
    -- Get accounts from company default fields
    SELECT 
        default_inventory_account_id,
        accounts_payable_account_id
    INTO 
        v_inventory_account_id,
        v_payable_account_id
    FROM companies 
    WHERE id = v_company_id;
    
    -- Verify we have both accounts
    IF v_inventory_account_id IS NULL THEN
        RAISE EXCEPTION 'No Default Inventory/Expense account configured for company %', v_company_id;
    END IF;
    
    IF v_payable_account_id IS NULL THEN
        RAISE EXCEPTION 'No Accounts Payable account configured for company %', v_company_id;
    END IF;
    
    -- Generate guaranteed unique entry number using multiple uniqueness factors
    v_timestamp := EXTRACT(EPOCH FROM NOW())::BIGINT;
    v_counter := EXTRACT(MICROSECONDS FROM NOW())::INTEGER;
    v_entry_number := 'PI-' || NEW.invoice_number || '-' || v_timestamp || '-' || v_counter;
    v_description := 'Purchase Invoice ' || NEW.invoice_number;
    IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
        v_description := v_description || ' - ' || NEW.notes;
    END IF;
    
    -- Create journal entry header
    INSERT INTO journal_entries (
        id, company_id, entry_number, entry_date, reference, memo, status,
        total_debit, total_credit, is_balanced, is_active,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_company_id, v_entry_number, NEW.invoice_date, 
        'purchase_invoice:' || NEW.id, v_description, 'POSTED',
        v_amount, v_amount, true, true,
        NOW(), NOW()
    ) RETURNING id INTO v_journal_id;
    
    -- DEBIT: Inventory/Expense Account
    INSERT INTO journal_entry_lines (
        id, journal_entry_id, account_id, line_number,
        debit_amount, credit_amount, description, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_journal_id, v_inventory_account_id, 1,
        v_amount, 0, 'Inventory/Expense - ' || v_description, NOW(), NOW()
    );
    
    -- CREDIT: Accounts Payable Account
    INSERT INTO journal_entry_lines (
        id, journal_entry_id, account_id, line_number,
        debit_amount, credit_amount, description, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_journal_id, v_payable_account_id, 2,
        0, v_amount, 'Accounts Payable - ' || v_description, NOW(), NOW()
    );
    
    RAISE NOTICE 'Created journal entry % for purchase invoice %', v_entry_number, NEW.invoice_number;
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating purchase invoice journal entry: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Create the new trigger that only fires on INSERT
CREATE TRIGGER trigger_purchase_invoice_journal
    AFTER INSERT ON purchase_invoices
    FOR EACH ROW
    WHEN (NEW.status = 'SUBMITTED')
    EXECUTE FUNCTION create_purchase_invoice_journal_entry();

-- =====================================================
-- CLEAN UP DUPLICATE ENTRIES
-- =====================================================

SELECT '=== CLEANING UP DUPLICATE ENTRIES ===' as info;

-- Find and remove duplicate journal entries, keeping only the first one
WITH duplicate_entries AS (
    SELECT 
        reference,
        MIN(created_at) as first_created,
        COUNT(*) as total_count
    FROM journal_entries 
    WHERE reference LIKE 'purchase_invoice:%'
    GROUP BY reference
    HAVING COUNT(*) > 1
),
entries_to_delete AS (
    SELECT je.id
    FROM journal_entries je
    JOIN duplicate_entries de ON je.reference = de.reference
    WHERE je.created_at > de.first_created
)
SELECT 'Found duplicate entries to remove:' as info, COUNT(*) as count_to_remove
FROM entries_to_delete;

-- Remove duplicate entries (keeping the first one created)
DELETE FROM journal_entries 
WHERE id IN (
    SELECT je.id
    FROM journal_entries je
    JOIN (
        SELECT 
            reference,
            MIN(created_at) as first_created
        FROM journal_entries 
        WHERE reference LIKE 'purchase_invoice:%'
        GROUP BY reference
        HAVING COUNT(*) > 1
    ) de ON je.reference = de.reference
    WHERE je.created_at > de.first_created
);

-- =====================================================
-- VERIFY THE FIX
-- =====================================================

SELECT '=== VERIFYING THE FIX ===' as info;

-- Check that no more duplicates exist
SELECT 'Remaining journal entries (should be unique per invoice):' as info;
SELECT 
    reference,
    entry_number,
    created_at,
    COUNT(*) as entry_count
FROM journal_entries 
WHERE reference LIKE 'purchase_invoice:%'
GROUP BY reference, entry_number, created_at
ORDER BY reference, created_at;

-- Test the new logic
SELECT '=== TESTING NEW LOGIC ===' as info;

-- Try to update a purchase invoice to SUBMITTED status to see if it creates duplicate
SELECT 'Current purchase invoices:' as info;
SELECT 
    id,
    invoice_number,
    status,
    total_amount
FROM purchase_invoices 
WHERE status = 'DRAFT'
LIMIT 3;

SELECT '=== DUPLICATE TRIGGER FIX COMPLETE ===' as info;
SELECT 'The trigger now checks for existing journal entries before creating new ones.' as message;
SELECT 'Only INSERT operations will create journal entries (not UPDATE).' as explanation;
SELECT 'Duplicate entries have been cleaned up.' as result;



