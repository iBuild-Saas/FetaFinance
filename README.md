# Close Statement Hub

Sales, accounting, inventory, and control-center app built with Vite, React, TypeScript, Tailwind, and a lightweight MySQL API.

## Project layout

- `src/`: frontend application
- `server/`: Node API that serves the MySQL-backed resources used by the app
- `migrations/`: ordered schema migrations applied with the local migration runner
- `scripts/`: development, migration, and seed utilities
- `seeds/topdrinks/`: reusable demo dataset for showcasing the app

## Local development

```sh
npm install
npm run migrate
npm run dev
```

The dev script starts both the MySQL API server and the Vite frontend.

## Useful commands

```sh
npm run dev
npm run server
npm run migrate
npm run migrate:status
npm run seed:topdrinks
npm run build
```

## Notes

- Migration details live in `MIGRATIONS.md`.
- The broader schema and frontend alignment notes live in `development.md`.
- The TopDrinks demo seed is documented in `seeds/topdrinks/README.md`.
