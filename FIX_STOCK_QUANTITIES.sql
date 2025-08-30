-- Fix Stock Quantities Issue
-- Update quantity_on_hand to match available_quantity for existing stock items

-- === BEFORE: Current Stock Items ===
SELECT 'BEFORE: Current Stock Items' as section;
SELECT 
    si.id,
    i.item_code,
    i.name as item_name,
    si.quantity_on_hand,
    si.available_quantity,
    si.average_cost,
    (si.quantity_on_hand * si.average_cost) as current_total_value,
    (si.available_quantity * si.average_cost) as correct_total_value
FROM stock_items si
LEFT JOIN items i ON si.item_id = i.id;

-- === FIXING: Update quantity_on_hand to match available_quantity ===
SELECT 'FIXING: Update quantity_on_hand to match available_quantity' as section;
UPDATE stock_items 
SET 
    quantity_on_hand = available_quantity,
    updated_at = NOW()
WHERE quantity_on_hand = 0 AND available_quantity > 0;

-- === AFTER: Updated Stock Items ===
SELECT 'AFTER: Updated Stock Items' as section;
SELECT 
    si.id,
    i.item_code,
    i.name as item_name,
    si.quantity_on_hand,
    si.available_quantity,
    si.average_cost,
    (si.quantity_on_hand * si.average_cost) as total_value
FROM stock_items si
LEFT JOIN items i ON si.item_id = i.id;
