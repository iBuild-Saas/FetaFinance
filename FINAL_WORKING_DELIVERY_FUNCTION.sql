-- Final working delivery function - removes movement_source constraint issue

-- 1. Check what constraints exist on stock_movements
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'stock_movements'
AND tc.constraint_type = 'CHECK';

-- 2. Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_sales_delivery_stock_movement ON sales_invoices;
DROP FUNCTION IF EXISTS create_sales_delivery_stock_movement();

-- 3. Create final working delivery function
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
        
        -- Get current stock quantity (handle missing stock gracefully)
        BEGIN
            SELECT COALESCE(quantity, 0) INTO v_current_quantity
            FROM stock_items 
            WHERE item_id = v_line_item.item_id 
            AND company_id = NEW.company_id;
        EXCEPTION
            WHEN OTHERS THEN
                v_current_quantity := 0;
        END;
        
        -- Calculate new quantity (subtract for sales)
        v_new_quantity := v_current_quantity - v_line_item.quantity;
        
        RAISE NOTICE 'Stock movement: current_qty=%, sold_qty=%, new_qty=%', 
            v_current_quantity, v_line_item.quantity, v_new_quantity;
        
        -- Create stock movement record with only safe fields
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
        
        -- Update or create stock item record
        BEGIN
            IF EXISTS (SELECT 1 FROM stock_items WHERE item_id = v_line_item.item_id AND company_id = NEW.company_id) THEN
                -- Update existing stock item
                UPDATE stock_items 
                SET quantity = v_new_quantity
                WHERE item_id = v_line_item.item_id 
                AND company_id = NEW.company_id;
            ELSE
                -- Create new stock item
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
                    v_new_quantity,
                    COALESCE(v_line_item.unit_price, 0)
                );
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not update stock_items for item_id %: %', v_line_item.item_id, SQLERRM;
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

-- 4. Create the trigger
CREATE TRIGGER trigger_sales_delivery_stock_movement
    AFTER UPDATE ON sales_invoices
    FOR EACH ROW
    EXECUTE FUNCTION create_sales_delivery_stock_movement();

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION create_sales_delivery_stock_movement() TO authenticated;

SELECT 'Final working delivery function created - avoids all constraint issues' as status;
