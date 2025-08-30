-- Fixed Inventory System Setup
-- This version checks the items table structure and adapts accordingly

-- =====================================================
-- 1. CREATE STOCK TABLES
-- =====================================================

-- Create stock_items table to track current inventory levels
CREATE TABLE IF NOT EXISTS stock_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES companies(id) NOT NULL,
    item_id UUID REFERENCES items(id) NOT NULL,
    warehouse_id UUID DEFAULT NULL,
    current_quantity DECIMAL(15,3) DEFAULT 0.00,
    reserved_quantity DECIMAL(15,3) DEFAULT 0.00,
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

-- Create stock_movements table to track all inventory movements
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES companies(id) NOT NULL,
    item_id UUID REFERENCES items(id) NOT NULL,
    warehouse_id UUID DEFAULT NULL,
    movement_type VARCHAR(20) NOT NULL, -- IN, OUT, ADJUSTMENT, TRANSFER
    movement_source VARCHAR(20) NOT NULL, -- PURCHASE, SALE, ADJUSTMENT, PRODUCTION, OPENING
    reference_type VARCHAR(30), -- sales_invoice, purchase_invoice, journal_entry, etc.
    reference_id UUID, -- ID of the source document
    reference_number VARCHAR(50), -- Document number for easy reference
    quantity DECIMAL(15,3) NOT NULL,
    unit_cost DECIMAL(15,4) DEFAULT 0.00,
    total_cost DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    created_by UUID DEFAULT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. CREATE INDEXES
-- =====================================================

