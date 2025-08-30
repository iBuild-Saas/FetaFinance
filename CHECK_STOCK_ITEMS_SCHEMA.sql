-- Check stock_items table structure to understand why quantities aren't updating

-- 1. Check if stock_items table exists and its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'stock_items'
ORDER BY ordinal_position;

-- 2. Check current stock_items data (only select columns that exist)
SELECT 
    item_id,
    quantity,
    quantity_on_hand,
    current_quantity,
    available_quantity,
    average_cost
FROM stock_items 
LIMIT 5;

-- 3. Check recent stock movements (remove unit_cost if it doesn't exist)
SELECT 
    movement_date,
    item_id,
    movement_type,
    quantity,
    reference_type,
    reference_number
FROM stock_movements 
ORDER BY movement_date DESC 
LIMIT 10;
