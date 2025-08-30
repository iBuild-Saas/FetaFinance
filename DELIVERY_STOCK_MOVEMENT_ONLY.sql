-- Sales delivery function - ONLY creates stock movements, NO journal entries
-- Journal entries are already created when invoice is saved/submitted

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_sales_delivery_stock_movement ON sales_invoices;
DROP FUNCTION IF EXISTS create_sales_delivery_stock_movement();

-- Create delivery function that ONLY handles stock movements
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
        
        RAISE NOTICE 'Creating ONLY stock movements for delivered sales invoice: %', NEW.invoice_number;
        
        -- Create stock movements for each line item (NO journal entries)
        FOR line_item IN 
            SELECT * FROM sales_invoice_line_items 
            WHERE sales_invoice_id = NEW.id AND item_id IS NOT NULL
        LOOP
            -- Create ONLY stock movement (OUT for sales)
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
                'Sale delivery - ' || COALESCE(line_item.item_name, 'Item')
            );
            
            RAISE NOTICE 'Created stock movement for item % quantity %', line_item.item_id, line_item.quantity;
        END LOOP;
        
        RAISE NOTICE 'Completed stock movements for sales invoice % (NO journal entries created)', NEW.invoice_number;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for delivery status changes only
CREATE TRIGGER trigger_sales_delivery_stock_movement
    AFTER UPDATE ON sales_invoices
    FOR EACH ROW
    WHEN (NEW.delivery_status = 'DELIVERED')
    EXECUTE FUNCTION create_sales_delivery_stock_movement();

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_sales_delivery_stock_movement() TO authenticated;

SELECT 'Sales delivery function created - ONLY creates stock movements, NO journal entries' as status;
