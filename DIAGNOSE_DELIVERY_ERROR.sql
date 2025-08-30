-- Diagnose the delivery status error and line items issue

-- 1. Check stock_items table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'stock_items'
ORDER BY ordinal_position;

-- 2. Check if stock_items has the correct field names
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'quantity_on_hand') 
        THEN 'quantity_on_hand field exists'
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'quantity') 
        THEN 'quantity field exists (should be quantity_on_hand)'
        ELSE 'No quantity field found'
    END as quantity_field_status;

-- 3. Check recent sales invoice line items
SELECT 'Recent Sales Invoice Line Items:' as check_type;
SELECT 
    sil.sales_invoice_id,
    si.invoice_number,
    sil.item_id,
    sil.item_name,
    sil.quantity,
    sil.unit_price,
    sil.line_total
FROM sales_invoice_line_items sil
LEFT JOIN sales_invoices si ON sil.sales_invoice_id = si.id
ORDER BY sil.created_at DESC
LIMIT 5;

-- 4. Check if items exist for the line items
SELECT 'Items referenced in line items:' as check_type;
SELECT 
    i.id,
    i.name,
    i.code,
    si_count.line_item_count
FROM items i
JOIN (
    SELECT item_id, COUNT(*) as line_item_count
    FROM sales_invoice_line_items 
    WHERE item_id IS NOT NULL
    GROUP BY item_id
) si_count ON i.id = si_count.item_id
ORDER BY si_count.line_item_count DESC;

-- 5. Check stock_items for the items used in invoices
SELECT 'Stock items for invoice items:' as check_type;
SELECT 
    st.item_id,
    i.name as item_name,
    st.quantity_on_hand,
    st.average_cost,
    st.company_id
FROM stock_items st
JOIN items i ON st.item_id = i.id
WHERE st.item_id IN (
    SELECT DISTINCT item_id 
    FROM sales_invoice_line_items 
    WHERE item_id IS NOT NULL
)
LIMIT 10;
