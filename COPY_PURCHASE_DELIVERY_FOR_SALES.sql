-- Copy the exact purchase invoice delivery logic for sales invoices (but reverse the movement)

-- 1. First check what fields exist in stock_movements table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'stock_movements'
ORDER BY ordinal_position;

-- 2. Drop existing sales delivery function and trigger
DROP TRIGGER IF EXISTS trigger_sales_delivery_stock_movement ON sales_invoices;
DROP FUNCTION IF EXISTS create_sales_delivery_stock_movement();

-- 3. Create sales delivery function exactly like purchase but with OUT movement
CREATE OR REPLACE FUNCTION create_sales_delivery_stock_movement()
RETURNS TRIGGER AS $$
DECLARE
    v_line_item RECORD;
    v_movement_id UUID;
    v_current_quantity DECIMAL := 0;
    v_new_quantity DECIMAL := 0;
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
    
    -- Process each line item that has an item_id (same as purchase)
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
        
        -- Get current stock quantity (same logic as purchase)
        SELECT COALESCE(quantity, 0) INTO v_current_quantity
        FROM stock_items 
        WHERE item_id = v_line_item.item_id 
        AND company_id = NEW.company_id;
        
        -- If no stock record, set to 0
        IF NOT FOUND THEN
            v_current_quantity := 0;
        END IF;
        
        -- Calculate new quantity (SUBTRACT for sales - opposite of purchase)
        v_new_quantity := v_current_quantity - v_line_item.quantity;
        
        RAISE NOTICE 'Stock movement: current_qty=%, sold_qty=%, new_qty=%', 
            v_current_quantity, v_line_item.quantity, v_new_quantity;
        
        -- Create stock movement record (OUT for sales - opposite of purchase IN)
        v_movement_id := gen_random_uuid();
        
        -- Use the same fields that work for purchase invoices
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
            'OUT',  -- OUT for sales (opposite of purchase IN)
            v_line_item.quantity,
            v_line_item.unit_price,
            NEW.invoice_date
        );
        
        -- Update or create stock item record (same logic as purchase)
        IF EXISTS (SELECT 1 FROM stock_items WHERE item_id = v_line_item.item_id AND company_id = NEW.company_id) THEN
            -- Update existing stock item
            UPDATE stock_items 
            SET quantity = v_new_quantity
            WHERE item_id = v_line_item.item_id 
            AND company_id = NEW.company_id;
        ELSE
            -- Create new stock item with negative quantity (sold before purchased)
            INSERT INTO stock_items (
                id,
                item_id,
                company_id,
                quantity,
                average_cost
            ) VALUES (
                gen_random_uuid(),
                v_line_item.item_id,
                NEW.company_id,
                v_new_quantity,  -- Will be negative if selling before purchasing
                v_line_item.unit_price
            );
        END IF;
        
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

-- 4. Create the trigger (same as purchase)
CREATE TRIGGER trigger_sales_delivery_stock_movement
    AFTER UPDATE ON sales_invoices
    FOR EACH ROW
    EXECUTE FUNCTION create_sales_delivery_stock_movement();

-- 5. Grant permissions (same as purchase)
GRANT EXECUTE ON FUNCTION create_sales_delivery_stock_movement() TO authenticated;

-- 6. Test the setup
SELECT 'Sales delivery function created - exact copy of purchase logic but with OUT movements' as status;

-- 7. Show current stock_movements to verify structure
SELECT COUNT(*) as total_movements, movement_type, COUNT(*) as count_by_type
FROM stock_movements 
GROUP BY movement_type
ORDER BY movement_type;
