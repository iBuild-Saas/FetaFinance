-- Clean fix for delivery function - drop trigger first to avoid dependency error

-- 1. Drop trigger first (this removes the dependency)
DROP TRIGGER IF EXISTS trigger_sales_delivery_stock_movement ON sales_invoices;

-- 2. Now drop the function
DROP FUNCTION IF EXISTS create_sales_delivery_stock_movement();

-- 3. Check stock_items table structure to use correct field name
DO $$
DECLARE
    v_quantity_field TEXT;
BEGIN
    -- Determine which quantity field exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'quantity_on_hand') THEN
        v_quantity_field := 'quantity_on_hand';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'quantity') THEN
        v_quantity_field := 'quantity';
    ELSE
        v_quantity_field := 'NOT_FOUND';
    END IF;
    
    RAISE NOTICE 'Stock items quantity field: %', v_quantity_field;
END $$;

-- 4. Create the delivery function with proper error handling
CREATE OR REPLACE FUNCTION create_sales_delivery_stock_movement()
RETURNS TRIGGER AS $$
DECLARE
    v_line_item RECORD;
    v_stock_item RECORD;
    v_movement_id UUID;
    v_current_quantity DECIMAL;
    v_new_quantity DECIMAL;
BEGIN
    -- Only process when delivery_status changes to DELIVERED
    IF NEW.delivery_status != 'DELIVERED' OR (OLD.delivery_status IS NOT NULL AND OLD.delivery_status = 'DELIVERED') THEN
        RETURN NEW;
    END IF;
    
    -- Skip if invoice is not SUBMITTED
    IF NEW.status != 'SUBMITTED' THEN
        RAISE NOTICE 'Skipping stock movement for sales invoice % because status is not SUBMITTED', NEW.invoice_number;
        RETURN NEW;
    END IF;
    
    RAISE NOTICE 'Processing stock movements for delivered sales invoice: %', NEW.invoice_number;
    
    -- Process each line item that has an item_id
    FOR v_line_item IN 
        SELECT 
            item_id,
            quantity,
            unit_price,
            line_total,
            item_name
        FROM sales_invoice_line_items 
        WHERE sales_invoice_id = NEW.id 
        AND item_id IS NOT NULL
        AND quantity > 0
    LOOP
        RAISE NOTICE 'Processing line item: item_id=%, quantity=%, item_name=%', 
            v_line_item.item_id, v_line_item.quantity, v_line_item.item_name;
        
        -- Check if stock item exists - use whichever quantity field exists
        SELECT * INTO v_stock_item
        FROM stock_items 
        WHERE item_id = v_line_item.item_id 
        AND company_id = NEW.company_id;
        
        IF NOT FOUND THEN
            RAISE NOTICE 'No stock item found for item_id % in company %, skipping', 
                v_line_item.item_id, NEW.company_id;
            CONTINUE;
        END IF;
        
        -- Get current quantity - try both possible field names
        BEGIN
            SELECT quantity_on_hand INTO v_current_quantity FROM stock_items 
            WHERE item_id = v_line_item.item_id AND company_id = NEW.company_id;
        EXCEPTION
            WHEN undefined_column THEN
                SELECT quantity INTO v_current_quantity FROM stock_items 
                WHERE item_id = v_line_item.item_id AND company_id = NEW.company_id;
        END;
        
        v_current_quantity := COALESCE(v_current_quantity, 0);
        v_new_quantity := v_current_quantity - v_line_item.quantity;
        
        RAISE NOTICE 'Stock movement: current_qty=%, sold_qty=%, new_qty=%', 
            v_current_quantity, v_line_item.quantity, v_new_quantity;
        
        -- Create stock movement record
        v_movement_id := gen_random_uuid();
        
        INSERT INTO stock_movements (
            id,
            item_id,
            company_id,
            movement_type,
            movement_source,
            quantity,
            unit_cost,
            total_cost,
            reference_type,
            reference_id,
            reference_number,
            movement_date,
            notes,
            created_at,
            updated_at
        ) VALUES (
            v_movement_id,
            v_line_item.item_id,
            NEW.company_id,
            'OUT',
            'SALES_INVOICE',
            v_line_item.quantity,
            COALESCE(v_stock_item.average_cost, v_line_item.unit_price, 0),
            v_line_item.quantity * COALESCE(v_stock_item.average_cost, v_line_item.unit_price, 0),
            'sales_invoice',
            NEW.id,
            NEW.invoice_number,
            NEW.invoice_date,
            'Sales delivery - ' || COALESCE(v_line_item.item_name, 'Item'),
            NOW(),
            NOW()
        );
        
        -- Update stock quantity - try both possible field names
        BEGIN
            UPDATE stock_items 
            SET quantity_on_hand = v_new_quantity, updated_at = NOW()
            WHERE item_id = v_line_item.item_id AND company_id = NEW.company_id;
        EXCEPTION
            WHEN undefined_column THEN
                UPDATE stock_items 
                SET quantity = v_new_quantity, updated_at = NOW()
                WHERE item_id = v_line_item.item_id AND company_id = NEW.company_id;
        END;
        
        RAISE NOTICE 'Stock movement created: movement_id=%, type=OUT, qty=%, new_stock_qty=%', 
            v_movement_id, v_line_item.quantity, v_new_quantity;
    END LOOP;
    
    RAISE NOTICE 'Completed stock movements for sales invoice: %', NEW.invoice_number;
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating sales delivery stock movement: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 5. Create the trigger
CREATE TRIGGER trigger_sales_delivery_stock_movement
    AFTER UPDATE ON sales_invoices
    FOR EACH ROW
    EXECUTE FUNCTION create_sales_delivery_stock_movement();

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION create_sales_delivery_stock_movement() TO authenticated;

SELECT 'Successfully recreated delivery function and trigger' as status;
