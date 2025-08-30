# Auto Journal Entry System Setup Guide

This guide explains how to set up automatic journal entry creation for purchase and sales invoices using default accounts from the company master.

## Overview

The system automatically creates journal entries when invoices are saved with **SUBMITTED** status using predefined default accounts from the companies table.

### Journal Entry Logic

**Purchase Invoices:**
- **DEBIT**: Inventory/Expense Account (from `default_inventory_account_id` or `default_expense_account_id`)
- **CREDIT**: Accounts Payable Account (from `accounts_payable_account_id`)

**Sales Invoices:**
- **DEBIT**: Accounts Receivable Account (from `accounts_receivable_account_id`)
- **CREDIT**: Sales Revenue Account (from `default_sales_revenue_account_id`)
- **CREDIT**: Sales Tax Payable Account (from `sales_tax_payable_account_id`) - if tax exists

## Setup Steps

### 1. Update Companies Table Structure
Run this script to add default account fields to the companies table:
```sql
-- File: UPDATE_COMPANIES_WITH_DEFAULT_ACCOUNTS.sql
```

### 2. Create Auto Journal Functions and Triggers
Run this script to create the automatic journal entry system:
```sql
-- File: COMPLETE_AUTO_JOURNAL_ENTRY_SYSTEM.sql
```

### 3. Configure Default Accounts
Run this script to see available accounts and configure them:
```sql
-- File: SETUP_DEFAULT_ACCOUNTS_FOR_AUTO_JOURNAL.sql
```

### 4. Set Default Accounts for Each Company
Update each company with their default account IDs:

```sql
UPDATE companies 
SET 
    -- Purchase Invoice Accounts
    default_inventory_account_id = 'your-inventory-account-id',
    accounts_payable_account_id = 'your-payable-account-id',
    
    -- Sales Invoice Accounts  
    default_sales_revenue_account_id = 'your-revenue-account-id',
    accounts_receivable_account_id = 'your-receivable-account-id',
    sales_tax_payable_account_id = 'your-tax-payable-account-id'
    
WHERE id = 'your-company-id';
```

## Required Accounts by Company

Each company must have these accounts configured:

### For Purchase Invoices:
- **Inventory Account** (`default_inventory_account_id`) OR **Expense Account** (`default_expense_account_id`)
- **Accounts Payable Account** (`accounts_payable_account_id`)

### For Sales Invoices:
- **Sales Revenue Account** (`default_sales_revenue_account_id`)
- **Accounts Receivable Account** (`accounts_receivable_account_id`)
- **Sales Tax Payable Account** (`sales_tax_payable_account_id`) - optional, only needed if you charge sales tax

## How It Works

1. **Create Invoice**: User creates purchase or sales invoice in the UI
2. **Set Status to SUBMITTED**: When invoice status is changed to "SUBMITTED"
3. **Auto Journal Creation**: Database trigger automatically creates journal entry using company's default accounts
4. **Journal Entry Posted**: Journal entry is created with status "POSTED"

## Testing

1. Create a test purchase invoice and set status to "SUBMITTED"
2. Check `journal_entries` table for new entry with `reference_type = 'purchase_invoice'`
3. Check `journal_entry_lines` table for debit/credit lines
4. Repeat for sales invoice with `reference_type = 'sales_invoice'`

## Error Handling

The system will show clear error messages if:
- Default accounts are not configured for a company
- Invoice amounts are zero or negative
- Required accounts are missing

## Files Created

- `UPDATE_COMPANIES_WITH_DEFAULT_ACCOUNTS.sql` - Adds account fields to companies table
- `COMPLETE_AUTO_JOURNAL_ENTRY_SYSTEM.sql` - Creates functions and triggers
- `SETUP_DEFAULT_ACCOUNTS_FOR_AUTO_JOURNAL.sql` - Configuration helper
- `AUTO_JOURNAL_ENTRY_SETUP_GUIDE.md` - This guide

## Next Steps

1. Run the SQL scripts in order
2. Configure default accounts for each company
3. Test with sample invoices
4. Train users on the new SUBMITTED status workflow
