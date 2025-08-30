-- =====================================================
-- COMPLETE SALES INVOICE AUTOMATION SYSTEM
-- =====================================================
-- This script creates automatic journal entries AND stock movements
-- for sales invoices when they are submitted
-- Based on the existing purchase invoice system but adapted for sales

-- =====================================================
-- 1. CREATE SALES INVOICE STOCK MOVEMENT FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION create_sales_stock_movement()
RETURNS TRIGGER AS $$
DECLARE
    v_line_item RECORD;
    v_stock_item RECORD;
    v_movement_id UUID;
    v_movement_number VARCHAR(50);
    v_company_id UUID;
    v_total_cost DECIMAL := 0;
    v_unit_cost DECIMAL := 0;
BEGIN
    -- Only process when status is SUBMITTED
    IF NEW.status != 'SUBMITTED' THEN
        RETURN NEW;
    END IF;
    
    v_company_id := NEW.company_id;
    
    -- Generate movement number
    v_movement_number := 'SM-' || NEW.invoice_number;
    
    -- Process each line item in the sales invoice
    FOR v_line_item IN 
        SELECT 
            item_id,
            quantity,
            unit_price,
            line_total,
            item_name,
            description
        FROM sales_invoice_line_items 
        WHERE sales_invoice_id = NEW.id 
        AND item_id IS NOT NULL
        AND quantity > 0
    LOOP
        -- Check if this item exists in stock_items
        SELECT * INTO v_stock_item
        FROM stock_items 
        WHERE item_id = v_line_item.item_id 
        AND company_id = v_company_id;
        
        -- Calculate unit cost (use average cost from stock or selling price as fallback)
        v_unit_cost := COALESCE(v_stock_item.average_cost, v_line_item.unit_price, 0);
        v_total_cost := v_unit_cost * v_line_item.quantity;
        
        -- Create stock movement record
        INSERT INTO stock_movements (
            id,
            company_id,
            item_id,
            movement_type,
            movement_source,
            quantity,
            unit_cost,
            total_cost,
            reference_type,
            reference_id,
            reference_number,
            movement_date,
            description,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            v_company_id,
            v_line_item.item_id,
            'OUT',  -- Stock going out for sales
            'SALES_INVOICE',
            v_line_item.quantity,
            v_unit_cost,
            v_total_cost,
            'sales_invoice',
            NEW.id,
            NEW.invoice_number,
            NEW.invoice_date,
            'Sales Invoice ' || NEW.invoice_number || ' - ' || COALESCE(v_line_item.item_name, 'Item'),
            NOW(),
            NOW()
        );
        
        -- Update stock_items table if record exists
        IF v_stock_item.id IS NOT NULL THEN
            UPDATE stock_items 
            SET 
                current_quantity = GREATEST(0, current_quantity - v_line_item.quantity),
                available_quantity = GREATEST(0, available_quantity - v_line_item.quantity),
                last_movement_date = NEW.invoice_date,
                updated_at = NOW()
            WHERE id = v_stock_item.id;
        ELSE
            -- Create stock item record if it doesn't exist (with negative quantity to show shortage)
            INSERT INTO stock_items (
                id,
                company_id,
                item_id,
                current_quantity,
                available_quantity,
                reserved_quantity,
                average_cost,
                last_movement_date,
                reorder_level,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                v_company_id,
                v_line_item.item_id,
                -v_line_item.quantity,  -- Negative to show shortage
                -v_line_item.quantity,
                0,
                v_unit_cost,
                NEW.invoice_date,
                0,
                NOW(),
                NOW()
            );
        END IF;
        
        RAISE NOTICE 'Created stock movement for item % - Quantity: %, Unit Cost: %', 
            v_line_item.item_id, v_line_item.quantity, v_unit_cost;
            
    END LOOP;
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating sales stock movement: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. UPDATE SALES INVOICE JOURNAL ENTRY FUNCTION
-- =====================================================
-- Enhanced version that also handles Cost of Goods Sold

CREATE OR REPLACE FUNCTION create_sales_invoice_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_journal_id UUID;
    v_revenue_account_id UUID;
    v_receivable_account_id UUID;
    v_sales_tax_payable_account_id UUID;
    v_cogs_account_id UUID;
    v_inventory_account_id UUID;
    v_subtotal DECIMAL;
    v_tax_amount DECIMAL;
    v_total_amount DECIMAL;
    v_cogs_amount DECIMAL := 0;
    v_journal_number VARCHAR(50);
    v_description TEXT;
    v_company_id UUID;
    v_line_number INTEGER := 1;
    v_line_item RECORD;
    v_stock_item RECORD;
