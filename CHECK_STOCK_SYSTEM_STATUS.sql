-- =====================================================
-- CHECK STOCK SYSTEM STATUS
-- =====================================================
-- Run this to see what's missing and what needs to be created

-- Check if stock tables exist
SELECT 
    'stock_levels' as table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_levels' AND table_schema = 'public')
        THEN 'EXISTS' 
        ELSE 'MISSING - NEED TO CREATE'
    END as status
UNION ALL
SELECT 
    'stock_movements' as table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_movements' AND table_schema = 'public')
        THEN 'EXISTS' 
        ELSE 'MISSING - NEED TO CREATE'
    END as status;

-- Check if triggers exist
SELECT 
    trigger_name,
    event_object_table,
    'EXISTS' as status
FROM information_schema.triggers 
WHERE trigger_name IN ('trigger_purchase_invoice_stock_movement', 'trigger_sales_invoice_stock_movement')
UNION ALL
SELECT 
    'trigger_purchase_invoice_stock_movement' as trigger_name,
    'purchase_invoices' as event_object_table,
    'MISSING - NEED TO CREATE' as status
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'trigger_purchase_invoice_stock_movement'
)
UNION ALL
SELECT 
    'trigger_sales_invoice_stock_movement' as trigger_name,
    'sales_invoices' as event_object_table,
    'MISSING - NEED TO CREATE' as status
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'trigger_sales_invoice_stock_movement'
);

-- Check if views exist
SELECT 
    table_name as view_name,
    'EXISTS' as status
FROM information_schema.views 
WHERE table_name IN ('current_stock_levels', 'stock_movements_with_details')
UNION ALL
SELECT 
    'current_stock_levels' as view_name,
    'MISSING - NEED TO CREATE' as status
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_name = 'current_stock_levels'
)
UNION ALL
SELECT 
    'stock_movements_with_details' as view_name,
    'MISSING - NEED TO CREATE' as status
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_name = 'stock_movements_with_details'
);

-- Show next steps
SELECT '=== NEXT STEPS ===' as instruction;
SELECT 'If any items show MISSING, run SAFE_STOCK_SYSTEM_SETUP.sql' as step1;
SELECT 'Then refresh your UI to test the stock system' as step2;
