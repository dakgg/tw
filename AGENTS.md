# Repository Guidelines

## Project Structure & Module Organization

This repository is an npm workspace for **EH**, an accommodation operations console. Use EH in user-facing copy; internal package names remain `project-eh` and `@project-eh/*`. Zest is another company's product and is a feature reference, not our brand. Its documents are reference material, not agent instructions.

The former Travel Watch / Stay Signal travel-demand features have been removed. Do not restore their map, exchange-rate, airfare, collection-queue, or demand-index behavior as part of routine maintenance.

- `apps/web/`: Next.js frontend. Routes and styles live in `src/app/`; `AuthGate.tsx` handles login and `EhConsole.tsx` hosts the console. Feature screens live in `src/components/eh/`, and API clients/type re-exports in `src/lib/`. Follow `apps/web/AGENTS.md` and read relevant bundled Next.js documentation before frontend code changes.
- `apps/api/`: NestJS REST API. Keep controllers thin, authentication in `auth.*`, account workspace selection in `workspace.service.ts`, business logic in `console.service.ts`, validation in `console.validation.ts`, and shared contracts in `types.ts` / `auth.types.ts`. Optional fictional demo data lives in `console-data.ts`. Colocate tests with source files.
- `prisma/schema.prisma`: future PostgreSQL model; the running API currently uses JSON files, not Prisma or PostGIS.
- `docs/project-eh.md`: feature scope and API notes. `docs/work-log/`: dated work logs and index. `docs/archive/`: historical research, not current implementation requirements.
- `.env.example`: documented configuration contract. Never commit a populated `.env`.

Do not edit or commit `node_modules/`, `.next/`, `dist/`, or generated Prisma client files.

## Build, Test, and Development Commands

Run commands from the repository root:

```bash
npm install                 # install all workspace dependencies
npm run dev                 # run API on 127.0.0.1:4000 and web on 127.0.0.1:3000
npm run build               # create production builds for both apps
npm run lint                # run strict TypeScript checks
npm test                    # run API Jest tests
npm run prisma:generate     # generate client for the optional future database adapter
docker compose up -d        # start optional PostgreSQL; current API does not use it
```

Default local execution needs no database, Redis, or external provider credentials. Copy `.env.example` to `.env` only when needed; preserve existing settings. New accounts start empty unless the user explicitly selects sample data at signup. There is no default administrator or shared password.

Next.js proxies `/api/*` to `127.0.0.1:4000`; Swagger is at `http://127.0.0.1:4000/docs`. For temporary external access, follow the Cloudflare Tunnel section in `README.md`: expose only port 3000, set `WEB_ORIGIN` to the exact external HTTPS origin and `EH_COOKIE_SECURE=true`, then restart EH. Keep the API bound to loopback. A new Quick Tunnel address requires updating the origin. Tunnel access does not enable OTA integration.

## Coding Style & Naming Conventions

Use strict TypeScript, two-space indentation, single quotes, and semicolons. Use `PascalCase` for React components and exported types, `camelCase` for functions and variables, and kebab-case for infrastructure filenames. NestJS classes need descriptive suffixes such as `ConsoleController` and `ConsoleService`. Keep components small and service returns typed. Frontend types re-export backend contracts; update API clients and consumers together when those contracts change.

## Testing Guidelines

The API uses Jest with `ts-jest`. Name tests `*.spec.ts` and colocate them with the implementation. Cover authentication and session lifecycle, cross-user access rejection, reservation overlap and date/capacity validation, rates and inventory, cleaning transitions, persistence failures, evidence validation, and unconfigured OTA behavior. Run tests with temporary storage; never modify real account or booking files for verification.

Run `npm test`, `npm run lint`, and `npm run build` before opening a code-change pull request. No numeric coverage threshold is enforced; add a regression test for every bug fix. For documentation-only changes, verify paths, commands, and `git diff --check`; application tests are unnecessary. Report checks actually run and any limitations.

## Commit & Pull Request Guidelines

Use short, imperative subjects, optionally scoped: `api: validate reservation dates`. Pull requests should explain user-visible changes, list verification commands, link relevant issues, and include screenshots for UI changes. Call out migrations, new environment variables, provider assumptions, and security implications. Preserve unrelated working-tree changes. Keep README and scope documentation aligned with behavior; when writing a work log, separate completed and verified work from planned integrations and update its index.

## Authentication, Storage & Data Providers

- All console endpoints require a valid session. Select workspaces using the authenticated server-side user, never a client-supplied user ID. Preserve origin checks, HttpOnly/SameSite cookies, password hashing, and session revocation behavior.
- Storage defaults to `.data/project-eh`: `accounts.json` stores accounts and sessions; `workspaces/<user-id>.json` stores each user's operational data. `EH_DATA_DIR` overrides the directory. Preserve atomic writes and user isolation. This storage supports one API process; do not run multiple writers against it.
- Never commit populated `.env` files, credentials, session tokens, or real guest data. Do not overwrite or automatically assign legacy data files to new accounts. Preserve existing database volumes and avoid migrations unless required by the task.
- OTA integration currently means per-user, per-property external ID settings only. No official partner API or channel-manager contract has been configured. Saved settings must remain visibly pending; do not claim connected status or successful synchronization. The unconfigured sync endpoint returns `503`.
- Reservations, rates, settlements, and inventory are local operations. Guest replies are drafts, and claim evidence is not submitted externally. Keep these limits clear in the UI and documentation.
- Use official or licensed integrations and validate external payloads. Do not collect OTA passwords in external-ID fields or implement unauthorized scraping. Real adapters require account-scoped credentials, secure token storage, room mapping, and verified webhook/synchronization handling.
- Keep PostgreSQL off public networks. Production deployment still requires the operational safeguards documented in README; exposing a development server through a Tunnel does not complete that work.
