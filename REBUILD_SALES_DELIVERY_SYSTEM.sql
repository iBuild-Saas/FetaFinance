-- REBUILD: Complete sales delivery system from scratch
-- Based on working purchase invoice system but reversed for sales

-- Step 1: Ensure delivery_status field exists
ALTER TABLE sales_invoices 
ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20) DEFAULT 'PENDING';

ALTER TABLE sales_invoices 
DROP CONSTRAINT IF EXISTS sales_invoices_delivery_status_check;

ALTER TABLE sales_invoices 
ADD CONSTRAINT sales_invoices_delivery_status_check 
CHECK (delivery_status IN ('PENDING', 'DELIVERED'));

-- Step 2: Update existing invoices
UPDATE sales_invoices 
SET delivery_status = 'PENDING' 
WHERE delivery_status IS NULL;

-- Step 3: Drop existing trigger and function first
DROP TRIGGER IF EXISTS trigger_sales_delivery_stock_movement ON sales_invoices;
DROP FUNCTION IF EXISTS create_sales_delivery_stock_movement();

-- Create sales delivery function (exact copy of purchase logic but reversed)
CREATE OR REPLACE FUNCTION create_sales_delivery_stock_movement()
RETURNS TRIGGER AS $$
DECLARE
    line_item RECORD;
BEGIN
    -- Only process when delivery_status changes to DELIVERED
    IF NEW.delivery_status = 'DELIVERED' AND (OLD IS NULL OR OLD.delivery_status != 'DELIVERED') THEN
        
        -- Skip if invoice is not SUBMITTED
        IF NEW.status != 'SUBMITTED' THEN
            RAISE NOTICE 'Skipping stock movement for sales invoice % because status is not SUBMITTED', NEW.invoice_number;
            RETURN NEW;
        END IF;
        
        -- Check if stock movements already exist for this invoice
        IF EXISTS (
            SELECT 1 FROM stock_movements 
            WHERE reference_type = 'sales_invoice' 
            AND reference_id = NEW.id
        ) THEN
            RAISE NOTICE 'Stock movements already exist for sales invoice %', NEW.invoice_number;
            RETURN NEW;
        END IF;
        
        -- Create stock movements for each line item (same as purchase but OUT instead of IN)
        FOR line_item IN 
            SELECT * FROM sales_invoice_line_items 
            WHERE sales_invoice_id = NEW.id AND item_id IS NOT NULL
        LOOP
            -- Create stock movement (OUT for sales - opposite of purchase IN)
            INSERT INTO stock_movements (
                id,
                company_id,
                item_id,
                movement_type,
                movement_source,
                quantity,
                unit_cost,
                movement_date,
                reference_type,
                reference_id,
                reference_number,
                description
            ) VALUES (
                gen_random_uuid(),
                NEW.company_id,
                line_item.item_id,
                'OUT',
                'SALE',
                line_item.quantity,
                line_item.unit_price,
                NEW.invoice_date,
                'sales_invoice',
                NEW.id,
                NEW.invoice_number,
                'Sale from invoice ' || NEW.invoice_number || ' - ' || COALESCE(line_item.item_name, 'Item')
            );
        END LOOP;
        
        RAISE NOTICE 'Created stock movements for sales invoice %', NEW.invoice_number;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger (same pattern as purchase)
CREATE TRIGGER trigger_sales_delivery_stock_movement
    AFTER UPDATE ON sales_invoices
    FOR EACH ROW
    WHEN (NEW.delivery_status = 'DELIVERED')
    EXECUTE FUNCTION create_sales_delivery_stock_movement();

-- Step 5: Grant permissions
GRANT EXECUTE ON FUNCTION create_sales_delivery_stock_movement() TO authenticated;

-- Step 6: Verification
SELECT 'Sales delivery system rebuilt successfully' as status;

-- Check the trigger was created
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_sales_delivery_stock_movement';

-- Show sample of how it works
SELECT 
    'To use: UPDATE sales_invoices SET delivery_status = ''DELIVERED'' WHERE id = ''your_invoice_id'';' as usage_example;
