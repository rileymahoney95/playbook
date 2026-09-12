# playbook

A private app for running personal routines as reusable checklists. The first
routine is an editable **Morning mobility** starter. Replace its sample steps
with your own in **Edit routine**.

**App:** https://playbook-production-8801.up.railway.app

## MVP

- One owner, password login, and persistent sessions (30 days).
- Create and edit routines with any category; add, reorder, and remove steps.
- Optional instructions, rep/quantity labels, reference links, and step timers.
- Start/resume a run, save each check to Postgres, and continue on another device.
- Finish after checking all steps; view completed and discarded runs in history.
- Editing a template leaves existing runs and history intact.
- Change the password in Settings. Other sessions are revoked immediately.

The interface follows the Biosphere design system described in [DESIGN.md](DESIGN.md). The app requires connectivity to save;
failed requests are shown and reconciled with the server. Active runs refresh
every five seconds and when a tab regains focus. Timers persist their start time
and remaining duration, including across reloads; they do not provide background
notifications or automatically check a step.

## Stack

Bun + TypeScript, Effect, Drizzle ORM, PostgreSQL, React, React Router, Vite,
and Tailwind CSS. One Bun service serves both the API and the compiled frontend;
one Railway Postgres service holds all durable data. No external auth provider,
email service, or storage provider is required.

See [architecture](docs/architecture.md) for the data model, API, and extension
points, and [product scope](docs/product.md) for the agreed acceptance criteria.

## Local development

Install Bun 1.3.12 and Docker (or use an existing PostgreSQL 14+ server):

```sh
bun install --frozen-lockfile
docker compose up -d
cp .env.example .env
```

Set a unique `BOOTSTRAP_PASSWORD` of at least 12 characters in `.env`. Its only
purpose is to create the first owner on an empty database. On later startups,
the existing password and routines are preserved.

Run these in separate terminals:

```sh
bun run dev
bun run dev:client
```

Open http://localhost:5173. Vite proxies the API to Bun on port 3000. To use the
production frontend locally, run `bun run build` and open http://localhost:3000.

## Checks

```sh
bun run typecheck
bun run build
docker compose exec postgres createdb -U postgres playbook_test
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/playbook_test bun test tests/api.test.ts
```

The integration suite requires a **disposable database whose name ends in
`_test`**. It truncates its data. The suite exercises the real PostgreSQL schema,
transactions, API validation, sessions, snapshot preservation, timers, history,
concurrent starts, stale writes, and password changes. GitHub Actions runs it on
each push to `main` and each pull request.

With the local application running and its password in `.env`:

```sh
bunx playwright install chromium
bun run test:e2e
```

Browser tests run the complete flow on desktop and mobile Chromium, including a
separate authenticated browser context. They create and archive clearly named
test routines. `E2E_BASE_URL` and `E2E_PASSWORD` can target a different running
instance; use a disposable instance for routine test runs. Failure artifacts may
contain credentials and personal data and are excluded from Git.

## Railway deployment

Project: `2eee94db-1dbe-4cc7-baa5-f576c177dfc6`, environment: `production`.

- **playbook:** GitHub-connected application service, tracking `main`.
- **Postgres:** Railway PostgreSQL with a persistent Railway volume.
- Docker build and `/health` deployment health check are in `railway.json`.
- Startup applies committed migrations under a database lock and seeds only an
  empty database, before accepting requests. The build never needs database access.
- `DATABASE_URL=${{Postgres.DATABASE_URL}}` uses Railway private networking.
- `NODE_ENV=production`, `PORT=3000`, and
  `APP_ORIGIN=https://playbook-production-8801.up.railway.app` configure the app.
- `BOOTSTRAP_PASSWORD` is needed only on the first startup of an empty database;
  remove it once the owner has been created. Secrets must never be committed.

Push to `main` to deploy. Verify Railway's deployment status and `/health` after
each release. Adding a category requires no migration. For schema changes, edit
`server/schema.ts`, run `bun run db:generate`, inspect and commit the migration,
and keep it compatible with the previous release during Railway's deployment
overlap. Avoid destructive migrations without a verified database backup.

Changing the Railway URL requires updating `APP_ORIGIN` too. Production cookies
are HTTPS-only, HttpOnly, and SameSite=Strict. Authenticated writes require the
same origin and a custom header; no cross-origin API access is enabled.

## Password recovery

The generated first-use password is handed to the owner separately, outside Git.
Use **Settings → Change password** for normal changes. If locked out, an operator
with Railway access can run the included reset command inside the application
service, which asks for a new password and revokes existing sessions:

```sh
railway ssh --service playbook
bun server/reset-password.ts
```

Do not place the password in a shell argument or commit it to this repository.
