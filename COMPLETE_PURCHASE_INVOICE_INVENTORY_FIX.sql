-- =====================================================
-- COMPLETE PURCHASE INVOICE INVENTORY FIX
-- =====================================================
-- This script fixes the purchase invoice system to allow:
-- 1. RECEIVED status for updating stock quantities
-- 2. Stock movement tracking
-- 3. Keep existing journal entry creation on SUBMITTED
-- 4. Separate triggers for different workflows

-- =====================================================
-- 1. FIX STATUS CONSTRAINTS
-- =====================================================

-- Drop existing constraints
ALTER TABLE purchase_invoices 
DROP CONSTRAINT IF EXISTS purchase_invoices_status_check;

-- Apply new constraint that allows RECEIVED status
ALTER TABLE purchase_invoices 
ADD CONSTRAINT purchase_invoices_status_check 
CHECK (status IN ('DRAFT', 'SUBMITTED', 'RECEIVED', 'PAID', 'CANCELLED'));

-- Update default status
ALTER TABLE purchase_invoices 
ALTER COLUMN status SET DEFAULT 'DRAFT';

-- =====================================================
-- 2. CREATE REQUIRED TABLES
-- =====================================================

-- Create stock_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS stock_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    item_id UUID NOT NULL,
    current_quantity DECIMAL(10,3) DEFAULT 0,
    reserved_quantity DECIMAL(10,3) DEFAULT 0,
    available_quantity DECIMAL(10,3) DEFAULT 0,
    average_cost DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, item_id)
);

-- Create stock_movements table if it doesn't exist
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    item_id UUID NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_cost DECIMAL(15,2) NOT NULL,
    movement_type VARCHAR(10) NOT NULL CHECK (movement_type IN ('IN', 'OUT')),
    movement_source VARCHAR(50) NOT NULL,
    reference_type VARCHAR(50) NOT NULL,
    reference_id UUID NOT NULL,
    reference_number VARCHAR(100),
    description TEXT,
    movement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. CREATE STOCK MOVEMENT FUNCTIONS
-- =====================================================

-- Function to create stock movement and update inventory
CREATE OR REPLACE FUNCTION create_stock_movement(
    p_company_id UUID,
    p_item_id UUID,
    p_quantity DECIMAL(10,3),
    p_unit_cost DECIMAL(15,2),
    p_movement_type VARCHAR(10),
    p_movement_source VARCHAR(50),
    p_reference_type VARCHAR(50),
    p_reference_id UUID,
    p_reference_number VARCHAR(100),
    p_description TEXT
)
RETURNS UUID AS $$
DECLARE
    v_stock_item_id UUID;
    v_movement_id UUID;
    v_current_quantity DECIMAL(10,3);
    v_new_quantity DECIMAL(10,3);
    v_new_average_cost DECIMAL(15,2);
BEGIN
    -- Get or create stock item record
    SELECT id, current_quantity INTO v_stock_item_id, v_current_quantity
    FROM stock_items 
    WHERE company_id = p_company_id AND item_id = p_item_id;
    
    IF NOT FOUND THEN
        -- Create new stock item record
        INSERT INTO stock_items (company_id, item_id, current_quantity, average_cost)
        VALUES (p_company_id, p_item_id, 0, p_unit_cost)
        RETURNING id INTO v_stock_item_id;
        v_current_quantity := 0;
    END IF;
    
    -- Calculate new quantity and average cost
    IF p_movement_type = 'IN' THEN
        v_new_quantity := v_current_quantity + p_quantity;
        -- Calculate weighted average cost
        IF v_current_quantity = 0 THEN
            v_new_average_cost := p_unit_cost;
        ELSE
            v_new_average_cost := ((v_current_quantity * (SELECT average_cost FROM stock_items WHERE id = v_stock_item_id)) + (p_quantity * p_unit_cost)) / v_new_quantity;
        END IF;
    ELSE -- OUT
        v_new_quantity := v_current_quantity - p_quantity;
        v_new_average_cost := (SELECT average_cost FROM stock_items WHERE id = v_stock_item_id);
        
        -- Check if we have enough stock
        IF v_new_quantity < 0 THEN
            RAISE EXCEPTION 'Insufficient stock for item %. Current: %, Attempted OUT: %', p_item_id, v_current_quantity, p_quantity;
        END IF;
    END IF;
    
    -- Create stock movement record
    INSERT INTO stock_movements (
        company_id, item_id, quantity, unit_cost, movement_type, movement_source,
        reference_type, reference_id, reference_number, description
    ) VALUES (
        p_company_id, p_item_id, p_quantity, p_unit_cost, p_movement_type, p_movement_source,
        p_reference_type, p_reference_id, p_reference_number, p_description
    ) RETURNING id INTO v_movement_id;
    
    -- Update stock item
    UPDATE stock_items 
    SET 
        current_quantity = v_new_quantity,
        available_quantity = v_new_quantity,
        average_cost = v_new_average_cost,
        updated_at = NOW()
    WHERE id = v_stock_item_id;
    
    RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;

