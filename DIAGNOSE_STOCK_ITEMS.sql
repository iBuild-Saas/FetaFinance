-- Diagnose Stock Items Issue
-- Check what's actually in the stock_items table

-- === STOCK ITEMS TABLE STRUCTURE ===
SELECT 'STOCK ITEMS TABLE STRUCTURE' as section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'stock_items' 
ORDER BY ordinal_position;

-- === CURRENT STOCK ITEMS DATA ===
SELECT 'CURRENT STOCK ITEMS DATA' as section;
SELECT 
    si.id,
    si.item_id,
    i.item_code,
    i.name as item_name,
    si.quantity_on_hand,
    si.available_quantity,
    si.reserved_quantity,
    si.average_cost,
    si.last_cost,
    si.created_at,
    si.updated_at
FROM stock_items si
LEFT JOIN items i ON si.item_id = i.id
ORDER BY si.updated_at DESC;

-- === RECENT STOCK MOVEMENTS ===
SELECT 'RECENT STOCK MOVEMENTS' as section;
SELECT 
    sm.id,
    sm.item_id,
    i.item_code,
    sm.movement_type,
    sm.quantity,
    sm.unit_cost,
    sm.total_cost,
    sm.reference_type,
    sm.reference_number,
    sm.movement_date,
    sm.created_at
FROM stock_movements sm
LEFT JOIN items i ON sm.item_id = i.id
ORDER BY sm.created_at DESC
LIMIT 10;

-- === CHECK CREATE_STOCK_MOVEMENT FUNCTION ===
SELECT 'CREATE_STOCK_MOVEMENT FUNCTION' as section;
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'create_stock_movement'
AND n.nspname = 'public';
