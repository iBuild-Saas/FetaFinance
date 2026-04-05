# Close Statement Hub

This repo is now split into two application folders:

- `frontend/`: React + Vite + TypeScript UI
- `backend/`: Laravel PHP API backed by MySQL

## Local development

Frontend:

```sh
cd frontend
npm install
npm run dev
```

Backend:

```sh
cd backend
composer install
php artisan key:generate
php artisan migrate
php artisan serve --host=127.0.0.1 --port=8000
```

The frontend Vite server runs on `http://127.0.0.1:5173` and proxies `/api` requests to the Laravel backend on `http://127.0.0.1:8000`.

## Repo notes

- Laravel migrations now live in `backend/database/migrations`.
- Historical Node API and migration assets are kept under `backend/legacy-node/` for reference during the migration.
- Existing high-level project notes remain at the repo root in `development.md` and `MIGRATIONS.md`.
