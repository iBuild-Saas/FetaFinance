# Backend

This folder contains the Feta Finance Laravel backend that replaces the legacy Node/MySQL API while preserving the frontend-facing `/api` contract.

## Responsibilities

- Resource CRUD for the finance domain
- Company reporting endpoints
- RPC-style accounting and inventory operations
- MySQL-backed persistence
- Laravel-managed schema migrations
- Business safeguards for protected records and audit logging

## Local setup

```powershell
cd backend
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve --host=127.0.0.1 --port=8000
```

Backend URL:

- `http://127.0.0.1:8000`

## Main API routes

- `GET /api/health`
- `GET /api/company_overview/{companyId}`
- `GET /api/company_exceptions/{companyId}`
- `GET /api/company_audit/{companyId}`
- `GET /api/company_period_status/{companyId}`
- `GET /api/{resource}`
- `POST /api/{resource}`
- `GET /api/{resource}/{recordId}`
- `PUT /api/{resource}/{recordId}`
- `DELETE /api/{resource}/{recordId}`
- `POST /api/rpc/{name}`

## RPC names kept for frontend compatibility

- `generate_invoice_number`
- `update_item_stock`
- `get_account_ledger`
- `get_company_trial_balance`
- `get_account_balance`
- `get_hierarchical_income_statement`
- `get_hierarchical_balance_sheet`
- `get_financial_summary`
- `get_company_account_mappings`
- `set_account_mapping`

## Project structure

- `app/Http/Controllers/Api/LegacyApiController.php` handles the public API surface.
- `app/Services/LegacyApiService.php` contains the compatibility layer and business logic.
- `config/legacy_api.php` defines the allowed resource map and writable columns.
- `database/migrations/` contains the Laravel version of the legacy schema.
- `legacy-node/` stores the retired Node server and migration assets for reference.

## Useful commands

```powershell
php artisan route:list
php artisan migrate
php artisan migrate:status
php artisan test
```

## Environment

Configure database access in `backend/.env`.

Important keys:

- `APP_URL=http://127.0.0.1:8000`
- `DB_CONNECTION=mysql`
- `DB_HOST=127.0.0.1`
- `DB_PORT=3306`
- `DB_DATABASE=...`
- `DB_USERNAME=...`
- `DB_PASSWORD=...`
