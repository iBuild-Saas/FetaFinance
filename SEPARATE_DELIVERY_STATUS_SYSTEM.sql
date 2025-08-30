-- Separate delivery status system to avoid journal entry conflicts
-- Solution: Use delivery_status field ONLY for stock movements, status field ONLY for journal entries

-- 1. Ensure delivery_status field exists
ALTER TABLE sales_invoices 
ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20) DEFAULT 'PENDING';

ALTER TABLE sales_invoices 
DROP CONSTRAINT IF EXISTS sales_invoices_delivery_status_check;

ALTER TABLE sales_invoices 
ADD CONSTRAINT sales_invoices_delivery_status_check 
CHECK (delivery_status IN ('PENDING', 'DELIVERED'));

-- Update existing invoices
UPDATE sales_invoices 
SET delivery_status = 'PENDING' 
WHERE delivery_status IS NULL;

-- 2. Drop ALL existing triggers to start clean
DROP TRIGGER IF EXISTS trigger_sales_invoice_journal ON sales_invoices;
DROP TRIGGER IF EXISTS trigger_sales_delivery_stock_movement ON sales_invoices;
DROP FUNCTION IF EXISTS create_sales_delivery_stock_movement();

-- 3. Create journal trigger that ONLY fires on status field changes
CREATE TRIGGER trigger_sales_invoice_journal
    AFTER INSERT OR UPDATE OF status ON sales_invoices
    FOR EACH ROW
    WHEN (NEW.status = 'SUBMITTED')
    EXECUTE FUNCTION create_sales_invoice_journal_entry();

-- 4. Create delivery function that ONLY handles stock movements
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
            
            -- Update stock_items quantities (remove total_value reference)
            UPDATE stock_items 
            SET 
                quantity = GREATEST(0, COALESCE(quantity, current_quantity, 0) - line_item.quantity),
                quantity_on_hand = GREATEST(0, COALESCE(quantity_on_hand, available_quantity, quantity, current_quantity, 0) - line_item.quantity),
                current_quantity = GREATEST(0, COALESCE(current_quantity, quantity, 0) - line_item.quantity),
                available_quantity = GREATEST(0, COALESCE(available_quantity, quantity_on_hand, quantity, current_quantity, 0) - line_item.quantity),
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
                    current_quantity,
                    available_quantity,
                    average_cost,
                    created_at,
                    updated_at
                ) VALUES (
                    gen_random_uuid(),
                    NEW.company_id,
                    line_item.item_id,
                    -line_item.quantity,
                    -line_item.quantity,
                    -line_item.quantity,
                    -line_item.quantity,
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

-- 5. Create delivery trigger that ONLY fires on delivery_status field changes
CREATE TRIGGER trigger_sales_delivery_stock_movement
    AFTER UPDATE OF delivery_status ON sales_invoices
    FOR EACH ROW
    WHEN (NEW.delivery_status = 'DELIVERED')
    EXECUTE FUNCTION create_sales_delivery_stock_movement();

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION create_sales_delivery_stock_movement() TO authenticated;

-- 7. Verify the setup
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation,
    action_condition
FROM information_schema.triggers 
WHERE event_object_table = 'sales_invoices'
ORDER BY trigger_name;

SELECT 'Separate delivery status system created successfully' as status;
SELECT 'Journal entries: status field changes only' as journal_info;
SELECT 'Stock movements: delivery_status field changes only' as delivery_info;
