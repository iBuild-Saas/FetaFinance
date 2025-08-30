# Sales Invoice Journal Entry System

This document explains how the sales invoice journal entry system works and how it mirrors the purchase invoice journal entry logic.

## Overview

The sales invoice journal entry system automatically creates accounting journal entries when a sales invoice status is changed to `SUBMITTED`. This follows the same pattern as the purchase invoice system, ensuring consistency in your accounting processes.

## How It Works

### 1. Trigger Mechanism
- **Trigger**: `trigger_sales_invoice_journal`
- **Fires**: When a sales invoice status is updated to `SUBMITTED`
- **Function**: `create_sales_invoice_journal_entry()`

### 2. Journal Entry Structure
When a sales invoice is submitted, the system creates a journal entry with the following structure:

```
DEBIT:  Accounts Receivable (Total Amount)
CREDIT: Sales Revenue (Subtotal)
CREDIT: Sales Tax Payable (Tax Amount, if applicable)
```

### 3. Account Resolution
The system resolves accounts in this order:
1. **Company Default Accounts** (if configured)
2. **Account Mappings** (fallback system)

## Setup Instructions

### Step 1: Run the Setup Script
Execute the `SALES_INVOICE_JOURNAL_ENTRY_SETUP.sql` script in your Supabase SQL Editor:

```sql
-- This will:
-- 1. Add required fields to companies table
-- 2. Create/update journal entry functions
-- 3. Create triggers
-- 4. Set up default account mappings
```

### Step 2: Verify Setup
Run the `TEST_SALES_INVOICE_JOURNAL.sql` script to verify everything is working:

```sql
-- This will:
-- 1. Check if functions and triggers exist
-- 2. Verify account mappings
-- 3. Test the journal entry creation
-- 4. Show results
```

## Account Configuration

### Company Default Accounts
The system adds these fields to the `companies` table:
- `default_sales_revenue_account_id` - Default sales revenue account
- `accounts_receivable_account_id` - Default accounts receivable account
- `sales_tax_payable_account_id` - Default sales tax payable account
- `default_inventory_account_id` - Default inventory/expense account (for purchase invoices)
- `accounts_payable_account_id` - Default accounts payable account (for purchase invoices)

### Account Mappings
If company defaults aren't set, the system uses account mappings:

```sql
-- Sales Invoice Mappings
SALES_INVOICE.sales_account          -> Sales Revenue
SALES_INVOICE.receivable_account    -> Accounts Receivable
SALES_INVOICE.tax_payable_account   -> Sales Tax Payable

-- Purchase Invoice Mappings
PURCHASE_INVOICE.inventory_account  -> Inventory/Expense
PURCHASE_INVOICE.payable_account    -> Accounts Payable
```

## Usage

### Creating a Sales Invoice
1. Create a sales invoice with status `DRAFT`
2. Fill in invoice details (customer, items, amounts, etc.)
3. Update status to `SUBMITTED`
4. The system automatically creates the journal entry

### Example
```sql
-- Create invoice
INSERT INTO sales_invoices (
    invoice_number, customer_id, company_id, invoice_date, due_date,
    status, subtotal, tax_amount, total_amount, notes
) VALUES (
    'SI-001', 'customer-uuid', 'company-uuid', CURRENT_DATE, 
    CURRENT_DATE + INTERVAL '30 days', 'DRAFT', 1000.00, 100.00, 1100.00,
    'Test invoice'
);

-- Submit invoice (triggers journal entry)
UPDATE sales_invoices 
SET status = 'SUBMITTED' 
WHERE invoice_number = 'SI-001';
```

## Journal Entry Details

### Entry Number Format
- **Sales Invoice**: `SI-{invoice_number}`
- **Purchase Invoice**: `PI-{invoice_number}`

### Reference Format
- **Sales Invoice**: `sales_invoice:{invoice_id}`
- **Purchase Invoice**: `purchase_invoice:{invoice_id}`

### Status
All automatically created journal entries have status `POSTED`

## Troubleshooting

### Common Issues

#### 1. "No sales revenue account configured"
**Solution**: Set up account mappings or company defaults
```sql
-- Check current mappings
SELECT * FROM account_mappings WHERE mapping_type = 'SALES_INVOICE';

-- Add mapping manually
INSERT INTO account_mappings (company_id, mapping_type, mapping_name, account_id, description)
VALUES ('company-uuid', 'SALES_INVOICE', 'sales_account', 'account-uuid', 'Sales Revenue');
```

#### 2. "No accounts receivable account configured"
**Solution**: Set up accounts receivable mapping
```sql
INSERT INTO account_mappings (company_id, mapping_type, mapping_name, account_id, description)
VALUES ('company-uuid', 'SALES_INVOICE', 'receivable_account', 'account-uuid', 'Accounts Receivable');
```

#### 3. Journal entry not created
**Check**:
- Invoice status is `SUBMITTED` (not `DRAFT`)
- Invoice has positive total amount
- Required accounts are configured
- Trigger exists and is enabled

### Verification Queries

```sql
-- Check if functions exist
SELECT proname FROM pg_proc 
WHERE proname IN ('create_sales_invoice_journal_entry', 'create_purchase_invoice_journal_entry');

-- Check if triggers exist
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE '%invoice_journal%';

-- Check account mappings
SELECT am.*, ca.account_name 
FROM account_mappings am
JOIN chart_of_accounts ca ON am.account_id = ca.id
WHERE am.mapping_type = 'SALES_INVOICE';
```

## Testing

### Manual Test
1. Create a test sales invoice
2. Update status to `SUBMITTED`
3. Check if journal entry was created
4. Verify journal entry lines

### Automated Test
Run the test script:
```sql
-- This creates test invoices and verifies journal entries
\i TEST_SALES_INVOICE_JOURNAL.sql
```

## Integration with Frontend

The system works automatically with your existing frontend:
- No changes needed to invoice creation forms
- Journal entries are created when status changes to `SUBMITTED`
- Can be triggered from UI or API calls

## Security

- Functions run with `authenticated` role permissions
- Triggers only fire on `UPDATE` operations
- Journal entries are read-only after creation
- All operations are logged in database

## Performance Considerations

- Triggers only fire when status changes to `SUBMITTED`
- Account lookups are optimized with indexes
- Journal entries are created in a single transaction
- No impact on invoice creation performance

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Run the verification queries
3. Check Supabase logs for error messages
4. Verify account mappings are correct

## Related Systems

- **Purchase Invoice Journal Entry**: Similar logic for purchase invoices
- **Account Mappings**: Flexible account configuration system
- **Chart of Accounts**: Account structure and hierarchy
- **General Ledger**: Journal entry reporting and analysis