BEGIN
    -- Only process when status is SUBMITTED
    IF NEW.status != 'SUBMITTED' THEN
        RETURN NEW;
    END IF;
    
    -- Skip if amount is zero or negative
    IF NEW.total_amount IS NULL OR NEW.total_amount <= 0 THEN
        RAISE NOTICE 'Skipping journal entry for sales invoice % because total amount is not positive', NEW.invoice_number;
        RETURN NEW;
    END IF;
    
    -- Get invoice details
    v_company_id := NEW.company_id;
    v_subtotal := COALESCE(NEW.subtotal, 0);
    v_tax_amount := COALESCE(NEW.tax_amount, 0);
    v_total_amount := NEW.total_amount;
    
    -- Get accounts from company defaults
    SELECT
        default_sales_revenue_account_id,
        accounts_receivable_account_id,
        sales_tax_payable_account_id,
        cost_of_goods_sold_account_id,
        default_inventory_account_id
    INTO
        v_revenue_account_id,
        v_receivable_account_id,
        v_sales_tax_payable_account_id,
        v_cogs_account_id,
        v_inventory_account_id
    FROM companies
    WHERE id = v_company_id;
    
    -- Check if we have the required accounts
    IF v_revenue_account_id IS NULL THEN
        RAISE EXCEPTION 'No default sales revenue account configured for company %', v_company_id;
    END IF;
    
    IF v_receivable_account_id IS NULL THEN
        RAISE EXCEPTION 'No default accounts receivable account configured for company %', v_company_id;
    END IF;
    
    IF v_tax_amount > 0 AND v_sales_tax_payable_account_id IS NULL THEN
        RAISE EXCEPTION 'Sales tax exists but no sales tax payable account configured for company %', v_company_id;
    END IF;
    
    -- Calculate Cost of Goods Sold
    FOR v_line_item IN 
        SELECT 
            item_id,
            quantity,
            unit_price,
            line_total
        FROM sales_invoice_line_items 
        WHERE sales_invoice_id = NEW.id 
        AND item_id IS NOT NULL
        AND quantity > 0
    LOOP
        -- Get average cost from stock_items
        SELECT average_cost INTO v_stock_item
        FROM stock_items 
        WHERE item_id = v_line_item.item_id 
        AND company_id = v_company_id;
        
        -- Add to COGS (use average cost or unit price as fallback)
        v_cogs_amount := v_cogs_amount + (v_line_item.quantity * COALESCE(v_stock_item.average_cost, v_line_item.unit_price * 0.7, 0));
    END LOOP;
    
    -- Generate journal number and description
    v_journal_number := 'SI-' || NEW.invoice_number;
    v_description := 'Sales Invoice ' || NEW.invoice_number || ' - ' || COALESCE(NEW.notes, '');
    
    -- Create journal entry header
    INSERT INTO journal_entries (
        id, entry_number, entry_date, description, company_id,
        reference_type, reference_id, reference_number, status,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_journal_number, NEW.invoice_date, v_description, v_company_id,
        'sales_invoice', NEW.id, NEW.invoice_number, 'POSTED',
        NOW(), NOW()
    ) RETURNING id INTO v_journal_id;
    
    -- 1. DEBIT: Accounts Receivable (total amount)
    INSERT INTO journal_entry_lines (
        id, journal_entry_id, account_id, line_number,
        debit_amount, credit_amount, description, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_journal_id, v_receivable_account_id, v_line_number,
        v_total_amount, 0, 'Accounts Receivable - ' || v_description, NOW(), NOW()
    );
    v_line_number := v_line_number + 1;
    
    -- 2. CREDIT: Sales Revenue Account (subtotal)
    IF v_subtotal > 0 THEN
        INSERT INTO journal_entry_lines (
            id, journal_entry_id, account_id, line_number,
            debit_amount, credit_amount, description, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), v_journal_id, v_revenue_account_id, v_line_number,
            0, v_subtotal, 'Sales Revenue - ' || v_description, NOW(), NOW()
        );
        v_line_number := v_line_number + 1;
    END IF;
    
    -- 3. CREDIT: Sales Tax Payable Account (if tax exists)
    IF v_tax_amount > 0 AND v_sales_tax_payable_account_id IS NOT NULL THEN
        INSERT INTO journal_entry_lines (
            id, journal_entry_id, account_id, line_number,
            debit_amount, credit_amount, description, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), v_journal_id, v_sales_tax_payable_account_id, v_line_number,
            0, v_tax_amount, 'Sales Tax Payable - ' || v_description, NOW(), NOW()
        );
        v_line_number := v_line_number + 1;
    END IF;
    
    -- 4. DEBIT: Cost of Goods Sold (if COGS accounts are configured and COGS > 0)
    IF v_cogs_amount > 0 AND v_cogs_account_id IS NOT NULL AND v_inventory_account_id IS NOT NULL THEN
        INSERT INTO journal_entry_lines (
            id, journal_entry_id, account_id, line_number,
            debit_amount, credit_amount, description, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), v_journal_id, v_cogs_account_id, v_line_number,
            v_cogs_amount, 0, 'Cost of Goods Sold - ' || v_description, NOW(), NOW()
        );
        v_line_number := v_line_number + 1;
        
        -- 5. CREDIT: Inventory Account (reduce inventory value)
        INSERT INTO journal_entry_lines (
            id, journal_entry_id, account_id, line_number,
            debit_amount, credit_amount, description, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), v_journal_id, v_inventory_account_id, v_line_number,
            0, v_cogs_amount, 'Inventory Reduction - ' || v_description, NOW(), NOW()
        );
    END IF;
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating sales invoice journal entry: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. DROP EXISTING TRIGGERS AND CREATE NEW ONES
-- =====================================================

