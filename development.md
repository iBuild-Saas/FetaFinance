# Development Notes

## What was built

This pass turned the database from a very small accounting starter schema into a broader operational foundation for a sales and inventory super app.

### 1. Real migration system

- Added [`scripts/migrate.mjs`](/C:/Users/GM/Desktop/Sales/close-statement-hub/scripts/migrate.mjs)
- Added `npm run migrate`
- Added `npm run migrate:status`
- Added `schema_migrations` tracking so collaborators can apply the same schema safely

### 2. Core app schema expansion

Added and/or extended the database so the existing app screens now have proper backing tables and columns for:

- Customers
- Suppliers
- Items
- Chart of accounts
- Journal entries
- Journal entry lines
- Item categories
- Units of measure
- Sales invoices
- Sales invoice line items
- Purchase invoices
- Purchase invoice line items
- Stock items
- Stock movements
- Payment methods
- Payments
- Account mapping configuration

### 3. Reporting and helper views

Added views for:

- `invoice_line_items`
- `payment_methods_view`
- `account_mapping_view`
- `customer_receivables`
- `customer_receivables_aging`
- `supplier_payables`
- `supplier_payables_aging`

These were added because several pages in the current frontend already query view-style resources instead of only base tables.

### 4. Super app foundation tables

Added broader operational tables to support future expansion beyond the current UI:

- Warehouses
- Customer contacts
- Supplier contacts
- Customer addresses
- Supplier addresses
- Sales orders
- Sales order line items
- Purchase orders
- Purchase order line items
- Stock transfers
- Stock transfer line items
- Item supplier prices
- Inventory counts
- Inventory count lines

### 5. Backend resource wiring

Updated the lightweight MySQL API layer in:

- [`server/server.mjs`](/C:/Users/GM/Desktop/Sales/close-statement-hub/server/server.mjs)
- [`src/lib/database-client.ts`](/C:/Users/GM/Desktop/Sales/close-statement-hub/src/lib/database-client.ts)

This was done so the new tables and views can be reached by the app using the same `from(...)` and `rpc(...)` patterns already used in the codebase.

### 6. Frontend alignment with the MySQL API

Updated the frontend screens that were still depending on old Supabase/PostgREST nested join behavior:

- [`src/pages/Invoices.tsx`](/C:/Users/GM/Desktop/Sales/close-statement-hub/src/pages/Invoices.tsx)
- [`src/pages/PurchaseInvoices.tsx`](/C:/Users/GM/Desktop/Sales/close-statement-hub/src/pages/PurchaseInvoices.tsx)
- [`src/pages/Inventory.tsx`](/C:/Users/GM/Desktop/Sales/close-statement-hub/src/pages/Inventory.tsx)
- [`src/pages/PaymentMethods.tsx`](/C:/Users/GM/Desktop/Sales/close-statement-hub/src/pages/PaymentMethods.tsx)
- [`src/pages/Payments.tsx`](/C:/Users/GM/Desktop/Sales/close-statement-hub/src/pages/Payments.tsx)

This pass removed frontend assumptions that related rows would come back as nested objects automatically. Instead, the pages now fetch flat resources from the MySQL API and compose related display data locally where needed.

## Migrations added

- [`001_core_app_schema.mjs`](/C:/Users/GM/Desktop/Sales/close-statement-hub/migrations/001_core_app_schema.mjs)
- [`002_super_app_foundation.mjs`](/C:/Users/GM/Desktop/Sales/close-statement-hub/migrations/002_super_app_foundation.mjs)

## Why it was designed this way

### Reasoning

The existing repo had many one-off SQL setup files, but the live MySQL database only contained a small subset of the tables the frontend already expects. Because of that, the goal was not just "add more tables", but:

- extend the current live schema without breaking existing data
- keep migrations idempotent and teammate-friendly
- match MySQL, not the older Postgres-style SQL files in the repo
- add the missing operational tables the current pages already reference
- also add foundational ERP tables so the app can grow into a true multi-module sales system

### Why JS migrations instead of loose SQL files

The live database already had partial tables and mismatched columns, so conditional logic was necessary:

- add columns only if missing
- add foreign keys only if missing
- create tables only if missing
- rebuild views safely

Using migration modules made that much safer and more maintainable than another pile of manual SQL scripts.

## Verification done

- Ran `npm run migrate`
- Ran `npm run migrate:status`
- Confirmed the new tables and views exist in MySQL
- Ran `npm run build` successfully
- Confirmed the invoice and inventory screens no longer rely on nested select syntax unsupported by the current MySQL client

## How collaborators should use it

After pulling your latest commit:

```bash
npm install
npm run migrate
```

To check whether they are up to date:

```bash
npm run migrate:status
```

## Important note

This work now covers both the schema/migration layer and the highest-impact frontend alignment gaps. There is still room for future cleanup, but the main screens that depended on nested Supabase-style query behavior have been adapted to the current MySQL API structure.
