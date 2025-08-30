# Sales Invoice Automation Setup Guide

## Overview
This guide explains how to set up automatic journal entries and stock movements for sales invoices, similar to the purchase invoice system.

## What Happens Automatically

When a sales invoice is saved with **SUBMITTED** status, the system will automatically:

### 1. Journal Entries
- **DR** Accounts Receivable (total amount)
- **CR** Sales Revenue (subtotal)
- **CR** Sales Tax Payable (tax amount, if applicable)
- **DR** Cost of Goods Sold (if COGS accounts configured)
- **CR** Inventory (if COGS accounts configured)

### 2. Stock Movements
- Creates stock movement records with type "OUT"
- Reduces inventory quantities for all line items
- Updates `stock_items` table with new quantities
- Tracks movement history for audit purposes

## Required Company Account Setup

Configure these accounts in your `companies` table:

### Required Accounts
1. **Sales Revenue Account** (`default_sales_revenue_account_id`)
   - Where sales revenue is recorded
   - Example: "4000 - Sales Revenue"

2. **Accounts Receivable Account** (`accounts_receivable_account_id`)
   - Where customer receivables are tracked
   - Example: "1200 - Accounts Receivable"

### Optional Accounts
3. **Sales Tax Payable Account** (`sales_tax_payable_account_id`)
   - Only needed if you charge sales tax
   - Example: "2300 - Sales Tax Payable"

4. **Cost of Goods Sold Account** (`cost_of_goods_sold_account_id`)
   - For automatic COGS calculation
   - Example: "5000 - Cost of Goods Sold"

5. **Inventory Account** (`default_inventory_account_id`)
   - For inventory value reduction (COGS)
   - Example: "1300 - Inventory"

## Setup Steps

### Step 1: Run the Automation Script
```sql
-- Execute this in your Supabase SQL Editor
\i COMPLETE_SALES_INVOICE_AUTOMATION.sql
```

### Step 2: Configure Company Accounts
Update your companies table with the required account IDs:

```sql
UPDATE companies 
SET 
    default_sales_revenue_account_id = 'your-revenue-account-id',
    accounts_receivable_account_id = 'your-receivable-account-id',
    sales_tax_payable_account_id = 'your-tax-payable-account-id',  -- Optional
    cost_of_goods_sold_account_id = 'your-cogs-account-id',        -- Optional
    default_inventory_account_id = 'your-inventory-account-id'     -- Optional
WHERE id = 'your-company-id';
```

### Step 3: Test the System
1. Create a sales invoice with line items
2. Set status to **SUBMITTED**
3. Save the invoice
4. Check that journal entries and stock movements were created

## Verification Queries

### Check Journal Entries
```sql
SELECT * FROM journal_entries 
WHERE reference_type = 'sales_invoice' 
ORDER BY created_at DESC;
```

### Check Stock Movements
```sql
SELECT * FROM stock_movements 
WHERE movement_source = 'SALES_INVOICE' 
ORDER BY created_at DESC;
```

### Check Stock Levels
```sql
SELECT 
    si.*,
    i.item_code,
    i.name as item_name
FROM stock_items si
JOIN items i ON si.item_id = i.id
WHERE si.company_id = 'your-company-id'
ORDER BY si.updated_at DESC;
```

## Important Notes

### Stock Management
- Sales reduce inventory quantities (OUT movements)
- If an item doesn't exist in `stock_items`, it will be created with negative quantity
- Negative quantities indicate stock shortages
- Average costs are used for COGS calculations

### Journal Entry Logic
- **Basic Entry**: Always creates DR Accounts Receivable, CR Sales Revenue
- **Tax Entry**: Only if tax amount > 0 and tax account configured
- **COGS Entry**: Only if both COGS and Inventory accounts configured
- **COGS Calculation**: Uses average cost from stock_items, falls back to 70% of selling price

### Error Handling
- Missing required accounts will cause the transaction to fail
- All operations are wrapped in transactions for data integrity
- Detailed error messages help identify configuration issues

## Troubleshooting

### Common Issues

1. **"No default sales revenue account configured"**
   - Solution: Set `default_sales_revenue_account_id` in companies table

2. **"No default accounts receivable account configured"**
   - Solution: Set `accounts_receivable_account_id` in companies table

3. **Stock movements not created**
   - Check that line items have valid `item_id` values
   - Ensure `stock_items` table exists and is properly configured

4. **COGS entries not created**
   - Both `cost_of_goods_sold_account_id` and `default_inventory_account_id` must be configured
   - This is optional - system works without COGS entries

### Debug Queries

Check company account configuration:
```sql
SELECT 
    c.name,
    rev.account_code as revenue_account,
    rec.account_code as receivable_account,
    tax.account_code as tax_payable_account,
    cogs.account_code as cogs_account,
    inv.account_code as inventory_account
FROM companies c
LEFT JOIN chart_of_accounts rev ON c.default_sales_revenue_account_id = rev.id
LEFT JOIN chart_of_accounts rec ON c.accounts_receivable_account_id = rec.id
LEFT JOIN chart_of_accounts tax ON c.sales_tax_payable_account_id = tax.id
LEFT JOIN chart_of_accounts cogs ON c.cost_of_goods_sold_account_id = cogs.id
LEFT JOIN chart_of_accounts inv ON c.default_inventory_account_id = inv.id
WHERE c.id = 'your-company-id';
```

## Integration with UI

The system works with your existing sales invoice UI. Just ensure:

1. Invoice status can be set to "SUBMITTED"
2. Line items include valid `item_id` references
3. Subtotal, tax amount, and total amount are calculated correctly

No UI changes are required - the automation happens at the database level when invoices are submitted.
