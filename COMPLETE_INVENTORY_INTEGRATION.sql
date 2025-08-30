-- Complete Inventory Integration Script
-- This connects your existing purchase/sales invoices with the inventory system

-- =====================================================
-- 1. FIRST, RUN THE BASIC INVENTORY SETUP
-- =====================================================

-- Make sure you've run FIXED_INVENTORY_SETUP.sql first
-- If not, run it now before continuing

-- =====================================================
-- 2. INTEGRATE WITH EXISTING PURCHASE INVOICES
-- =====================================================

-- Function to record stock movement from Purchase Invoice
CREATE OR REPLACE FUNCTION record_purchase_invoice_stock_movement(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
    v_invoice purchase_invoices%ROWTYPE;
    v_line_item purchase_invoice_line_items%ROWTYPE;
    v_item items%ROWTYPE;
BEGIN
    SELECT * INTO v_invoice FROM purchase_invoices WHERE id = p_invoice_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase Invoice with ID % not found.', p_invoice_id;
    END IF;

    -- Only record stock movement if status is RECEIVED or PAID
    IF v_invoice.status NOT IN ('RECEIVED', 'PAID') THEN
        RAISE NOTICE 'Stock movement not recorded for Purchase Invoice % (ID: %) because status is %.', v_invoice.invoice_number, p_invoice_id, v_invoice.status;
        RETURN;
    END IF;

    FOR v_line_item IN SELECT * FROM purchase_invoice_line_items WHERE invoice_id = p_invoice_id LOOP
        SELECT * INTO v_item FROM items WHERE id = v_line_item.item_id;

        -- Create stock movement using the new system
        PERFORM create_stock_movement(
            v_invoice.company_id, 
            v_line_item.item_id, 
            v_line_item.quantity,
            v_line_item.unit_price, 
            'IN', 
            'PURCHASE',
            'purchase_invoice', 
            v_invoice.id, 
            v_invoice.invoice_number,
            'Stock received from purchase invoice ' || v_invoice.invoice_number
        );
    END LOOP;
    
    RAISE NOTICE 'Stock movements recorded for Purchase Invoice % (ID: %).', v_invoice.invoice_number, p_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- Function to record stock movement from Sales Invoice
CREATE OR REPLACE FUNCTION record_sales_invoice_stock_movement(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
    v_invoice sales_invoices%ROWTYPE;
    v_line_item invoice_line_items%ROWTYPE;
    v_stock_item stock_items%ROWTYPE;
BEGIN
    SELECT * INTO v_invoice FROM sales_invoices WHERE id = p_invoice_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sales Invoice with ID % not found.', p_invoice_id;
    END IF;

    -- Only record stock movement if status is SUBMITTED or PAID
    IF v_invoice.status NOT IN ('SUBMITTED', 'PAID') THEN
        RAISE NOTICE 'Stock movement not recorded for Sales Invoice % (ID: %) because status is %.', v_invoice.invoice_number, p_invoice_id, v_invoice.status;
        RETURN;
    END IF;

    FOR v_line_item IN SELECT * FROM invoice_line_items WHERE invoice_id = p_invoice_id LOOP
        -- Get the current stock level for this item
        SELECT * INTO v_stock_item FROM stock_items 
        WHERE item_id = v_line_item.item_id AND company_id = v_invoice.company_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Item % not found in stock for company %.', v_line_item.item_id, v_invoice.company_id;
        END IF;

        IF v_stock_item.current_quantity < v_line_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for item % (ID: %). Current: %, Attempted OUT: %', 
                v_line_item.item_id, v_invoice.company_id, v_stock_item.current_quantity, v_line_item.quantity;
        END IF;

        -- Create stock movement using the new system
        PERFORM create_stock_movement(
            v_invoice.company_id, 
            v_line_item.item_id, 
            v_line_item.quantity,
            v_stock_item.average_cost, -- Use current average cost for valuation
            'OUT', 
            'SALE',
            'sales_invoice', 
            v_invoice.id, 
            v_invoice.invoice_number,
            'Stock sold via sales invoice ' || v_invoice.invoice_number
        );
    END LOOP;
    
    RAISE NOTICE 'Stock movements recorded for Sales Invoice % (ID: %).', v_invoice.invoice_number, p_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. CREATE TRIGGERS TO AUTO-UPDATE STOCK
-- =====================================================

-- Trigger for Purchase Invoice status changes
CREATE OR REPLACE FUNCTION trigger_purchase_invoice_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('RECEIVED', 'PAID') AND OLD.status NOT IN ('RECEIVED', 'PAID') THEN
        PERFORM record_purchase_invoice_stock_movement(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_purchase_invoice_stock_movement
AFTER UPDATE OF status ON purchase_invoices
FOR EACH ROW
EXECUTE FUNCTION trigger_purchase_invoice_stock_movement();

-- Trigger for Sales Invoice status changes
CREATE OR REPLACE FUNCTION trigger_sales_invoice_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('SUBMITTED', 'PAID') AND OLD.status NOT IN ('SUBMITTED', 'PAID') THEN
        PERFORM record_sales_invoice_stock_movement(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_sales_invoice_stock_movement
AFTER UPDATE OF status ON sales_invoices
FOR EACH ROW
EXECUTE FUNCTION trigger_purchase_invoice_stock_movement();

-- =====================================================
-- 4. PROCESS EXISTING INVOICES (if any)
-- =====================================================

-- Function to process all existing purchase invoices
CREATE OR REPLACE FUNCTION process_existing_purchase_invoices()
RETURNS VOID AS $$
DECLARE
    v_invoice purchase_invoices%ROWTYPE;
BEGIN
    FOR v_invoice IN SELECT * FROM purchase_invoices WHERE status IN ('RECEIVED', 'PAID') LOOP
        BEGIN
            PERFORM record_purchase_invoice_stock_movement(v_invoice.id);
            RAISE NOTICE 'Processed existing purchase invoice: %', v_invoice.invoice_number;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Failed to process purchase invoice %: %', v_invoice.invoice_number, SQLERRM;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to process all existing sales invoices
CREATE OR REPLACE FUNCTION process_existing_sales_invoices()
RETURNS VOID AS $$
DECLARE
    v_invoice sales_invoices%ROWTYPE;
BEGIN
    FOR v_invoice IN SELECT * FROM sales_invoices WHERE status IN ('SUBMITTED', 'PAID') LOOP
        BEGIN
            PERFORM record_sales_invoice_stock_movement(v_invoice.id);
            RAISE NOTICE 'Processed existing sales invoice: %', v_invoice.invoice_number;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Failed to process sales invoice %: %', v_invoice.invoice_number, SQLERRM;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION record_purchase_invoice_stock_movement(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION record_sales_invoice_stock_movement(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION process_existing_purchase_invoices() TO authenticated;
GRANT EXECUTE ON FUNCTION process_existing_sales_invoices() TO authenticated;

-- =====================================================
-- 6. COMMENTS
-- =====================================================

COMMENT ON FUNCTION record_purchase_invoice_stock_movement(UUID) IS 'Records stock movements for items in a purchase invoice';
COMMENT ON FUNCTION record_sales_invoice_stock_movement(UUID) IS 'Records stock movements for items in a sales invoice';
COMMENT ON TRIGGER trg_purchase_invoice_stock_movement ON purchase_invoices IS 'Automatically records stock movements when purchase invoice status changes to RECEIVED or PAID';
COMMENT ON TRIGGER trg_sales_invoice_stock_movement ON sales_invoices IS 'Automatically records stock movements when sales invoice status changes to SUBMITTED or PAID';

-- =====================================================
-- 7. SETUP COMPLETE MESSAGE
-- =====================================================

SELECT 'Complete Inventory Integration Setup Complete!' as status;