-- Stock items indexes
CREATE INDEX IF NOT EXISTS idx_stock_items_company_item ON stock_items(company_id, item_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_warehouse ON stock_items(warehouse_id);

-- Stock movements indexes
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_item ON stock_movements(company_id, item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);

-- =====================================================
-- 3. CREATE ESSENTIAL FUNCTIONS
-- =====================================================

-- Function to get current stock levels (fixed column references)
CREATE OR REPLACE FUNCTION get_stock_levels(p_company_id UUID)
RETURNS TABLE (
    item_id UUID,
    item_code VARCHAR,
    item_name VARCHAR,
    current_quantity DECIMAL(15,3),
    available_quantity DECIMAL(15,3),
    average_cost DECIMAL(15,4),
    total_value DECIMAL(15,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        si.item_id,
        -- Handle both possible column names for item code
        COALESCE(
            (CASE WHEN EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'items' AND column_name = 'item_code'
            ) THEN i.item_code ELSE NULL END),
            i.name
        ) as item_code,
        -- Handle both possible column names for item name
        COALESCE(
            (CASE WHEN EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'items' AND column_name = 'item_name'
            ) THEN i.item_name ELSE NULL END),
            i.name
        ) as item_name,
        si.current_quantity,
        si.available_quantity,
        si.average_cost,
        si.total_value
    FROM stock_items si
    JOIN items i ON si.item_id = i.id
    WHERE si.company_id = p_company_id
    AND si.is_active = true
    ORDER BY i.name;
END;
$$ LANGUAGE plpgsql;

-- Simpler version that works with standard items table structure
CREATE OR REPLACE FUNCTION get_stock_levels_simple(p_company_id UUID)
RETURNS TABLE (
    item_id UUID,
    item_code VARCHAR,
    item_name VARCHAR,
    current_quantity DECIMAL(15,3),
    available_quantity DECIMAL(15,3),
    average_cost DECIMAL(15,4),
    total_value DECIMAL(15,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        si.item_id,
        i.name::VARCHAR as item_code,  -- Use name as code if no separate code column
        i.name::VARCHAR as item_name,  -- Use name column
        si.current_quantity,
        si.available_quantity,
        si.average_cost,
        si.total_value
    FROM stock_items si
    JOIN items i ON si.item_id = i.id
    WHERE si.company_id = p_company_id
    AND si.is_active = true
    ORDER BY i.name;
END;
$$ LANGUAGE plpgsql;

-- Function to initialize stock item if it doesn't exist
CREATE OR REPLACE FUNCTION initialize_stock_item(
    p_company_id UUID,
    p_item_id UUID,
    p_warehouse_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    stock_item_id UUID;
BEGIN
    -- Check if stock item already exists
    SELECT id INTO stock_item_id
    FROM stock_items
    WHERE company_id = p_company_id 
    AND item_id = p_item_id 
    AND COALESCE(warehouse_id, gen_random_uuid()) = COALESCE(p_warehouse_id, gen_random_uuid());
    
    -- If not exists, create it
    IF stock_item_id IS NULL THEN
        INSERT INTO stock_items (company_id, item_id, warehouse_id, current_quantity, average_cost)
        VALUES (p_company_id, p_item_id, p_warehouse_id, 0, 0)
        RETURNING id INTO stock_item_id;
    END IF;
    
    RETURN stock_item_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update stock levels and calculate weighted average cost
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
    -- Initialize stock item if it doesn't exist
    PERFORM initialize_stock_item(p_company_id, p_item_id, p_warehouse_id);
    
    -- Get current values
    SELECT current_quantity, average_cost
    INTO current_qty, current_avg_cost
    FROM stock_items
    WHERE company_id = p_company_id 
    AND item_id = p_item_id 
    AND COALESCE(warehouse_id, gen_random_uuid()) = COALESCE(p_warehouse_id, gen_random_uuid());
    
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
    
    -- Ensure quantity doesn't go negative
    IF new_qty < 0 THEN
        new_qty := 0;
    END IF;
    
    -- Update stock item
    UPDATE stock_items
    SET 
        current_quantity = new_qty,
        average_cost = new_avg_cost,
        last_cost = CASE WHEN p_movement_type = 'IN' THEN p_unit_cost ELSE last_cost END,
        updated_at = NOW()
    WHERE company_id = p_company_id 
    AND item_id = p_item_id 
    AND COALESCE(warehouse_id, gen_random_uuid()) = COALESCE(p_warehouse_id, gen_random_uuid());
END;
$$ LANGUAGE plpgsql;

-- Function to create stock movement record
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
-- 4. CREATE VIEWS (Fixed column references)
-- =====================================================

-- View for stock movement history (using simple column references)
CREATE OR REPLACE VIEW stock_movement_history AS
SELECT 
    sm.*,
    i.name as item_code,  -- Use name as code
    i.name as item_name,  -- Use name column
    CASE 
        WHEN sm.movement_type = 'IN' THEN sm.quantity
        ELSE 0
    END as quantity_in,
    CASE 
        WHEN sm.movement_type = 'OUT' THEN sm.quantity
        ELSE 0
    END as quantity_out
FROM stock_movements sm
JOIN items i ON sm.item_id = i.id
WHERE sm.is_active = true
ORDER BY sm.movement_date DESC, sm.created_at DESC;

-- =====================================================
-- 5. GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON stock_items TO authenticated;
GRANT ALL ON stock_movements TO authenticated;
GRANT SELECT ON stock_movement_history TO authenticated;

-- =====================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE stock_items IS 'Current inventory levels and valuations for each item';
COMMENT ON TABLE stock_movements IS 'Historical record of all inventory movements';
COMMENT ON FUNCTION get_stock_levels_simple IS 'Returns current stock levels for all items in a company (simplified version)';
COMMENT ON FUNCTION create_stock_movement IS 'Creates stock movement and updates inventory levels';

-- =====================================================
-- 7. USE THE SIMPLE FUNCTION AS DEFAULT
-- =====================================================

-- Create an alias so the React component can use either function
CREATE OR REPLACE FUNCTION get_stock_levels(p_company_id UUID)
RETURNS TABLE (
    item_id UUID,
    item_code VARCHAR,
    item_name VARCHAR,
    current_quantity DECIMAL(15,3),
    available_quantity DECIMAL(15,3),
    average_cost DECIMAL(15,4),
    total_value DECIMAL(15,2)
) AS $$
BEGIN
    -- Use the simple version that works with standard items table
    RETURN QUERY SELECT * FROM get_stock_levels_simple(p_company_id);
END;
$$ LANGUAGE plpgsql;

SELECT 'Fixed Inventory System Setup Complete!' as status;
