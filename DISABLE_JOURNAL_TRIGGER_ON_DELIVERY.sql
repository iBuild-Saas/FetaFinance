-- Fix duplicate journal entry issue
-- The problem: Journal trigger fires on ANY status change, including delivery_status
-- Solution: Make journal trigger more specific to avoid firing on delivery updates

-- 1. Check current journal trigger condition
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation,
    action_condition
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_sales_invoice_journal';

-- 2. Drop and recreate journal trigger with more specific condition
DROP TRIGGER IF EXISTS trigger_sales_invoice_journal ON sales_invoices;

-- 3. Recreate journal trigger that ONLY fires on status changes (not delivery_status)
CREATE TRIGGER trigger_sales_invoice_journal
    AFTER INSERT OR UPDATE ON sales_invoices
    FOR EACH ROW
    WHEN (NEW.status = 'SUBMITTED')
    EXECUTE FUNCTION create_sales_invoice_journal_entry();

-- 4. Now run the delivery-only function
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
            
            -- Update stock_items quantities (remove total_value references if column doesn't exist)
            UPDATE stock_items 
            SET 
                quantity = GREATEST(0, quantity - line_item.quantity),
                quantity_on_hand = GREATEST(0, COALESCE(quantity_on_hand, quantity) - line_item.quantity),
                updated_at = NOW()
            WHERE item_id = line_item.item_id 
            AND company_id = NEW.company_id;
            
            -- If no stock_items record exists, create one with negative quantity (backorder)
            IF NOT FOUND THEN
                INSERT INTO stock_items (
                    id,
                    company_id,
                    item_id,
                    quantity,
                    quantity_on_hand,
                    unit_cost,
                    average_cost,
                    created_at,
                    updated_at
                ) VALUES (
                    gen_random_uuid(),
                    NEW.company_id,
                    line_item.item_id,
                    -line_item.quantity,
                    -line_item.quantity,
                    line_item.unit_price,
                    line_item.unit_price,
                    NOW(),
                    NOW()
                );
            END IF;
            
            RAISE NOTICE 'Updated stock levels for item % quantity %', line_item.item_id, line_item.quantity;
        END LOOP;
        
        RAISE NOTICE 'Completed stock movements for sales invoice % (NO journal entries created)', NEW.invoice_number;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create delivery trigger that only fires on delivery_status changes
CREATE TRIGGER trigger_sales_delivery_stock_movement
    AFTER UPDATE ON sales_invoices
    FOR EACH ROW
    WHEN (OLD.delivery_status IS DISTINCT FROM NEW.delivery_status AND NEW.delivery_status = 'DELIVERED')
    EXECUTE FUNCTION create_sales_delivery_stock_movement();

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION create_sales_delivery_stock_movement() TO authenticated;

-- 7. Verify triggers
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation,
    action_condition
FROM information_schema.triggers 
WHERE event_object_table = 'sales_invoices'
ORDER BY trigger_name;

SELECT 'Fixed: Journal trigger only fires on status changes, delivery trigger only fires on delivery_status changes' as status;
