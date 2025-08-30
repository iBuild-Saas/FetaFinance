# Chart of Accounts Setup Guide

This guide explains how to set up the Chart of Accounts system in your database and integrate it with the application.

## Database Setup

### 1. Run the SQL Script

Execute the `CREATE_CHART_OF_ACCOUNTS.sql` script in your Supabase SQL editor:

```sql
-- This will create the table and default accounts
-- Run the entire script in your Supabase SQL editor
```

### 2. What Gets Created

The script creates:

- **`chart_of_accounts` table** with proper structure
- **Default root accounts** for each company:
  - Assets (1000)
  - Liabilities (2000) 
  - Equity (3000)
  - Revenue (4000)
  - Expenses (5000)
- **Common sub-accounts** with proper hierarchy
- **Database function** `create_default_chart_of_accounts(company_uuid)` to automatically create accounts for new companies

### 3. Table Structure

```sql
chart_of_accounts (
  id UUID PRIMARY KEY,
  account_code VARCHAR(20) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) NOT NULL,
  parent_account_id UUID REFERENCES chart_of_accounts(id),
  company_id UUID REFERENCES companies(id) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  normal_balance VARCHAR(10) NOT NULL CHECK (normal_balance IN ('DEBIT', 'CREDIT')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

## Application Integration

### 1. Automatic Account Creation

When a company is selected in the application:
- The system automatically checks if Chart of Accounts exists
- If not, it calls `create_default_chart_of_accounts()` function
- Creates the standard 5 root accounts plus common sub-accounts
- All accounts are properly linked to the company

### 2. Account Hierarchy

The system automatically builds a tree structure:
- **Root Level**: Assets, Liabilities, Equity, Revenue, Expenses
- **Second Level**: Current Assets, Fixed Assets, Current Liabilities, etc.
- **Third Level**: Cash, Accounts Receivable, Inventory, etc.

### 3. Features

- **Add/Edit/Delete** accounts
- **Hierarchical view** with expand/collapse
- **Account types** with proper normal balances
- **Company isolation** - each company has its own chart
- **Soft delete** - accounts are marked inactive rather than deleted

## Default Account Structure

```
1000 - Assets (DEBIT)
├── 1100 - Current Assets (DEBIT)
│   ├── 1110 - Cash and Cash Equivalents (DEBIT)
│   ├── 1120 - Accounts Receivable (DEBIT)
│   └── 1130 - Inventory (DEBIT)
└── 1200 - Fixed Assets (DEBIT)

2000 - Liabilities (CREDIT)
├── 2100 - Current Liabilities (CREDIT)
│   └── 2110 - Accounts Payable (CREDIT)
└── 2200 - Long-term Liabilities (CREDIT)

3000 - Equity (CREDIT)
├── 3100 - Owner Equity (CREDIT)
└── 3200 - Retained Earnings (CREDIT)

4000 - Revenue (CREDIT)
└── 4100 - Sales Revenue (CREDIT)

5000 - Expenses (DEBIT)
├── 5100 - Cost of Goods Sold (DEBIT)
└── 5200 - Operating Expenses (DEBIT)
    ├── 5210 - Salaries and Wages (DEBIT)
    ├── 5220 - Rent Expense (DEBIT)
    └── 5230 - Utilities (DEBIT)
```

## Usage

1. **Navigate** to Chart of Accounts in the sidebar
2. **View** the hierarchical structure
3. **Add** new accounts or sub-accounts
4. **Edit** existing accounts
5. **Delete** accounts (soft delete)
6. **Expand/Collapse** account groups

## Database Permissions

The script grants necessary permissions to authenticated users:
- `EXECUTE` on the `create_default_chart_of_accounts` function
- `ALL` on the `chart_of_accounts` table

## Troubleshooting

### Common Issues

1. **Accounts not showing**: Check if the company is selected and accounts were created
2. **Permission errors**: Ensure the SQL script was run completely
3. **Type errors**: Verify the database types in `src/lib/supabase.ts` match the actual table structure

### Verification

To verify the setup worked:

```sql
-- Check if table exists
SELECT * FROM chart_of_accounts LIMIT 1;

-- Check if function exists
SELECT * FROM pg_proc WHERE proname = 'create_default_chart_of_accounts';

-- Check accounts for a specific company
SELECT * FROM chart_of_accounts WHERE company_id = 'your-company-uuid' ORDER BY account_code;
```

## Next Steps

After setting up Chart of Accounts:

1. **Journal Entries** can now reference these accounts
2. **Financial Reports** can be generated using the account structure
3. **Trial Balance** can be calculated
4. **General Ledger** entries can be posted

The system is now ready for full double-entry bookkeeping!
