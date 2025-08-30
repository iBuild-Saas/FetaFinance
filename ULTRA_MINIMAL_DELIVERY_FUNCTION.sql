-- Ultra minimal delivery function that avoids total_cost constraint issues

-- 1. Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_sales_delivery_stock_movement ON sales_invoices;
DROP FUNCTION IF EXISTS create_sales_delivery_stock_movement();

-- 2. Create ultra minimal delivery function
CREATE OR REPLACE FUNCTION create_sales_delivery_stock_movement()
RETURNS TRIGGER AS $$
DECLARE
    v_line_item RECORD;
    v_movement_id UUID;
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
            item_name
        FROM sales_invoice_line_items 
        WHERE sales_invoice_id = NEW.id 
        AND item_id IS NOT NULL
        AND quantity > 0
    LOOP
        RAISE NOTICE 'Processing line item: item_id=%, quantity=%, item_name=%', 
            v_line_item.item_id, v_line_item.quantity, v_line_item.item_name;
        
        -- Create stock movement record with absolute minimal fields
        v_movement_id := gen_random_uuid();
        
        INSERT INTO stock_movements (
            id,
            item_id,
            company_id,
            movement_type,
            quantity,
            unit_cost,
            movement_date
        ) VALUES (
            v_movement_id,
            v_line_item.item_id,
            NEW.company_id,
            'OUT',
            v_line_item.quantity,
            COALESCE(v_line_item.unit_price, 0),
            NEW.invoice_date
        );
        
        RAISE NOTICE 'Stock movement created: movement_id=%, type=OUT, qty=%', 
            v_movement_id, v_line_item.quantity;
    END LOOP;
    
    RAISE NOTICE 'Completed stock movements for sales invoice: %', NEW.invoice_number;
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating sales delivery stock movement: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 3. Create the trigger
CREATE TRIGGER trigger_sales_delivery_stock_movement
    AFTER UPDATE ON sales_invoices
    FOR EACH ROW
    EXECUTE FUNCTION create_sales_delivery_stock_movement();

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION create_sales_delivery_stock_movement() TO authenticated;

SELECT 'Created ultra minimal delivery function without total_cost and created_at' as status;
