-- Add delivery status functionality to sales invoices
-- This will allow marking sales invoices as delivered to trigger stock movements

-- 1. Add delivery_status field to sales_invoices table
ALTER TABLE sales_invoices 
ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20) DEFAULT 'PENDING';

-- Add constraint for delivery_status
ALTER TABLE sales_invoices 
DROP CONSTRAINT IF EXISTS sales_invoices_delivery_status_check;

ALTER TABLE sales_invoices 
ADD CONSTRAINT sales_invoices_delivery_status_check 
CHECK (delivery_status IN ('PENDING', 'DELIVERED'));

-- 2. Update existing sales invoices to have PENDING delivery status
UPDATE sales_invoices 
SET delivery_status = 'PENDING' 
WHERE delivery_status IS NULL;

-- 3. Create function to handle stock movements when delivery status changes to DELIVERED
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
    IF NEW.delivery_status != 'DELIVERED' OR OLD.delivery_status = 'DELIVERED' THEN
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
        
        -- Check if stock item exists
        SELECT * INTO v_stock_item
        FROM stock_items 
        WHERE item_id = v_line_item.item_id 
        AND company_id = NEW.company_id;
        
        IF NOT FOUND THEN
            RAISE NOTICE 'No stock item found for item_id % in company %, skipping', 
                v_line_item.item_id, NEW.company_id;
            CONTINUE;
        END IF;
        
        -- Get current quantity
        v_current_quantity := COALESCE(v_stock_item.quantity_on_hand, 0);
        v_new_quantity := v_current_quantity - v_line_item.quantity;
        
        RAISE NOTICE 'Stock movement: current_qty=%, sold_qty=%, new_qty=%', 
            v_current_quantity, v_line_item.quantity, v_new_quantity;
        
        -- Create stock movement record (OUTBOUND for sales)
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
            'OUTBOUND',
            'SALES_INVOICE',
            v_line_item.quantity,
            COALESCE(v_stock_item.average_cost, v_line_item.unit_price),
            v_line_item.quantity * COALESCE(v_stock_item.average_cost, v_line_item.unit_price),
            'sales_invoice',
            NEW.id,
            NEW.invoice_number,
            NEW.invoice_date,
            'Sales delivery - ' || COALESCE(v_line_item.item_name, 'Item'),
            NOW(),
            NOW()
        );
        
        -- Update stock quantity
        UPDATE stock_items 
        SET 
            quantity_on_hand = v_new_quantity,
            updated_at = NOW()
        WHERE item_id = v_line_item.item_id 
        AND company_id = NEW.company_id;
        
        RAISE NOTICE 'Stock movement created: movement_id=%, new_stock_qty=%', 
            v_movement_id, v_new_quantity;
    END LOOP;
    
    RAISE NOTICE 'Completed stock movements for sales invoice: %', NEW.invoice_number;
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating sales delivery stock movement: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for delivery status changes
DROP TRIGGER IF EXISTS trigger_sales_delivery_stock_movement ON sales_invoices;

CREATE TRIGGER trigger_sales_delivery_stock_movement
    AFTER UPDATE ON sales_invoices
    FOR EACH ROW
    EXECUTE FUNCTION create_sales_delivery_stock_movement();

-- 5. Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_sales_delivery_stock_movement() TO authenticated;

-- 6. Test the setup
SELECT 'Setup completed successfully. Sales invoices now have delivery_status field.' as status;
SELECT 'To trigger stock movements: UPDATE sales_invoices SET delivery_status = ''DELIVERED'' WHERE id = ''your_invoice_id'';' as usage;
