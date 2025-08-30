-- Debug why stock movements are not being created for sales invoices

-- 1. Check if the stock movement trigger exists and is active
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_sales_stock_movement';

-- 2. Check if the stock movement function exists
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'create_sales_stock_movement';

-- 3. Check recent sales invoices and their line items
SELECT 'Recent Sales Invoices:' as check_type;
SELECT 
    id,
    invoice_number,
    status,
    created_at
FROM sales_invoices 
ORDER BY created_at DESC 
LIMIT 3;

-- 4. Check if line items have item_id values
SELECT 'Sales Invoice Line Items:' as check_type;
SELECT 
    sil.sales_invoice_id,
    si.invoice_number,
    sil.item_id,
    sil.item_name,
    sil.quantity,
    sil.unit_price
FROM sales_invoice_line_items sil
JOIN sales_invoices si ON sil.sales_invoice_id = si.id
ORDER BY sil.created_at DESC
LIMIT 5;

-- 5. Check existing stock movements
SELECT 'Existing Stock Movements:' as check_type;
SELECT 
    id,
    item_id,
    movement_type,
    movement_source,
    quantity,
    reference_type,
    reference_number,
    created_at
FROM stock_movements 
WHERE movement_source = 'SALES_INVOICE'
ORDER BY created_at DESC
LIMIT 5;

-- 6. Check if stock_items table exists and has data
SELECT 'Stock Items Count:' as check_type;
SELECT COUNT(*) as total_stock_items FROM stock_items;

-- 7. Test the function manually with a recent invoice
SELECT 'Testing function manually...' as test_type;
-- Get the most recent SUBMITTED sales invoice
SELECT 
    id,
    invoice_number,
    status
FROM sales_invoices 
WHERE status = 'SUBMITTED'
ORDER BY created_at DESC 
LIMIT 1;
