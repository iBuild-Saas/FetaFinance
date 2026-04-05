# TopDrinks Demo Seed

This seed pack creates a reusable demo company for testing and showcasing the app with a beverage distribution workflow.

Scenario:
- Company: TopDrinks Distribution
- Brand: RealMix energy drink
- Business model: import into warehouse stock, distribute to supermarket customers, collect payments, monitor receivables, pay supplier balances, and review dashboard/control metrics

What gets created:
- A full TopDrinks company profile
- Warehouses, accounts, mappings, payment methods, fiscal periods, and notification rules
- One supplier and four supermarket customers with contacts and addresses
- Three RealMix case SKUs with supplier pricing
- Purchase invoices, sales invoices, payments, stock positions, stock movements, one warehouse transfer, journal entries, audit events, and close-run history

Why this dataset is useful:
- Dashboard shows real KPIs, sales trend, open documents, overdue balances, and a low-stock warning
- Accounts receivable and accounts payable views have both current and overdue balances
- Inventory shows valuation, movements, and a reorder signal
- Audit and control screens have believable activity instead of empty states

How to apply it:

```bash
npm run seed:topdrinks
```

Dry-run file check:

```bash
node scripts/seed-topdrinks.mjs --dry-run
```

Notes:
- The seed is idempotent for the TopDrinks records because it uses fixed IDs and upserts.
- It is designed to live in the repo as a permanent demo scenario you can reuse in future presentations.
