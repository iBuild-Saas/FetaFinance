# Database Migrations

This project now uses a small MySQL migration runner so every collaborator can apply the same schema changes locally.

## Commands

```bash
npm run migrate
npm run migrate:status
```

## What it does

- Creates a `schema_migrations` table if it does not already exist
- Runs every pending migration from the [`migrations`](/C:/Users/GM/Desktop/Sales/close-statement-hub/migrations) folder in filename order
- Records each applied migration so it only runs once

## Current migration set

- `001_core_app_schema.mjs`
  Extends the existing core tables and adds the missing app tables/views for invoices, inventory, payments, account mappings, categories, units of measure, and AR/AP reporting.
- `002_super_app_foundation.mjs`
  Adds foundational ERP tables for warehouses, contacts, addresses, orders, transfers, supplier pricing, and inventory counts.
- `003_control_center.mjs`
  Adds control-plane tables and views for audit events, fiscal periods, close runs, notification rules/events, document sequences, and company control reporting.