-- Function to record stock movement from Purchase Invoice
CREATE OR REPLACE FUNCTION record_purchase_invoice_stock_movement(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
    v_invoice purchase_invoices%ROWTYPE;
    v_line_item purchase_invoice_line_items%ROWTYPE;
    v_item items%ROWTYPE;
BEGIN
    SELECT * INTO v_invoice FROM purchase_invoices WHERE id = p_invoice_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase Invoice with ID % not found.', p_invoice_id;
    END IF;

    -- Only record stock movement if status is RECEIVED
    IF v_invoice.status != 'RECEIVED' THEN
        RAISE NOTICE 'Stock movement not recorded for Purchase Invoice % (ID: %) because status is %.', v_invoice.invoice_number, p_invoice_id, v_invoice.status;
        RETURN;
    END IF;

    FOR v_line_item IN SELECT * FROM purchase_invoice_line_items WHERE invoice_id = p_invoice_id LOOP
        -- Check if item exists
        SELECT * INTO v_item FROM items WHERE id = v_line_item.item_id;
        IF NOT FOUND THEN
            RAISE NOTICE 'Item with ID % not found, skipping stock movement.', v_line_item.item_id;
            CONTINUE;
        END IF;

        -- Create stock movement using the new system
        PERFORM create_stock_movement(
            v_invoice.company_id, 
            v_line_item.item_id, 
            v_line_item.quantity,
            v_line_item.unit_price, 
            'IN', 
            'PURCHASE',
            'purchase_invoice', 
            v_invoice.id, 
            v_invoice.invoice_number,
            'Stock received from purchase invoice ' || v_invoice.invoice_number
        );
        
        RAISE NOTICE 'Stock movement created for item %: quantity %, unit price %', v_line_item.item_name, v_line_item.quantity, v_line_item.unit_price;
    END LOOP;
    
    RAISE NOTICE 'Stock movements recorded for Purchase Invoice % (ID: %).', v_invoice.invoice_number, p_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. CREATE TRIGGERS
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trg_purchase_invoice_stock_movement ON purchase_invoices;

-- Trigger for Purchase Invoice stock movement ONLY (when status changes to RECEIVED)
CREATE OR REPLACE FUNCTION trigger_purchase_invoice_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger when status changes TO RECEIVED
    IF NEW.status = 'RECEIVED' AND OLD.status != 'RECEIVED' THEN
        BEGIN
            PERFORM record_purchase_invoice_stock_movement(NEW.id);
            RAISE NOTICE 'Stock movement trigger executed for invoice %', NEW.invoice_number;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to create stock movement for purchase invoice %: %', NEW.invoice_number, SQLERRM;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_purchase_invoice_stock_movement
AFTER UPDATE OF status ON purchase_invoices
FOR EACH ROW
EXECUTE FUNCTION trigger_purchase_invoice_stock_movement();

-- =====================================================
-- 5. CREATE SEQUENCE FOR JOURNAL ENTRIES
-- =====================================================

-- Create sequence for journal entry numbers if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS journal_entry_number_seq START 1;

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION create_stock_movement(UUID, UUID, DECIMAL, DECIMAL, VARCHAR, VARCHAR, VARCHAR, UUID, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION record_purchase_invoice_stock_movement(UUID) TO authenticated;
GRANT ALL ON stock_items TO authenticated;
GRANT ALL ON stock_movements TO authenticated;

-- =====================================================
-- 7. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_stock_items_company_item ON stock_items(company_id, item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_item ON stock_movements(company_id, item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date);

-- =====================================================
-- 8. VERIFICATION QUERIES
-- =====================================================

-- Check if tables were created
SELECT 'Tables Created:' as info;
SELECT 
    table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name) 
         THEN 'EXISTS' ELSE 'MISSING' END as status
FROM (VALUES ('stock_items'), ('stock_movements')) AS t(table_name);

-- Check if functions were created
SELECT 'Functions Created:' as info;
SELECT 
    routine_name as function_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name IN ('create_stock_movement', 'record_purchase_invoice_stock_movement')
ORDER BY routine_name;

-- Check if triggers were created
SELECT 'Triggers Created:' as info;
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_name IN ('trg_purchase_invoice_stock_movement')
ORDER BY trigger_name;

-- Check constraints
SELECT 'Constraints Applied:' as info;
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'purchase_invoices'::regclass 
AND contype = 'c';

-- =====================================================
-- 9. SETUP COMPLETE MESSAGE
-- =====================================================

SELECT 'Purchase Invoice Inventory System Fix Complete!' as status;
SELECT 'System Configuration:' as info;
SELECT '1. Journal entries: Created when status = SUBMITTED (existing workflow)' as step;
SELECT '2. Stock movements: Created when status = RECEIVED (new workflow)' as step;
SELECT '3. Status constraint: Now allows RECEIVED status' as step;
SELECT '4. Stock quantities: Updated automatically when marked as received' as step;
