# Repository Guidelines

## Project Structure & Module Organization

This repository is an npm workspace for Travel Watch.

- `apps/web/`: Next.js frontend. Routes and styles live in `src/app/`, UI components in `src/components/`, and types/demo data in `src/lib/`.
- `apps/api/`: NestJS REST API. Keep controllers thin, business logic in services, queue orchestration in `collection-queue.service.ts`, and tests beside source files.
- `prisma/`: PostgreSQL schema and PostGIS setup SQL.
- `.env.example`: documented configuration contract. Never commit a populated `.env`.

Do not edit or commit `node_modules/`, `.next/`, `dist/`, or generated Prisma client files.

## Build, Test, and Development Commands

Run commands from the repository root:

```bash
npm install                 # install all workspace dependencies
npm run dev                 # run API on :4000 and web app on :3000
npm run build               # create production builds for both apps
npm run lint                # run strict TypeScript checks
npm test                    # run API Jest tests
npm run prisma:generate     # regenerate the Prisma client
docker compose up -d        # start PostgreSQL/PostGIS and Redis
```

Copy `.env.example` to `.env` to enable database, Redis, or Mapbox integrations. Otherwise, the application uses demo data.

## Coding Style & Naming Conventions

Use strict TypeScript, two-space indentation, single quotes, and semicolons. Use `PascalCase` for React components and exported types, `camelCase` for functions and variables, and kebab-case for infrastructure filenames. NestJS classes need descriptive suffixes such as `TravelController` and `TravelService`. Keep components small and service returns typed. Update frontend and backend types together when API shapes change.

## Testing Guidelines

The API uses Jest with `ts-jest`. Name tests `*.spec.ts` and colocate them with the implementation. Cover successful responses, validation failures, radius filtering, and queue fallback behavior. Run `npm test`, `npm run lint`, and `npm run build` before opening a pull request. No numeric coverage threshold is enforced; add a regression test for every bug fix.

## Commit & Pull Request Guidelines

History contains only `Initial commit`, so no established convention exists. Use short, imperative subjects, optionally scoped: `api: validate dashboard radius`. Pull requests should explain user-visible changes, list verification commands, link issues, and include screenshots for UI changes. Call out migrations, new environment variables, provider assumptions, and security implications.

## Security & Data Providers

Use official or licensed data providers. Never commit credentials, violate provider terms, or present the derived demand index as an airline’s actual booking rate. Validate external payloads before persistence and keep Redis/PostgreSQL off public networks.
