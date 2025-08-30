# Dynamic Account Mapping System Setup Guide

## Overview
This system allows you to dynamically configure which accounts from your Chart of Accounts are used for automatic journal entries. No more hard-coded accounts - you choose exactly which accounts to use for each transaction type.

## 🎯 Key Features

### ✨ Complete Flexibility
- **Choose Your Accounts**: Select any account from your Chart of Accounts
- **Per-Company Configuration**: Different companies can use different account mappings
- **Transaction-Specific**: Separate mappings for sales invoices and purchase invoices
- **Item-Level Overrides**: Individual items can specify their own income/expense accounts

### 🔧 Smart Account Filtering
- **Type-Based Filtering**: Only shows relevant account types for each mapping
- **Validation**: Ensures you select appropriate accounts for each purpose
- **Visual Indicators**: Clear status indicators show which mappings are complete

## 📋 Setup Instructions

### 1. Database Setup
```sql
-- Execute this in your Supabase SQL editor
\i CREATE_DYNAMIC_ACCOUNT_MAPPING.sql
```

This script will:
- Create the `account_mapping_config` table
- Add account reference columns to customers, suppliers, and items tables
- Create dynamic journal entry functions
- Update triggers to use the new dynamic system

### 2. Configure Account Mappings

#### Navigate to Account Mappings
1. Go to **Setup → Account Mappings** in the sidebar
2. Select your company from the navbar
3. Configure mappings for each transaction type

#### Sales Invoice Mappings
Configure these required mappings:

| Mapping | Purpose | Account Type | Example |
|---------|---------|--------------|---------|
| **Accounts Receivable** | Debit when customer owes money | Asset | 1200 - Accounts Receivable |
| **Default Sales Revenue** | Credit for sales revenue | Income/Revenue | 4000 - Sales Revenue |
| **Tax Payable** | Credit for sales tax collected | Liability | 2300 - Sales Tax Payable |

#### Purchase Invoice Mappings
Configure these required mappings:

| Mapping | Purpose | Account Type | Example |
|---------|---------|--------------|---------|
| **Accounts Payable** | Credit when owing suppliers | Liability | 2100 - Accounts Payable |
| **Default Inventory/Expense** | Debit for purchases | Asset/Expense | 1300 - Inventory |
| **Tax Receivable** | Debit for purchase tax paid | Asset | 1250 - Tax Receivable |

### 3. Configure Master Data (Optional but Recommended)

#### Customer-Specific Accounts
- Each customer can have a specific **Receivable Account**
- If not set, uses the default from account mappings
- Useful for tracking different customer segments

#### Supplier-Specific Accounts
- Each supplier can have a specific **Payable Account**
- If not set, uses the default from account mappings
- Useful for different supplier categories

#### Item-Specific Accounts
- Each item can have specific **Income Account** and **Expense Account**
- If not set, uses defaults from account mappings
- Essential for proper revenue/cost tracking by product line

## 🔄 How It Works

### Sales Invoice Process
1. **Create Sales Invoice** → Add line items → Save
2. **Status = "SUBMITTED/PAID"** → **Triggers Dynamic Journal Entry**:
   ```
   Dr. [Configured Receivable Account]     $1,000
       Cr. [Item Income Account or Default]     $900  
       Cr. [Configured Tax Payable Account]     $100
   ```

### Purchase Invoice Process  
1. **Create Purchase Invoice** → Add line items → Save
2. **Status = "RECEIVED/PAID"** → **Triggers Dynamic Journal Entry**:
   ```
   Dr. [Item Expense Account or Default]   $900
   Dr. [Configured Tax Receivable Account] $100
       Cr. [Configured Payable Account]         $1,000
   ```

## 📊 Account Selection Priority

### Sales Invoices
1. **Receivable Account**: Customer-specific → Company default mapping
2. **Revenue Account**: Item-specific income account → Company default sales account
3. **Tax Payable**: Company mapping (required)

### Purchase Invoices
1. **Payable Account**: Supplier-specific → Company default mapping
2. **Inventory/Expense**: Item-specific expense account → Company default inventory account
3. **Tax Receivable**: Company mapping (required)

## ⚙️ Configuration Examples

### Example 1: Basic Setup
```sql
-- Set up basic account mappings for a company
SELECT set_account_mapping(
    'company-uuid', 
    'SALES_INVOICE', 
    'receivable_account', 
    'receivable-account-uuid',
    'Default receivable account for all sales'
);
```

### Example 2: Multi-Department Setup
- **Department A**: Uses account 4100 - Department A Revenue
- **Department B**: Uses account 4200 - Department B Revenue
- Configure items in each department with specific income accounts

### Example 3: Multi-Location Setup
- **Location 1**: Uses account 2110 - AP - Location 1
- **Location 2**: Uses account 2120 - AP - Location 2
- Configure suppliers with location-specific payable accounts

## 🚨 Important Notes

### Required Mappings
- **Sales Invoices**: Must have receivable account configured
- **Purchase Invoices**: Must have payable account configured
- **Tax Accounts**: Optional but recommended for tax tracking

### Error Handling
- If required accounts are missing, journal entry creation will fail with a clear error message
- Invoice creation still succeeds - only the automatic journal entry is affected
- Error messages guide you to configure the missing mappings

### Migration from Hard-Coded System
- Old hard-coded triggers are automatically replaced
- Existing journal entries are not affected
- New invoices will use the dynamic system immediately

## 🎉 Benefits

### ✅ Flexibility
- **Adapt to Any Chart of Accounts**: Works with your existing account structure
- **Company-Specific**: Each company can have different mappings
- **Easy Changes**: Update mappings anytime without code changes

### ✅ Control
- **Granular Control**: Item-level and customer/supplier-level overrides
- **Visual Feedback**: Clear indication of which mappings are configured
- **Validation**: Prevents incorrect account selections

### ✅ Scalability
- **Multi-Company**: Supports multiple companies with different structures
- **Multi-Department**: Different items can post to different revenue/expense accounts
- **Future-Proof**: Easy to add new mapping types as business grows

## 🔧 Troubleshooting

### No Journal Entries Created
1. Check that account mappings are configured for the transaction type
2. Verify invoice status is SUBMITTED/RECEIVED or PAID
3. Check error logs for specific missing mappings

### Wrong Accounts Used
1. Check item-specific account configurations
2. Verify customer/supplier-specific account settings
3. Review company-level default mappings

### Configuration Not Saving
1. Ensure all required fields are selected
2. Check that accounts exist and are active
3. Verify user has permissions to modify account mappings

## 📈 Next Steps

1. **Complete Setup**: Run the database script and configure mappings
2. **Test with Sample Data**: Create test invoices to verify correct journal entries
3. **Configure Master Data**: Set up item/customer/supplier specific accounts
4. **Train Users**: Educate team on the new flexible system
5. **Monitor Results**: Review auto-generated journal entries for accuracy

The dynamic account mapping system gives you complete control over your automatic journal entries while maintaining the convenience of automation! 🚀
