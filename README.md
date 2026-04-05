# Feta Finance

Feta Finance is a split-stack business finance application with a React frontend and a Laravel backend. The repository is organized so the UI and API can be developed, deployed, and scaled independently while keeping the existing `/api` contract stable for the frontend.

## Repository layout

```text
close-statement-hub/
|-- frontend/   React + Vite + TypeScript application
|-- backend/    Laravel API + MySQL schema + migrations
|-- development.md
|-- MIGRATIONS.md
```

## Architecture

- `frontend/` serves the user interface with React, Vite, TypeScript, Tailwind, and shadcn/ui-style components.
- `backend/` exposes CRUD, reporting, and RPC-style accounting endpoints through Laravel.
- Vite proxies `/api` requests to Laravel during local development, so the frontend can keep using relative API paths.
- MySQL is the system of record for operational, accounting, inventory, and control-center data.

## Local development

### 1. Backend

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

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend URL:

- `http://127.0.0.1:5173`

## Environment notes

- The frontend development server is pinned to `127.0.0.1:5173`.
- The Laravel API is expected at `127.0.0.1:8000`.
- Frontend proxying is configured in `frontend/vite.config.ts`.
- Backend database connection settings live in `backend/.env`.

## Backend API compatibility

The Laravel backend preserves the frontend-facing API structure from the legacy Node server:

- CRUD endpoints: `/api/{resource}` and `/api/{resource}/{id}`
- Reporting endpoints:
  - `/api/company_overview/{companyId}`
  - `/api/company_exceptions/{companyId}`
  - `/api/company_audit/{companyId}`
  - `/api/company_period_status/{companyId}`
- RPC endpoints:
  - `POST /api/rpc/generate_invoice_number`
  - `POST /api/rpc/update_item_stock`
  - `POST /api/rpc/get_account_ledger`
  - `POST /api/rpc/get_company_trial_balance`
  - `POST /api/rpc/get_account_balance`
  - `POST /api/rpc/get_hierarchical_income_statement`
  - `POST /api/rpc/get_hierarchical_balance_sheet`
  - `POST /api/rpc/get_financial_summary`
  - `POST /api/rpc/get_company_account_mappings`
  - `POST /api/rpc/set_account_mapping`

## Data and migrations

- Laravel migrations live in `backend/database/migrations`.
- The migrated schema covers the legacy accounting, inventory, operational, super-app, and control-center tables.
- Historical Node migration and server files are retained in `backend/legacy-node/` for reference only.

## Build commands

Frontend production build:

```powershell
cd frontend
npm run build
```

Backend route check:

```powershell
cd backend
php artisan route:list
```

## Deployment outline

- Deploy the frontend as a static Vite build from `frontend/dist`.
- Deploy the backend as a Laravel app backed by MySQL.
- Point the deployed frontend's API traffic to the Laravel backend domain or reverse proxy.
- Run `php artisan migrate --force` during backend deployment.

## Additional notes

- `development.md` contains broader implementation notes.
- `MIGRATIONS.md` contains migration-related project references.
- If you want GitHub README screenshots added, place the image files in the repo and they can be linked directly.
