# Frontend

This folder contains the Feta Finance frontend built with React, Vite, and TypeScript.

## Stack

- React 18
- Vite 5
- TypeScript
- Tailwind CSS
- TanStack Query
- Radix UI primitives

## Local development

```powershell
cd frontend
npm install
npm run dev
```

Default URL:

- `http://127.0.0.1:5173`

## API integration

- Frontend API requests use relative `/api/...` paths.
- Vite proxies `/api` to `http://127.0.0.1:8000` in local development.
- RPC-style calls are sent to `POST /api/rpc/{name}` first, with local fallback helpers still available in the client layer.

## Available scripts

```powershell
npm run dev
npm run build
npm run build:dev
npm run lint
npm run preview
```

## Production build

```powershell
cd frontend
npm run build
```

The compiled assets are generated in `frontend/dist`.
