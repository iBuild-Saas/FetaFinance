-- Fix Create Stock Movement Function
-- Ensure it properly updates quantity_on_hand

CREATE OR REPLACE FUNCTION create_stock_movement(
    p_item_id UUID,
    p_company_id UUID,
    p_movement_type TEXT,
    p_quantity DECIMAL,
    p_unit_cost DECIMAL,
    p_reference_type TEXT,
    p_reference_id UUID,
    p_reference_number TEXT,
    p_notes TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_movement_id UUID;
    v_total_cost DECIMAL;
    v_stock_item_exists BOOLEAN;
    v_current_qty DECIMAL := 0;
    v_current_cost DECIMAL := 0;
    v_new_avg_cost DECIMAL;
    v_new_total_qty DECIMAL;
BEGIN
    -- Calculate total cost
    v_total_cost := p_quantity * p_unit_cost;
    
    -- Generate movement ID
    v_movement_id := gen_random_uuid();
    
    -- Insert stock movement record
    INSERT INTO stock_movements (
        id, item_id, company_id, movement_type, quantity, unit_cost, total_cost,
        reference_type, reference_id, reference_number, movement_date, notes,
        created_at, updated_at
    ) VALUES (
        v_movement_id, p_item_id, p_company_id, p_movement_type, p_quantity, p_unit_cost, v_total_cost,
        p_reference_type, p_reference_id, p_reference_number, NOW(), p_notes,
        NOW(), NOW()
    );
    
    -- Check if stock item exists
    SELECT EXISTS(
        SELECT 1 FROM stock_items 
        WHERE item_id = p_item_id AND company_id = p_company_id
    ) INTO v_stock_item_exists;
    
    IF v_stock_item_exists THEN
        -- Get current stock levels
        SELECT quantity_on_hand, average_cost
        INTO v_current_qty, v_current_cost
        FROM stock_items
        WHERE item_id = p_item_id AND company_id = p_company_id;
        
        -- Calculate new values based on movement type
        IF p_movement_type = 'IN' THEN
            v_new_total_qty := v_current_qty + p_quantity;
            -- Weighted average cost calculation
            IF v_new_total_qty > 0 THEN
                v_new_avg_cost := ((v_current_qty * v_current_cost) + (p_quantity * p_unit_cost)) / v_new_total_qty;
            ELSE
                v_new_avg_cost := p_unit_cost;
            END IF;
        ELSE -- OUT movement
            v_new_total_qty := v_current_qty - p_quantity;
            v_new_avg_cost := v_current_cost; -- Keep same average cost for OUT movements
        END IF;
        
        -- Update existing stock item
        UPDATE stock_items SET
            quantity_on_hand = v_new_total_qty,
            available_quantity = v_new_total_qty, -- Both should be the same for simple cases
            reserved_quantity = 0,
            average_cost = v_new_avg_cost,
            last_cost = p_unit_cost,
            updated_at = NOW()
        WHERE item_id = p_item_id AND company_id = p_company_id;
        
    ELSE
        -- Create new stock item for IN movements
        IF p_movement_type = 'IN' THEN
            INSERT INTO stock_items (
                id, item_id, company_id, quantity_on_hand, available_quantity, 
                reserved_quantity, average_cost, last_cost, created_at, updated_at
            ) VALUES (
                gen_random_uuid(), p_item_id, p_company_id, p_quantity, p_quantity,
                0, p_unit_cost, p_unit_cost, NOW(), NOW()
            );
        END IF;
    END IF;
    
    RETURN v_movement_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in create_stock_movement: %', SQLERRM;
END;
$$;
