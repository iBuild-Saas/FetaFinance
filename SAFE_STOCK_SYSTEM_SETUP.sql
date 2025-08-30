-- =====================================================
-- SAFE STOCK SYSTEM SETUP - NO DEPENDENCIES ON MISSING COLUMNS
-- =====================================================
-- This script creates stock system without assuming any specific columns exist

-- =====================================================
-- 1. CREATE STOCK LEVELS TABLE
-- =====================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS stock_levels CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;

-- Create stock_levels table
CREATE TABLE stock_levels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    item_id UUID NOT NULL,
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

-- Create stock_movements table
CREATE TABLE stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL,
    item_id UUID NOT NULL,
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_stock_levels_company_item ON stock_levels(company_id, item_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_warehouse ON stock_levels(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_reorder ON stock_levels(company_id) WHERE current_quantity <= reorder_level;
CREATE INDEX IF NOT EXISTS idx_stock_levels_active ON stock_levels(is_active);

CREATE INDEX IF NOT EXISTS idx_stock_movements_company_item ON stock_movements(company_id, item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_source ON stock_movements(movement_source);
CREATE INDEX IF NOT EXISTS idx_stock_movements_active ON stock_movements(is_active);

-- Grant permissions
GRANT ALL ON stock_levels TO authenticated;
GRANT ALL ON stock_movements TO authenticated;

-- =====================================================
-- 2. STOCK MANAGEMENT FUNCTIONS
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
    
    RETURN movement_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. PURCHASE INVOICE STOCK MOVEMENT TRIGGER
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
                'Purchase from invoice ' || NEW.invoice_number,
                NULL -- warehouse_id
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for purchase invoice stock movements
CREATE TRIGGER trigger_purchase_invoice_stock_movement
    AFTER INSERT OR UPDATE ON purchase_invoices
    FOR EACH ROW
    EXECUTE FUNCTION create_purchase_invoice_stock_movement();

-- =====================================================
-- 4. SALES INVOICE STOCK MOVEMENT TRIGGER
-- =====================================================

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_sales_invoice_stock_movement ON sales_invoices;
DROP FUNCTION IF EXISTS create_sales_invoice_stock_movement();

-- Function to create stock movements from sales invoice
CREATE OR REPLACE FUNCTION create_sales_invoice_stock_movement()
RETURNS TRIGGER AS $$
DECLARE
    line_item RECORD;
    avg_cost DECIMAL(15,4);
BEGIN
    -- Only process when status changes to SUBMITTED
    IF NEW.status = 'SUBMITTED' AND (OLD IS NULL OR OLD.status != 'SUBMITTED') THEN
        
        -- Check if stock movements already exist for this invoice
        IF EXISTS (
            SELECT 1 FROM stock_movements 
            WHERE reference_type = 'sales_invoice' 
            AND reference_id = NEW.id
        ) THEN
            RETURN NEW;
        END IF;
        
        -- Create stock movements for each line item
        FOR line_item IN 
            SELECT * FROM invoice_line_items 
            WHERE invoice_id = NEW.id AND item_id IS NOT NULL
        LOOP
            -- Get average cost from stock levels
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
                'Sale from invoice ' || NEW.invoice_number,
                NULL -- warehouse_id
            );
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for sales invoice stock movements
CREATE TRIGGER trigger_sales_invoice_stock_movement
    AFTER INSERT OR UPDATE ON sales_invoices
    FOR EACH ROW
    EXECUTE FUNCTION create_sales_invoice_stock_movement();

-- =====================================================
-- 5. SIMPLE VIEWS (NO EXTERNAL DEPENDENCIES)
-- =====================================================

-- Simple stock levels view
CREATE OR REPLACE VIEW current_stock_levels AS
SELECT 
    sl.id,
    sl.company_id,
    sl.item_id,
    sl.current_quantity,
    sl.reserved_quantity,
    sl.available_quantity,
    sl.reorder_level,
    sl.max_level,
    sl.average_cost,
    sl.last_cost,
    sl.total_value,
    CASE 
        WHEN sl.current_quantity <= 0 THEN 'OUT_OF_STOCK'
        WHEN sl.current_quantity <= sl.reorder_level THEN 'LOW_STOCK'
        WHEN sl.current_quantity >= sl.max_level THEN 'OVERSTOCK'
        ELSE 'NORMAL'
    END as stock_status,
    sl.updated_at
FROM stock_levels sl
WHERE sl.is_active = true
ORDER BY sl.company_id, sl.item_id;

-- Simple stock movements view
CREATE OR REPLACE VIEW stock_movements_with_details AS
SELECT 
    sm.id,
    sm.company_id,
    sm.item_id,
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
WHERE sm.is_active = true
ORDER BY sm.movement_date DESC, sm.created_at DESC;

-- Grant permissions on views
GRANT SELECT ON current_stock_levels TO authenticated;
GRANT SELECT ON stock_movements_with_details TO authenticated;

-- =====================================================
-- 6. SUCCESS MESSAGE
-- =====================================================

SELECT '=== SAFE STOCK SYSTEM CREATED SUCCESSFULLY ===' as status;
SELECT 'Tables: stock_levels, stock_movements' as info1;
SELECT 'Triggers: purchase_invoice, sales_invoice' as info2;
SELECT 'Views: current_stock_levels, stock_movements_with_details' as info3;
SELECT 'System ready for testing!' as info4;
