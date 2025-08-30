-- Fix the stock_items table to have the correct quantity field

-- 1. Check current stock_items table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'stock_items'
ORDER BY ordinal_position;

-- 2. Add quantity field if it doesn't exist
DO $$
BEGIN
    -- Check if quantity field exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stock_items' AND column_name = 'quantity'
    ) THEN
        -- Add quantity field
        ALTER TABLE stock_items ADD COLUMN quantity DECIMAL(15,4) DEFAULT 0;
        RAISE NOTICE 'Added quantity field to stock_items table';
    ELSE
        RAISE NOTICE 'quantity field already exists in stock_items table';
    END IF;
    
    -- Check if quantity_on_hand field exists, if not add it as alias
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stock_items' AND column_name = 'quantity_on_hand'
    ) THEN
        -- Add quantity_on_hand field
        ALTER TABLE stock_items ADD COLUMN quantity_on_hand DECIMAL(15,4) DEFAULT 0;
        RAISE NOTICE 'Added quantity_on_hand field to stock_items table';
    ELSE
        RAISE NOTICE 'quantity_on_hand field already exists in stock_items table';
    END IF;
END $$;

-- 3. Update existing records to sync quantity fields
UPDATE stock_items 
SET quantity_on_hand = COALESCE(quantity, 0)
WHERE quantity_on_hand IS NULL OR quantity_on_hand = 0;

UPDATE stock_items 
SET quantity = COALESCE(quantity_on_hand, 0)
WHERE quantity IS NULL OR quantity = 0;

-- 4. Create a simple delivery function that works with the actual table structure
DROP TRIGGER IF EXISTS trigger_sales_delivery_stock_movement ON sales_invoices;
DROP FUNCTION IF EXISTS create_sales_delivery_stock_movement();

CREATE OR REPLACE FUNCTION create_sales_delivery_stock_movement()
RETURNS TRIGGER AS $$
DECLARE
    v_line_item RECORD;
    v_movement_id UUID;
    v_current_quantity DECIMAL := 0;
    v_new_quantity DECIMAL := 0;
    v_unit_cost DECIMAL := 0;
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
        
        -- Get current stock quantity and cost
        SELECT 
            COALESCE(quantity, 0),
            COALESCE(average_cost, 0)
        INTO v_current_quantity, v_unit_cost
        FROM stock_items 
        WHERE item_id = v_line_item.item_id 
        AND company_id = NEW.company_id;
        
        -- If no stock record exists, create one
        IF NOT FOUND THEN
            INSERT INTO stock_items (
                id, item_id, company_id, quantity, quantity_on_hand, 
                average_cost, created_at, updated_at
            ) VALUES (
                gen_random_uuid(), v_line_item.item_id, NEW.company_id, 0, 0,
                v_line_item.unit_price, NOW(), NOW()
            );
            v_current_quantity := 0;
            v_unit_cost := v_line_item.unit_price;
            RAISE NOTICE 'Created new stock item record for item_id %', v_line_item.item_id;
        END IF;
        
        v_new_quantity := v_current_quantity - v_line_item.quantity;
        
        RAISE NOTICE 'Stock movement: current_qty=%, sold_qty=%, new_qty=%', 
            v_current_quantity, v_line_item.quantity, v_new_quantity;
        
        -- Create stock movement record
        v_movement_id := gen_random_uuid();
        
        INSERT INTO stock_movements (
            id, item_id, company_id, movement_type, movement_source,
            quantity, unit_cost, total_cost, reference_type, reference_id,
            reference_number, movement_date, notes, created_at, updated_at
        ) VALUES (
            v_movement_id, v_line_item.item_id, NEW.company_id, 'OUT', 'SALES_INVOICE',
            v_line_item.quantity, COALESCE(v_unit_cost, v_line_item.unit_price, 0),
            v_line_item.quantity * COALESCE(v_unit_cost, v_line_item.unit_price, 0),
            'sales_invoice', NEW.id, NEW.invoice_number, NEW.invoice_date,
            'Sales delivery - ' || COALESCE(v_line_item.item_name, 'Item'),
            NOW(), NOW()
        );
        
        -- Update stock quantity (both fields for compatibility)
        UPDATE stock_items 
        SET 
            quantity = v_new_quantity,
            quantity_on_hand = v_new_quantity,
            updated_at = NOW()
        WHERE item_id = v_line_item.item_id 
        AND company_id = NEW.company_id;
        
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

-- 7. Show final table structure
SELECT 
    'Final stock_items structure:' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'stock_items'
ORDER BY ordinal_position;

SELECT 'Fixed stock_items table and delivery function' as status;
