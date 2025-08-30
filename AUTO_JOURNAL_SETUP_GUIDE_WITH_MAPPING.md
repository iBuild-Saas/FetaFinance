# Auto Journal Entry System with Account Mapping

This guide explains how to set up automatic journal entry creation for purchase and sales invoices using your existing account mapping system.

## Overview

The system automatically creates journal entries when invoices are saved with **SUBMITTED** status using accounts from the `account_mappings` table that are automatically assigned to companies.

### Journal Entry Logic

**Purchase Invoices:**
- **DEBIT**: Inventory/Expense Account (from mapping: `PURCHASE_INVOICE -> inventory_account` or `expense_account`)
- **CREDIT**: Accounts Payable Account (from mapping: `PURCHASE_INVOICE -> payable_account`)

**Sales Invoices:**
- **DEBIT**: Accounts Receivable Account (from mapping: `SALES_INVOICE -> receivable_account`)
- **CREDIT**: Sales Revenue Account (from mapping: `SALES_INVOICE -> sales_account`)
- **CREDIT**: Sales Tax Payable Account (from mapping: `SALES_INVOICE -> tax_payable_account`) - if tax exists

## Setup Steps

### 1. Create Auto Journal Functions and Triggers
Run this script to create the automatic journal entry system that uses account mappings:
```sql
-- File: AUTO_JOURNAL_WITH_ACCOUNT_MAPPING.sql
```

### 2. Check Current Account Mappings
Run this script to see existing mappings and what's needed:
```sql
-- File: CHECK_ACCOUNT_MAPPINGS_FOR_AUTO_JOURNAL.sql
```

### 3. Configure Required Account Mappings
Ensure each company has the required mappings in the `account_mappings` table:

```sql
-- Purchase Invoice Mappings (Required)
INSERT INTO account_mappings (company_id, mapping_type, mapping_name, account_id, description)
VALUES 
    ('your-company-id', 'PURCHASE_INVOICE', 'inventory_account', 'your-inventory-account-id', 'Default inventory account for purchase invoices'),
    ('your-company-id', 'PURCHASE_INVOICE', 'payable_account', 'your-payable-account-id', 'Default accounts payable account');

-- Sales Invoice Mappings (Required)
INSERT INTO account_mappings (company_id, mapping_type, mapping_name, account_id, description)
VALUES 
    ('your-company-id', 'SALES_INVOICE', 'sales_account', 'your-revenue-account-id', 'Default sales revenue account'),
    ('your-company-id', 'SALES_INVOICE', 'receivable_account', 'your-receivable-account-id', 'Default accounts receivable account'),
    ('your-company-id', 'SALES_INVOICE', 'tax_payable_account', 'your-tax-account-id', 'Default sales tax payable account');
```

## Required Account Mappings by Company

Each company must have these mappings configured in the `account_mappings` table:

### For Purchase Invoices:
- **`PURCHASE_INVOICE -> inventory_account`** OR **`PURCHASE_INVOICE -> expense_account`**
- **`PURCHASE_INVOICE -> payable_account`**

### For Sales Invoices:
- **`SALES_INVOICE -> sales_account`**
- **`SALES_INVOICE -> receivable_account`**
- **`SALES_INVOICE -> tax_payable_account`** (optional, only needed if you charge sales tax)

## Account Mapping Table Structure

The system uses the existing `account_mappings` table with this structure:
- `company_id` - Links to companies table
- `mapping_type` - 'PURCHASE_INVOICE' or 'SALES_INVOICE'
- `mapping_name` - Account purpose (e.g., 'inventory_account', 'sales_account')
- `account_id` - Links to chart_of_accounts table
- `is_active` - Must be true for the mapping to be used

## How It Works

1. **Create Invoice**: User creates purchase or sales invoice in the UI
2. **Set Status to SUBMITTED**: When invoice status is changed to "SUBMITTED"
3. **Lookup Accounts**: System queries `account_mappings` table for the company's default accounts
4. **Auto Journal Creation**: Database trigger automatically creates journal entry using mapped accounts
5. **Journal Entry Posted**: Journal entry is created with status "POSTED"

## Testing

1. Run `CHECK_ACCOUNT_MAPPINGS_FOR_AUTO_JOURNAL.sql` to verify mappings exist
2. Create a test purchase invoice and set status to "SUBMITTED"
3. Check `journal_entries` table for new entry with `reference_type = 'purchase_invoice'`
4. Check `journal_entry_lines` table for debit/credit lines
5. Repeat for sales invoice with `reference_type = 'sales_invoice'`

## Error Handling

The system will show clear error messages if:
- Required account mappings are not configured for a company
- Invoice amounts are zero or negative
- Account mappings are inactive (`is_active = false`)

## Advantages of Account Mapping Approach

- ✅ **Flexible**: Easy to change account assignments without altering company records
- ✅ **Scalable**: Can add new mapping types for other transaction types
- ✅ **Auditable**: Track when and how account assignments change
- ✅ **Multi-company**: Each company can have different account structures
- ✅ **Existing System**: Uses your current account mapping infrastructure

## Files Created

- `AUTO_JOURNAL_WITH_ACCOUNT_MAPPING.sql` - Creates functions and triggers using account mappings
- `CHECK_ACCOUNT_MAPPINGS_FOR_AUTO_JOURNAL.sql` - Verification and configuration helper
- `AUTO_JOURNAL_SETUP_GUIDE_WITH_MAPPING.md` - This guide

## Next Steps

1. Run `AUTO_JOURNAL_WITH_ACCOUNT_MAPPING.sql` to create the system
2. Run `CHECK_ACCOUNT_MAPPINGS_FOR_AUTO_JOURNAL.sql` to verify current mappings
3. Configure any missing account mappings for your companies
4. Test with sample invoices
5. Train users on the SUBMITTED status workflow
