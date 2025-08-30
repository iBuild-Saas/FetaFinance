# Auto Journal Entries & Inventory Management Setup Guide

## Overview
This system automatically creates journal entries and tracks inventory when sales and purchase invoices are processed.

## 🎯 Features

### Auto Journal Entries
- **Sales Invoices**: Automatically creates journal entries with:
  - Debit: Accounts Receivable
  - Credit: Sales Revenue (per line item)
  - Credit: Tax Payable (if applicable)

- **Purchase Invoices**: Automatically creates journal entries with:
  - Debit: Inventory/Expense (per line item)
  - Debit: Tax Receivable (if applicable)
  - Credit: Accounts Payable

### Inventory Management
- **Stock Tracking**: Real-time quantity tracking
- **Weighted Average Costing**: Automatic cost calculation
- **Stock Movements**: Complete audit trail
- **Stock Levels**: Current, reserved, and available quantities

## 🔧 Installation Steps

### 1. Run Database Setup
```sql
-- Execute this in your Supabase SQL editor
\i CREATE_INVENTORY_SYSTEM.sql
```

### 2. Required Chart of Accounts
Ensure these accounts exist in your Chart of Accounts:
- **Accounts Receivable** (Asset)
- **Accounts Payable** (Liability)
- **Sales Revenue** (Income)
- **Inventory** (Asset)
- **Tax Payable** (Liability)
- **Tax Receivable** (Asset)

### 3. Customer/Supplier Setup
Each customer and supplier must have their receivable/payable accounts configured:
- **Customers**: `receivable_account_id` must reference Accounts Receivable
- **Suppliers**: `payable_account_id` must reference Accounts Payable

### 4. Item Setup
Each item should have:
- **Income Account**: For sales revenue recognition
- **Expense Account**: For purchase cost recognition

## 📊 How It Works

### Sales Invoice Process
1. **Create Sales Invoice** with line items
2. **Change Status** to "SUBMITTED" or "PAID"
3. **Auto Journal Entry** is created:
   ```
   Dr. Accounts Receivable    $1,000
       Cr. Sales Revenue           $900
       Cr. Tax Payable             $100
   ```
4. **Stock Movement** is recorded for each inventory item (OUT)

### Purchase Invoice Process
1. **Create Purchase Invoice** with line items
2. **Change Status** to "RECEIVED" or "PAID"
3. **Auto Journal Entry** is created:
   ```
   Dr. Inventory             $900
   Dr. Tax Receivable        $100
       Cr. Accounts Payable        $1,000
   ```
4. **Stock Movement** is recorded for each inventory item (IN)

## 📈 Stock Valuation Methods

### Weighted Average Cost
- **Purchase**: Updates average cost based on new purchases
- **Sale**: Uses current average cost for COGS calculation
- **Automatic**: No manual intervention required

### Stock Movement Types
- **IN**: Purchase, Production, Adjustment (increase)
- **OUT**: Sale, Consumption, Adjustment (decrease)
- **TRANSFER**: Between warehouses (future feature)

## 🔍 Monitoring & Reports

### Stock Levels
```sql
SELECT * FROM get_stock_levels('company-id-here');
```

### Stock Movement History
```sql
SELECT * FROM stock_movement_history 
WHERE company_id = 'company-id-here'
ORDER BY movement_date DESC;
```

### Auto-Generated Journal Entries
```sql
SELECT * FROM journal_entries 
WHERE reference LIKE 'Sales Invoice:%' 
OR reference LIKE 'Purchase Invoice:%';
```

## ⚙️ Configuration

### Auto Journal Config (Optional)
For advanced account mapping customization:
```sql
INSERT INTO auto_journal_config (company_id, transaction_type, account_mapping)
VALUES (
    'your-company-id',
    'SALES_INVOICE',
    '{
        "receivable_account": "account-id-here",
        "sales_account": "account-id-here",
        "tax_payable_account": "account-id-here"
    }'
);
```

## 🚨 Important Notes

1. **Status Triggers**: Journal entries are only created when invoice status changes to:
   - Sales: "SUBMITTED" or "PAID"
   - Purchase: "RECEIVED" or "PAID"

2. **Duplicate Prevention**: System prevents duplicate journal entries for the same invoice

3. **Stock Items**: Items must exist in the `items` table and be linked in invoice line items

4. **Account Requirements**: All required accounts must exist before processing invoices

## 🔧 Troubleshooting

### No Journal Entry Created
- Check invoice status (must be SUBMITTED/RECEIVED or PAID)
- Verify customer/supplier has receivable/payable accounts configured
- Ensure required accounts exist in Chart of Accounts

### Stock Not Updated
- Verify `item_id` is correctly linked in invoice line items
- Check if item exists in `items` table
- Review stock movement logs for errors

### Incorrect Costs
- Verify unit costs in purchase invoices
- Check weighted average calculation in `stock_items` table
- Review stock movement history for cost accuracy

## 📋 Next Steps

1. **Test with Sample Data**: Create test invoices to verify functionality
2. **Configure Accounts**: Set up proper Chart of Accounts structure
3. **Train Users**: Educate team on new automated processes
4. **Monitor Reports**: Regularly review auto-generated entries and stock levels

## 🎉 Benefits

- ✅ **Automated Accounting**: No manual journal entry creation
- ✅ **Real-time Inventory**: Instant stock level updates
- ✅ **Accurate Costing**: Weighted average cost calculation
- ✅ **Complete Audit Trail**: Full transaction history
- ✅ **Error Reduction**: Eliminates manual data entry errors
- ✅ **Time Savings**: Streamlined accounting processes
