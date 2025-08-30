# Stock System Setup Guide

## Overview
This guide will help you set up the complete stock management system with automatic stock movements and live inventory tracking.

## Prerequisites
- Supabase database with existing tables: `companies`, `items`, `purchase_invoices`, `purchase_invoice_line_items`, `sales_invoices`, `invoice_line_items`
- Auto journal entry system already configured (from previous setup)

## Setup Steps

### 1. Run the Stock System SQL Script
Execute the following SQL script in your Supabase SQL editor:

```sql
-- Run this file: COMPLETE_STOCK_SYSTEM_WITH_TRIGGERS.sql
```

This script will:
- Create `stock_levels` table for live inventory tracking
- Create `stock_movements` table for movement history
- Create functions for stock management
- Set up triggers for automatic stock movements
- Create views for easy data access

### 2. Verify Database Setup
After running the script, verify the setup:

```sql
-- Check if tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('stock_levels', 'stock_movements') 
AND table_schema = 'public';

-- Check if triggers are active
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name IN ('trigger_purchase_invoice_stock_movement', 'trigger_sales_invoice_stock_movement');

-- Check if views are created
SELECT table_name FROM information_schema.views 
WHERE table_name IN ('current_stock_levels', 'stock_movements_with_details');
```

### 3. Test the System

#### Test Purchase Invoice Stock Movement
1. Create a purchase invoice with line items
2. Set the status to 'RECEIVED'
3. Check that stock movements are created:

```sql
SELECT * FROM stock_movements_with_details 
WHERE reference_type = 'purchase_invoice' 
ORDER BY created_at DESC;
```

4. Verify stock levels are updated:

```sql
SELECT * FROM current_stock_levels 
ORDER BY item_code;
```

#### Test Sales Invoice Stock Movement
1. Create a sales invoice with line items
2. Set the status to 'SUBMITTED'
3. Check that stock movements are created:

```sql
SELECT * FROM stock_movements_with_details 
WHERE reference_type = 'sales_invoice' 
ORDER BY created_at DESC;
```

## How It Works

### Automatic Stock Movements

#### Purchase Invoices
- **Trigger**: When status changes to 'RECEIVED'
- **Movement Type**: IN
- **Movement Source**: PURCHASE
- **Effect**: Increases stock levels, updates weighted average cost

#### Sales Invoices
- **Trigger**: When status changes to 'SUBMITTED'
- **Movement Type**: OUT
- **Movement Source**: SALE
- **Effect**: Decreases stock levels, uses average cost for valuation

### Stock Level Calculations
- **Current Quantity**: Physical quantity on hand
- **Reserved Quantity**: Quantity allocated to pending orders
- **Available Quantity**: Current - Reserved (calculated field)
- **Average Cost**: Weighted average cost of inventory
- **Total Value**: Current Quantity × Average Cost (calculated field)

### UI Integration
The React Inventory page (`src/pages/Inventory.tsx`) has been updated to:
- Fetch from `stock_levels` table instead of `stock_items`
- Display stock movements with correct field mappings
- Show live inventory levels and valuations
- Provide movement history with source tracking

## Troubleshooting

### Common Issues

1. **"Table doesn't exist" error**
   - Ensure you've run `COMPLETE_STOCK_SYSTEM_WITH_TRIGGERS.sql`
   - Check table permissions in Supabase

2. **Stock movements not created**
   - Verify triggers are active
   - Check invoice status is exactly 'RECEIVED' or 'SUBMITTED'
   - Ensure line items have valid `item_id`

3. **UI not showing data**
   - Check browser console for errors
   - Verify company is selected in the navbar
   - Ensure RLS policies allow access to new tables

### Debug Queries

```sql
-- Check recent stock movements
SELECT * FROM stock_movements 
WHERE created_at > NOW() - INTERVAL '1 day' 
ORDER BY created_at DESC;

-- Check stock levels for a company
SELECT * FROM current_stock_levels 
WHERE company_id = 'your-company-id';

-- Check trigger execution logs
SELECT * FROM pg_stat_user_functions 
WHERE funcname LIKE '%stock%';
```

## Features

### Live Stock Tracking
- Real-time inventory levels
- Automatic cost calculations
- Stock status indicators (In Stock, Low Stock, Out of Stock)

### Movement History
- Complete audit trail of all stock movements
- Source document tracking
- Date and time stamps

### Inventory Valuation
- Weighted average costing
- Total inventory value calculations
- Top items by value reporting

### Integration
- Seamless integration with purchase and sales invoices
- Automatic journal entry creation (from previous setup)
- Real-time UI updates

## Next Steps

1. **Test with Real Data**: Create test invoices and verify stock movements
2. **Configure Reorder Levels**: Set appropriate reorder levels for items
3. **Set Up Alerts**: Create notifications for low stock items
4. **Add Warehouses**: Extend system for multi-warehouse support if needed

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all prerequisites are met
3. Review the SQL script execution logs
4. Check Supabase logs for any errors

The system is now ready for production use with automatic stock tracking and live inventory management!
