-- Fix stock_movements table structure

-- 1. Check current stock_movements table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'stock_movements'
ORDER BY ordinal_position;

-- 2. Add missing fields to stock_movements table
DO $$
BEGIN
    -- Add notes field if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stock_movements' AND column_name = 'notes'
    ) THEN
        ALTER TABLE stock_movements ADD COLUMN notes TEXT;
        RAISE NOTICE 'Added notes field to stock_movements table';
    END IF;
    
    -- Add other commonly missing fields
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stock_movements' AND column_name = 'movement_source'
    ) THEN
        ALTER TABLE stock_movements ADD COLUMN movement_source VARCHAR(50);
        RAISE NOTICE 'Added movement_source field to stock_movements table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stock_movements' AND column_name = 'reference_type'
    ) THEN
        ALTER TABLE stock_movements ADD COLUMN reference_type VARCHAR(50);
        RAISE NOTICE 'Added reference_type field to stock_movements table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stock_movements' AND column_name = 'reference_id'
    ) THEN
        ALTER TABLE stock_movements ADD COLUMN reference_id UUID;
        RAISE NOTICE 'Added reference_id field to stock_movements table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stock_movements' AND column_name = 'reference_number'
    ) THEN
        ALTER TABLE stock_movements ADD COLUMN reference_number VARCHAR(100);
        RAISE NOTICE 'Added reference_number field to stock_movements table';
    END IF;
END $$;

-- 3. Create simplified delivery function that works with actual table structure
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
        
        -- Get current stock quantity (handle missing stock_items gracefully)
        BEGIN
            SELECT COALESCE(quantity, 0), COALESCE(average_cost, 0)
            INTO v_current_quantity, v_unit_cost
            FROM stock_items 
            WHERE item_id = v_line_item.item_id 
            AND company_id = NEW.company_id;
        EXCEPTION
            WHEN OTHERS THEN
                v_current_quantity := 0;
                v_unit_cost := v_line_item.unit_price;
        END;
        
        v_new_quantity := v_current_quantity - v_line_item.quantity;
        
        RAISE NOTICE 'Stock movement: current_qty=%, sold_qty=%, new_qty=%', 
            v_current_quantity, v_line_item.quantity, v_new_quantity;
        
        -- Create stock movement record with only existing fields
        v_movement_id := gen_random_uuid();
        
        -- Insert with dynamic field list based on what exists
        BEGIN
            INSERT INTO stock_movements (
                id, item_id, company_id, movement_type, quantity, 
                unit_cost, total_cost, movement_date, created_at, updated_at,
                movement_source, reference_type, reference_id, reference_number, notes
            ) VALUES (
                v_movement_id, v_line_item.item_id, NEW.company_id, 'OUT', v_line_item.quantity,
                COALESCE(v_unit_cost, v_line_item.unit_price, 0),
                v_line_item.quantity * COALESCE(v_unit_cost, v_line_item.unit_price, 0),
                NEW.invoice_date, NOW(), NOW(),
                'SALES_INVOICE', 'sales_invoice', NEW.id, NEW.invoice_number,
                'Sales delivery - ' || COALESCE(v_line_item.item_name, 'Item')
            );
        EXCEPTION
            WHEN undefined_column THEN
                -- Fallback: insert with minimal required fields only
                INSERT INTO stock_movements (
                    id, item_id, company_id, movement_type, quantity, 
                    unit_cost, total_cost, movement_date, created_at, updated_at
                ) VALUES (
                    v_movement_id, v_line_item.item_id, NEW.company_id, 'OUT', v_line_item.quantity,
                    COALESCE(v_unit_cost, v_line_item.unit_price, 0),
                    v_line_item.quantity * COALESCE(v_unit_cost, v_line_item.unit_price, 0),
                    NEW.invoice_date, NOW(), NOW()
                );
        END;
        
        -- Update stock quantity if stock_items table exists
        BEGIN
            UPDATE stock_items 
            SET quantity = v_new_quantity, updated_at = NOW()
            WHERE item_id = v_line_item.item_id AND company_id = NEW.company_id;
            
            IF NOT FOUND THEN
                -- Create stock item if it doesn't exist
                INSERT INTO stock_items (
                    id, item_id, company_id, quantity, average_cost, created_at, updated_at
                ) VALUES (
                    gen_random_uuid(), v_line_item.item_id, NEW.company_id, v_new_quantity,
                    v_line_item.unit_price, NOW(), NOW()
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

-- 6. Show final table structure
SELECT 
    'Final stock_movements structure:' as info,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'stock_movements'
ORDER BY ordinal_position;

SELECT 'Fixed stock_movements table and delivery function' as status;
