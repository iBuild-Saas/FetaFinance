-- =====================================================
-- COMPLETE STOCK SYSTEM WITH AUTOMATIC TRIGGERS
-- =====================================================
-- This script creates stock levels table, fixes stock movement triggers,
-- and ensures proper integration with purchase invoice system

-- =====================================================
-- 1. CREATE STOCK LEVELS TABLE
-- =====================================================

-- Drop existing stock_items if it exists and create new stock_levels table
DROP TABLE IF EXISTS stock_levels CASCADE;

CREATE TABLE stock_levels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id),
    item_id UUID NOT NULL REFERENCES items(id),
    warehouse_id UUID DEFAULT NULL,
    current_quantity DECIMAL(15,3) DEFAULT 0.00 NOT NULL,
    reserved_quantity DECIMAL(15,3) DEFAULT 0.00 NOT NULL,
    available_quantity DECIMAL(15,3) GENERATED ALWAYS AS (current_quantity - reserved_quantity) STORED,
    reorder_level DECIMAL(15,3) DEFAULT 0.00,
    max_level DECIMAL(15,3) DEFAULT 0.00,
    average_cost DECIMAL(15,4) DEFAULT 0.00,
    last_cost DECIMAL(15,4) DEFAULT 0.00,
    total_value DECIMAL(15,2) GENERATED ALWAYS AS (current_quantity * average_cost) STORED,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, item_id, warehouse_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_levels_company_item ON stock_levels(company_id, item_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_warehouse ON stock_levels(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_reorder ON stock_levels(company_id) WHERE current_quantity <= reorder_level;
CREATE INDEX IF NOT EXISTS idx_stock_levels_active ON stock_levels(is_active);

-- Grant permissions
GRANT ALL ON stock_levels TO authenticated;

-- =====================================================
-- 2. ENSURE STOCK MOVEMENTS TABLE EXISTS
-- =====================================================

CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id),
    item_id UUID NOT NULL REFERENCES items(id),
    warehouse_id UUID DEFAULT NULL,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER')),
    movement_source VARCHAR(20) NOT NULL CHECK (movement_source IN ('PURCHASE', 'SALE', 'ADJUSTMENT', 'PRODUCTION', 'OPENING', 'TRANSFER')),
    reference_type VARCHAR(30),
    reference_id UUID,
    reference_number VARCHAR(50),
    quantity DECIMAL(15,3) NOT NULL,
    unit_cost DECIMAL(15,4) DEFAULT 0.00,
    total_cost DECIMAL(15,2) GENERATED ALWAYS AS (ABS(quantity) * unit_cost) STORED,
    movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    created_by UUID DEFAULT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for stock movements
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_item ON stock_movements(company_id, item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_source ON stock_movements(movement_source);
CREATE INDEX IF NOT EXISTS idx_stock_movements_active ON stock_movements(is_active);

-- Grant permissions
GRANT ALL ON stock_movements TO authenticated;

-- =====================================================
-- 3. STOCK MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to initialize stock level if it doesn't exist
CREATE OR REPLACE FUNCTION initialize_stock_level(
    p_company_id UUID,
    p_item_id UUID,
    p_warehouse_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    stock_level_id UUID;
BEGIN
    -- Check if stock level already exists
    SELECT id INTO stock_level_id
    FROM stock_levels
    WHERE company_id = p_company_id 
    AND item_id = p_item_id 
    AND (warehouse_id IS NULL AND p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id);
    
    -- If not exists, create it
    IF stock_level_id IS NULL THEN
        INSERT INTO stock_levels (company_id, item_id, warehouse_id, current_quantity, average_cost)
        VALUES (p_company_id, p_item_id, p_warehouse_id, 0, 0)
        RETURNING id INTO stock_level_id;
        
        RAISE NOTICE 'Created new stock level record for item % in company %', p_item_id, p_company_id;
    END IF;
    
    RETURN stock_level_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update stock levels with weighted average cost
CREATE OR REPLACE FUNCTION update_stock_levels(
    p_company_id UUID,
    p_item_id UUID,
    p_quantity DECIMAL(15,3),
    p_unit_cost DECIMAL(15,4),
    p_movement_type VARCHAR(20),
    p_warehouse_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    current_qty DECIMAL(15,3);
    current_avg_cost DECIMAL(15,4);
    new_avg_cost DECIMAL(15,4);
    new_qty DECIMAL(15,3);
BEGIN
    -- Initialize stock level if it doesn't exist
    PERFORM initialize_stock_level(p_company_id, p_item_id, p_warehouse_id);
    
    -- Get current values
    SELECT current_quantity, average_cost
    INTO current_qty, current_avg_cost
    FROM stock_levels
    WHERE company_id = p_company_id 
    AND item_id = p_item_id 
    AND (warehouse_id IS NULL AND p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id);
    
    -- Calculate new quantity
    IF p_movement_type = 'IN' THEN
        new_qty := current_qty + p_quantity;
        
        -- Calculate weighted average cost for stock in movements
        IF new_qty > 0 AND p_unit_cost > 0 THEN
            new_avg_cost := ((current_qty * current_avg_cost) + (p_quantity * p_unit_cost)) / new_qty;
        ELSE
            new_avg_cost := current_avg_cost;
        END IF;
    ELSE -- OUT or ADJUSTMENT
        new_qty := current_qty - p_quantity;
        new_avg_cost := current_avg_cost; -- Keep same average cost for out movements
    END IF;
    
    -- Ensure quantity doesn't go negative (allow negative for backorders)
    -- new_qty can be negative to track backorders
    
    -- Update stock level
    UPDATE stock_levels
    SET 
        current_quantity = new_qty,
        average_cost = new_avg_cost,
        last_cost = CASE WHEN p_movement_type = 'IN' THEN p_unit_cost ELSE last_cost END,
        updated_at = NOW()
    WHERE company_id = p_company_id 
    AND item_id = p_item_id 
    AND (warehouse_id IS NULL AND p_warehouse_id IS NULL OR warehouse_id = p_warehouse_id);
    
    RAISE NOTICE 'Updated stock level for item %: new quantity = %, new avg cost = %', p_item_id, new_qty, new_avg_cost;
END;
$$ LANGUAGE plpgsql;

-- Function to create stock movement and update levels
CREATE OR REPLACE FUNCTION create_stock_movement(
    p_company_id UUID,
    p_item_id UUID,
    p_quantity DECIMAL(15,3),
    p_unit_cost DECIMAL(15,4),
    p_movement_type VARCHAR(20),
    p_movement_source VARCHAR(20),
    p_reference_type VARCHAR(30),
    p_reference_id UUID,
    p_reference_number VARCHAR(50),
    p_description TEXT DEFAULT NULL,
    p_warehouse_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    movement_id UUID;
BEGIN
    -- Validate movement type
    IF p_movement_type NOT IN ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER') THEN
        RAISE EXCEPTION 'Invalid movement type: %. Must be IN, OUT, ADJUSTMENT, or TRANSFER', p_movement_type;
    END IF;
    
    -- Validate movement source
    IF p_movement_source NOT IN ('PURCHASE', 'SALE', 'ADJUSTMENT', 'PRODUCTION', 'OPENING', 'TRANSFER') THEN
        RAISE EXCEPTION 'Invalid movement source: %. Must be PURCHASE, SALE, ADJUSTMENT, PRODUCTION, OPENING, or TRANSFER', p_movement_source;
    END IF;
    
    -- Create the stock movement record
    INSERT INTO stock_movements (
        company_id, item_id, warehouse_id, movement_type, movement_source,
        reference_type, reference_id, reference_number, quantity, unit_cost,
        description
    )
    VALUES (
        p_company_id, p_item_id, p_warehouse_id, p_movement_type, p_movement_source,
        p_reference_type, p_reference_id, p_reference_number, p_quantity, p_unit_cost,
        p_description
    )
    RETURNING id INTO movement_id;
    
    -- Update stock levels
    PERFORM update_stock_levels(
        p_company_id, p_item_id, p_quantity, p_unit_cost, 
        p_movement_type, p_warehouse_id
    );
    
    RAISE NOTICE 'Created stock movement % for item % with quantity %', movement_id, p_item_id, p_quantity;
    
    RETURN movement_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. PURCHASE INVOICE STOCK MOVEMENT TRIGGER
-- =====================================================

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_purchase_invoice_stock_movement ON purchase_invoices;
DROP FUNCTION IF EXISTS create_purchase_invoice_stock_movement();

-- Function to create stock movements from purchase invoice
CREATE OR REPLACE FUNCTION create_purchase_invoice_stock_movement()
RETURNS TRIGGER AS $$
DECLARE
    line_item RECORD;
BEGIN
    -- Only process when status changes to RECEIVED
    IF NEW.status = 'RECEIVED' AND (OLD IS NULL OR OLD.status != 'RECEIVED') THEN
        
        -- Check if stock movements already exist for this invoice
        IF EXISTS (
            SELECT 1 FROM stock_movements 
            WHERE reference_type = 'purchase_invoice' 
            AND reference_id = NEW.id
        ) THEN
            RAISE NOTICE 'Stock movements already exist for purchase invoice %', NEW.invoice_number;
            RETURN NEW;
        END IF;
        
        -- Create stock movements for each line item
        FOR line_item IN 
            SELECT * FROM purchase_invoice_line_items 
            WHERE invoice_id = NEW.id AND item_id IS NOT NULL
        LOOP
            -- Create stock movement
            PERFORM create_stock_movement(
                NEW.company_id,
                line_item.item_id,
                line_item.quantity,
                line_item.unit_price,
                'IN',
                'PURCHASE',
                'purchase_invoice',
                NEW.id,
                NEW.invoice_number,
                'Purchase from invoice ' || NEW.invoice_number || ' - ' || COALESCE(line_item.description, line_item.item_name),
                NULL -- warehouse_id
            );
        END LOOP;
        
        RAISE NOTICE 'Created stock movements for purchase invoice %', NEW.invoice_number;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for purchase invoice stock movements
CREATE TRIGGER trigger_purchase_invoice_stock_movement
    AFTER INSERT OR UPDATE ON purchase_invoices
    FOR EACH ROW
    WHEN (NEW.status = 'RECEIVED')
    EXECUTE FUNCTION create_purchase_invoice_stock_movement();

-- =====================================================
-- 5. SALES INVOICE STOCK MOVEMENT TRIGGER
-- =====================================================

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_sales_invoice_stock_movement ON sales_invoices;
DROP FUNCTION IF EXISTS create_sales_invoice_stock_movement();

-- Function to create stock movements from sales invoice
CREATE OR REPLACE FUNCTION create_sales_invoice_stock_movement()
RETURNS TRIGGER AS $$
DECLARE
    line_item RECORD;
BEGIN
    -- Only process when status changes to SUBMITTED
    IF NEW.status = 'SUBMITTED' AND (OLD IS NULL OR OLD.status != 'SUBMITTED') THEN
        
        -- Check if stock movements already exist for this invoice
        IF EXISTS (
            SELECT 1 FROM stock_movements 
            WHERE reference_type = 'sales_invoice' 
            AND reference_id = NEW.id
        ) THEN
            RAISE NOTICE 'Stock movements already exist for sales invoice %', NEW.invoice_number;
            RETURN NEW;
        END IF;
        
        -- Create stock movements for each line item
        FOR line_item IN 
            SELECT * FROM invoice_line_items 
            WHERE invoice_id = NEW.id AND item_id IS NOT NULL
        LOOP
            -- Get average cost from stock levels
            DECLARE
                avg_cost DECIMAL(15,4) := 0;
            BEGIN
                SELECT average_cost INTO avg_cost
                FROM stock_levels
                WHERE company_id = NEW.company_id AND item_id = line_item.item_id
                LIMIT 1;
                
                -- Create stock movement (OUT for sales)
                PERFORM create_stock_movement(
                    NEW.company_id,
                    line_item.item_id,
                    line_item.quantity,
                    COALESCE(avg_cost, 0), -- Use average cost for sales
                    'OUT',
                    'SALE',
                    'sales_invoice',
                    NEW.id,
                    NEW.invoice_number,
                    'Sale from invoice ' || NEW.invoice_number || ' - ' || COALESCE(line_item.description, line_item.item_name),
                    NULL -- warehouse_id
                );
            END;
        END LOOP;
        
        RAISE NOTICE 'Created stock movements for sales invoice %', NEW.invoice_number;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for sales invoice stock movements
CREATE TRIGGER trigger_sales_invoice_stock_movement
    AFTER INSERT OR UPDATE ON sales_invoices
    FOR EACH ROW
    WHEN (NEW.status = 'SUBMITTED')
    EXECUTE FUNCTION create_sales_invoice_stock_movement();

-- =====================================================
-- 6. UTILITY VIEWS AND FUNCTIONS
-- =====================================================

-- View for current stock levels with item details
CREATE OR REPLACE VIEW current_stock_levels AS
SELECT 
    sl.id,
    sl.company_id,
    c.name as company_name,
    sl.item_id,
    i.item_code,
    i.name as item_name,
    i.description as item_description,
    sl.current_quantity,
    sl.reserved_quantity,
    sl.available_quantity,
    sl.reorder_level,
    sl.max_level,
    sl.average_cost,
    sl.last_cost,
    sl.total_value,
    CASE 
        WHEN sl.current_quantity <= sl.reorder_level THEN 'LOW_STOCK'
        WHEN sl.current_quantity >= sl.max_level THEN 'OVERSTOCK'
        ELSE 'NORMAL'
    END as stock_status,
    sl.updated_at
FROM stock_levels sl
JOIN companies c ON sl.company_id = c.id
JOIN items i ON sl.item_id = i.id
WHERE sl.is_active = true
ORDER BY c.name, i.item_code;

-- View for stock movements with details
CREATE OR REPLACE VIEW stock_movements_with_details AS
SELECT 
    sm.id,
    sm.company_id,
    c.name as company_name,
    sm.item_id,
    i.item_code,
    i.name as item_name,
    sm.movement_type,
    sm.movement_source,
    sm.reference_type,
    sm.reference_id,
    sm.reference_number,
    sm.quantity,
    sm.unit_cost,
    sm.total_cost,
    sm.movement_date,
    sm.description,
    sm.created_at,
    CASE 
        WHEN sm.movement_type = 'IN' THEN sm.quantity
        ELSE 0
    END as quantity_in,
    CASE 
        WHEN sm.movement_type = 'OUT' THEN sm.quantity
        ELSE 0
    END as quantity_out
FROM stock_movements sm
JOIN companies c ON sm.company_id = c.id
JOIN items i ON sm.item_id = i.id
WHERE sm.is_active = true
ORDER BY sm.movement_date DESC, sm.created_at DESC;

-- Grant permissions on views
GRANT SELECT ON current_stock_levels TO authenticated;
GRANT SELECT ON stock_movements_with_details TO authenticated;

-- =====================================================
-- 7. VERIFICATION AND STATUS
-- =====================================================

-- Show success message
SELECT '=== COMPLETE STOCK SYSTEM CREATED SUCCESSFULLY ===' as status;

-- Verify tables were created
SELECT 
    table_name,
    'Created successfully' as status
FROM information_schema.tables 
WHERE table_name IN ('stock_levels', 'stock_movements')
AND table_schema = 'public'
ORDER BY table_name;

-- Verify functions were created
SELECT 
    routine_name as function_name,
    routine_type,
    'Created successfully' as status
FROM information_schema.routines 
WHERE routine_name IN (
    'create_stock_movement', 
    'update_stock_levels', 
    'initialize_stock_level',
    'create_purchase_invoice_stock_movement',
    'create_sales_invoice_stock_movement'
)
ORDER BY routine_name;

-- Verify triggers were created
SELECT 
    trigger_name,
    event_object_table as table_name,
    action_timing,
    event_manipulation,
    'Active' as status
FROM information_schema.triggers 
WHERE trigger_name IN ('trigger_purchase_invoice_stock_movement', 'trigger_sales_invoice_stock_movement')
ORDER BY trigger_name;

-- Show views created
SELECT 
    table_name as view_name,
    'Created successfully' as status
FROM information_schema.views 
WHERE table_name IN ('current_stock_levels', 'stock_movements_with_details')
ORDER BY table_name;

-- Instructions
SELECT '=== SYSTEM READY ===' as instruction;
SELECT 'Stock levels table created for live inventory tracking' as info1;
SELECT 'Stock movements will be created automatically when invoices are processed' as info2;
SELECT 'Purchase invoices: Stock IN when status = RECEIVED' as info3;
SELECT 'Sales invoices: Stock OUT when status = SUBMITTED' as info4;
SELECT 'Use current_stock_levels view to see live stock levels' as info5;
SELECT 'Use stock_movements_with_details view to see movement history' as info6;
