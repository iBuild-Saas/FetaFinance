    -- Complete Purchase Invoice Diagnostic and Fix
    -- This script will diagnose and fix all issues with purchase invoice processing

    -- =====================================================
    -- 1. CHECK CURRENT PURCHASE INVOICE STATUS
    -- =====================================================

    SELECT '=== CHECKING CURRENT PURCHASE INVOICE ===' as section;

    -- Find the most recent RECEIVED purchase invoice
    SELECT 
        pi.id,
        pi.invoice_number,
        pi.status,
        pi.total_amount,
        pi.updated_at,
        s.name as supplier_name,
        c.name as company_name
    FROM purchase_invoices pi
    LEFT JOIN suppliers s ON pi.supplier_id = s.id
    LEFT JOIN companies c ON pi.company_id = c.id
    WHERE pi.status = 'RECEIVED'
    ORDER BY pi.updated_at DESC
    LIMIT 5;

    -- Check line items for the most recent RECEIVED invoice
    SELECT '--- Line Items for Recent RECEIVED Invoice ---' as subsection;

    WITH recent_invoice AS (
        SELECT id FROM purchase_invoices 
        WHERE status = 'RECEIVED' 
        ORDER BY updated_at DESC 
        LIMIT 1
    )
    SELECT 
        pil.id,
        pil.item_name,
        pil.quantity,
        pil.unit_price,
        pil.line_total,
        i.name as item_master_name,
        i.unit_of_measure
    FROM purchase_invoice_line_items pil
    LEFT JOIN items i ON pil.item_id = i.id
    WHERE pil.invoice_id = (SELECT id FROM recent_invoice);

    -- =====================================================
    -- 2. CHECK IF REQUIRED TABLES EXIST
    -- =====================================================

    SELECT '=== CHECKING REQUIRED TABLES ===' as section;

    SELECT 
        table_name,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t.table_name) 
            THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
    FROM (VALUES 
        ('stock_items'),
        ('stock_movements'),
        ('journal_entries'),
        ('journal_entry_lines'),
        ('chart_of_accounts')
    ) AS t(table_name);

    -- =====================================================
    -- 3. CHECK IF FUNCTIONS EXIST
    -- =====================================================

    SELECT '=== CHECKING REQUIRED FUNCTIONS ===' as section;

    SELECT 
        function_name,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = f.function_name) 
            THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
    FROM (VALUES 
        ('create_stock_movement'),
        ('record_purchase_invoice_stock_movement'),
        ('create_purchase_invoice_journal_entry')
    ) AS f(function_name);

    -- =====================================================
    -- 4. CHECK IF TRIGGERS EXIST
    -- =====================================================

    SELECT '=== CHECKING REQUIRED TRIGGERS ===' as section;

    SELECT 
        trigger_name,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = t.trigger_name) 
            THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
    FROM (VALUES 
        ('trg_purchase_invoice_stock_movement'),
        ('trigger_purchase_invoice_journal')
    ) AS t(trigger_name);

    -- =====================================================
    -- 5. CHECK EXISTING STOCK MOVEMENTS
    -- =====================================================

    SELECT '=== CHECKING STOCK MOVEMENTS ===' as section;

    -- Check if stock_movements table exists and has required columns
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_movements') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_movements' AND column_name = 'reference_type') THEN
                RAISE NOTICE 'Checking stock movements with reference_type column...';
                
                PERFORM 1 FROM stock_movements sm WHERE sm.reference_type = 'purchase_invoice';
                
                IF FOUND THEN
                    RAISE NOTICE 'Found stock movements for purchase invoices';
                ELSE
                    RAISE NOTICE 'No stock movements found for purchase invoices';
                END IF;
            ELSE
                RAISE NOTICE 'stock_movements table exists but missing reference_type column';
            END IF;
        ELSE
            RAISE NOTICE 'stock_movements table does not exist';
        END IF;
    END $$;

    -- Show stock movements structure if table exists
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_movements') THEN
            RAISE NOTICE 'stock_movements table structure:';
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
        END IF;
    END $$;

    -- =====================================================
    -- 6. CHECK EXISTING JOURNAL ENTRIES
    -- =====================================================

    SELECT '=== CHECKING JOURNAL ENTRIES ===' as section;

    -- Check if journal_entries table has the required columns
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journal_entries' AND column_name = 'reference_type') THEN
            -- Check if any journal entries exist for purchase invoices
            RAISE NOTICE 'Checking journal entries with reference_type column...';
            
            PERFORM 1 FROM journal_entries je WHERE je.reference_type = 'purchase_invoice';
            
            IF FOUND THEN
                RAISE NOTICE 'Found journal entries for purchase invoices';
            ELSE
                RAISE NOTICE 'No journal entries found for purchase invoices';
            END IF;
        ELSE
            RAISE NOTICE 'journal_entries table exists but missing reference_type column';
        END IF;
    END $$;

    -- Show journal entries structure
    SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
    FROM information_schema.columns 
    WHERE table_name = 'journal_entries'
    ORDER BY ordinal_position;

    -- =====================================================
    -- 7. CHECK CHART OF ACCOUNTS SETUP
    -- =====================================================

    SELECT '=== CHECKING CHART OF ACCOUNTS ===' as section;

    -- Check if required account types exist
    SELECT 
        account_type,
        COUNT(*) as count
    FROM chart_of_accounts
    WHERE account_type IN ('Asset', 'Liability')
    GROUP BY account_type;

    -- Look for inventory and payable accounts
    SELECT 
        id,
        account_code,
        account_name,
        account_type,
        is_group
    FROM chart_of_accounts
    WHERE LOWER(account_name) LIKE '%inventory%' 
    OR LOWER(account_name) LIKE '%payable%'
    OR LOWER(account_name) LIKE '%stock%'
    ORDER BY account_type, account_name;

    -- =====================================================
    -- 8. MANUAL TEST OF FUNCTIONS (IF THEY EXIST)
    -- =====================================================

    SELECT '=== TESTING FUNCTIONS MANUALLY ===' as section;

    -- Test if we can call the functions manually
    DO $$
    DECLARE
        v_test_invoice_id UUID;
        v_test_item_id UUID;
        v_test_company_id UUID;
    BEGIN
        -- Get a test invoice that's RECEIVED
        SELECT id, company_id INTO v_test_invoice_id, v_test_company_id
        FROM purchase_invoices 
        WHERE status = 'RECEIVED' 
        ORDER BY updated_at DESC 
        LIMIT 1;
        
        IF v_test_invoice_id IS NULL THEN
            RAISE NOTICE '❌ No RECEIVED purchase invoices found for testing';
            RETURN;
        END IF;
        
        RAISE NOTICE '🧪 Testing with invoice: %', v_test_invoice_id;
        
        -- Test stock movement function if it exists
        IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'record_purchase_invoice_stock_movement') THEN
            BEGIN
                RAISE NOTICE '📦 Testing stock movement function...';
                PERFORM record_purchase_invoice_stock_movement(v_test_invoice_id);
                RAISE NOTICE '✅ Stock movement function executed successfully';
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE '❌ Stock movement function failed: %', SQLERRM;
            END;
        ELSE
            RAISE NOTICE '❌ Stock movement function does not exist';
        END IF;
        
        -- Test journal entry function if it exists
        IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'create_purchase_invoice_journal_entry') THEN
            BEGIN
                RAISE NOTICE '📊 Testing journal entry function...';
                PERFORM create_purchase_invoice_journal_entry(v_test_invoice_id);
                RAISE NOTICE '✅ Journal entry function executed successfully';
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE '❌ Journal entry function failed: %', SQLERRM;
            END;
        ELSE
            RAISE NOTICE '❌ Journal entry function does not exist';
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ Error during manual testing: %', SQLERRM;
    END $$;

    -- =====================================================
    -- 9. SUMMARY AND DIAGNOSIS
    -- =====================================================

    SELECT '=== DIAGNOSIS SUMMARY ===' as section;

    -- Count missing components
    WITH missing_components AS (
        SELECT 'Tables' as component_type, COUNT(*) as missing_count
        FROM (VALUES ('stock_items'), ('stock_movements'), ('journal_entries'), ('journal_entry_lines')) AS t(table_name)
        WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t.table_name)
        
        UNION ALL
        
        SELECT 'Functions', COUNT(*)
        FROM (VALUES ('create_stock_movement'), ('record_purchase_invoice_stock_movement'), ('create_purchase_invoice_journal_entry')) AS f(function_name)
        WHERE NOT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = f.function_name)
        
        UNION ALL
        
        SELECT 'Triggers', COUNT(*)
        FROM (VALUES ('trg_purchase_invoice_stock_movement'), ('trigger_purchase_invoice_journal')) AS t(trigger_name)
        WHERE NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = t.trigger_name)
    )
    SELECT 
        component_type,
        missing_count,
        CASE WHEN missing_count = 0 THEN '✅ All Present' ELSE '❌ Missing Components' END as status
    FROM missing_components;

    -- =====================================================
    -- 10. RECOMMENDED ACTIONS
    -- =====================================================

    SELECT '=== RECOMMENDED ACTIONS ===' as section;

    SELECT '1. If tables/functions/triggers are missing:' as action_step;
    SELECT '   Run: CLEANUP_DUPLICATE_FUNCTIONS.sql' as action_detail;
    SELECT '   Then: FIX_PURCHASE_INVOICE_INVENTORY.sql' as action_detail;

    SELECT '2. If components exist but not working:' as action_step;
    SELECT '   Check function definitions and trigger setup' as action_detail;

    SELECT '3. If chart of accounts is incomplete:' as action_step;
    SELECT '   Set up Inventory and Accounts Payable accounts' as action_detail;

    SELECT '4. Test the system:' as action_step;
    SELECT '   Create a new purchase invoice and mark as RECEIVED' as action_detail;

    -- =====================================================
    -- 11. NEXT STEPS
    -- =====================================================

    SELECT '=== NEXT STEPS ===' as section;

    SELECT 'Based on the results above:' as instruction;
    SELECT '- If components are missing, run the setup scripts' as step;
    SELECT '- If components exist, check the error logs' as step;
    SELECT '- If accounts are missing, create inventory and payable accounts' as step;
    SELECT '- Test with a new purchase invoice' as step;