-- Drop existing sales invoice triggers
DROP TRIGGER IF EXISTS trigger_sales_invoice_journal ON sales_invoices;
DROP TRIGGER IF EXISTS trigger_sales_stock_movement ON sales_invoices;

-- Create new triggers for sales invoices
CREATE TRIGGER trigger_sales_invoice_journal
    AFTER INSERT OR UPDATE ON sales_invoices
    FOR EACH ROW
    WHEN (NEW.status = 'SUBMITTED')
    EXECUTE FUNCTION create_sales_invoice_journal_entry();

CREATE TRIGGER trigger_sales_stock_movement
    AFTER INSERT OR UPDATE ON sales_invoices
    FOR EACH ROW
    WHEN (NEW.status = 'SUBMITTED')
    EXECUTE FUNCTION create_sales_stock_movement();

-- =====================================================
-- 4. ADD MISSING COMPANY ACCOUNT FIELDS
-- =====================================================

-- Add Cost of Goods Sold account field to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS cost_of_goods_sold_account_id UUID REFERENCES chart_of_accounts(id);

-- =====================================================
-- 5. VERIFICATION
-- =====================================================

-- Show success message
SELECT '=== COMPLETE SALES INVOICE AUTOMATION CREATED ===' as status;

-- Verify functions were created
SELECT 
    routine_name as function_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name IN ('create_sales_invoice_journal_entry', 'create_sales_stock_movement')
ORDER BY routine_name;

-- Verify triggers were created
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_name IN ('trigger_sales_invoice_journal', 'trigger_sales_stock_movement')
ORDER BY trigger_name;

-- Show company account mappings (including new COGS account)
SELECT 
    c.id as company_id,
    c.name as company_name,
    -- Sales Invoice Accounts  
    rev.account_code as revenue_account_code,
    rev.account_name as revenue_account_name,
    rec.account_code as receivable_account_code,
    rec.account_name as receivable_account_name,
    tax.account_code as tax_payable_account_code,
    tax.account_name as tax_payable_account_name,
    cogs.account_code as cogs_account_code,
    cogs.account_name as cogs_account_name,
    inv.account_code as inventory_account_code,
    inv.account_name as inventory_account_name
FROM companies c
LEFT JOIN chart_of_accounts rev ON c.default_sales_revenue_account_id = rev.id
LEFT JOIN chart_of_accounts rec ON c.accounts_receivable_account_id = rec.id
LEFT JOIN chart_of_accounts tax ON c.sales_tax_payable_account_id = tax.id
LEFT JOIN chart_of_accounts cogs ON c.cost_of_goods_sold_account_id = cogs.id
LEFT JOIN chart_of_accounts inv ON c.default_inventory_account_id = inv.id
ORDER BY c.name;

-- Instructions
SELECT '=== WHAT HAPPENS NOW ===' as instruction;
SELECT 'When a sales invoice is saved with SUBMITTED status:' as step1;
SELECT '1. Journal Entry: DR Accounts Receivable, CR Sales Revenue + Sales Tax' as step2;
SELECT '2. COGS Entry: DR Cost of Goods Sold, CR Inventory (if accounts configured)' as step3;
SELECT '3. Stock Movement: Reduces inventory quantities for all line items' as step4;
SELECT '4. Updates stock_items table with new quantities and costs' as step5;

SELECT '=== REQUIRED COMPANY SETUP ===' as setup;
SELECT 'Configure these accounts in your companies table:' as setup1;
SELECT '- default_sales_revenue_account_id (Required)' as setup2;
SELECT '- accounts_receivable_account_id (Required)' as setup3;
SELECT '- sales_tax_payable_account_id (Optional - for tax)' as setup4;
SELECT '- cost_of_goods_sold_account_id (Optional - for COGS)' as setup5;
SELECT '- default_inventory_account_id (Optional - for COGS)' as setup6;
