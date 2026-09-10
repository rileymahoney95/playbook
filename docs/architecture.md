# Architecture

## Runtime and boundaries

One Bun HTTP process serves a React SPA and a same-origin JSON API. Vite and
Tailwind compile the client at build time; runtime assets have hashed filenames.
`server/app.ts` owns routing, request validation with Effect Schema, authentication,
and the HTTP error boundary. Effect generators compose validation, auth, and
domain operations through a typed `AppError` channel. `server/playbook.ts` owns
routine/run transactions. `server/auth.ts` owns password and session operations.
Drizzle supplies typed PostgreSQL queries and checked-in SQL migrations.

The server never trusts browser completion counts, owner identifiers, step order,
or elapsed timer calculations. Every resource query is scoped to the authenticated
owner. Unexpected server failures are sanitized before reaching the client.

## Tables

| Table            | Purpose                                                            |
| ---------------- | ------------------------------------------------------------------ |
| `owners`         | Singleton MVP owner and Argon2id password hash                     |
| `sessions`       | SHA-256 hashes of random 256-bit session tokens and expiry         |
| `login_attempts` | Persistent, atomic rate-limit counters in 10-minute windows        |
| `routines`       | Editable metadata, category, optimistic version, archival state    |
| `routine_steps`  | Ordered template steps, instructions, quantities, duration, URL    |
| `runs`           | One execution, snapshotted metadata/version, status and timestamps |
| `run_steps`      | Snapshotted steps, checks, timer state, optimistic version         |

Runs reference the originating template, but never read their instructions from
it. Editing a routine replaces its template steps in a transaction; existing run
steps remain unchanged. Archive hides a template and retains its history.

## Consistency

- A unique partial index permits only one active run per routine. Concurrent
  starts lock the template and return the same active run.
- Template edits lock the template and compare its version. A stale editor gets
  HTTP 409 and keeps its unsaved work until the owner chooses to reload.
- Step mutations lock their parent run and compare the step version. Completion
  takes the same lock and verifies all checks before committing. Repeating the
  same completion/discard request is idempotent.
- Run/template reads lock the parent in share mode while reading children, so a
  response cannot mix fields from before and after a concurrent write.
- Timers store remaining milliseconds at the last start/pause/reset and an
  optional server start timestamp. Clients derive the displayed countdown using
  server clock offset. The server recomputes remaining time on each mutation.
- Checks render only after a successful write. Ambiguous network failures trigger
  a server refresh, so a request that succeeded just before a disconnect can be
  reconciled. Poll results cannot overwrite a newer mutation response.
- Database migrations and initial owner seeding use PostgreSQL advisory locks
  to serialize overlapping deployments. Password changes and session replacement
  are atomic; restarting the app never resets the owner's data.

## API

All JSON writes send `Content-Type: application/json` and `X-Playbook-Request: 1`.
Except login, logout and health, endpoints require the session cookie.

| Method/path                         | Action                                               |
| ----------------------------------- | ---------------------------------------------------- |
| `GET /health`                       | Database-backed readiness                            |
| `GET /api/session`                  | Check authentication                                 |
| `POST /api/login`, `/api/logout`    | Sign in/out                                          |
| `POST /api/password`                | Verify current password, replace it, revoke sessions |
| `GET/POST /api/routines`            | List/create templates                                |
| `GET/PUT /api/routines/:id`         | Read/edit a template (version required on edit)      |
| `POST /api/routines/:id/archive`    | Archive after ending any active run                  |
| `POST /api/routines/:id/runs`       | Start or resume                                      |
| `GET /api/runs/:id`                 | Read a run and its steps                             |
| `PATCH /api/runs/:id/steps/:stepId` | Set a check or start/pause/reset its timer           |
| `POST /api/runs/:id/complete`       | Verify all steps and finish                          |
| `POST /api/runs/:id/discard`        | End without completing                               |
| `GET /api/history?offset=0`         | 25 finished/discarded runs, newest first             |

## Extension points and limits

New routine categories are plain data. No switch statements or mobility-specific
tables control the workflow. Existing fields already cover workouts, care tasks,
and maintenance procedures. Add new shared step fields with a migration and copy
them into `run_steps` when starting a run. If future routines need materially
different step behavior, add an explicit step kind with typed configuration and
validation, preserving the snapshot boundary.

The owner key on routines/runs is ready for account-level data isolation; adding
multiple accounts requires removing the singleton constraint and introducing a
proper enrollment/recovery flow. The current app deliberately has no public signup.

This MVP has no offline queue, push notifications, scheduler, calendar/streak logic,
file uploads, or multi-owner collaboration. Dates are stored with time zones and
displayed in the device's locale. The UI uses standard React components with
Tailwind classes so the planned design overhaul can stay within `client/`.

## Reference documentation

- [Effect generators](https://effect.website/docs/v3/getting-started/using-generators)
- [Drizzle PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql)
- [Bun Docker guide](https://bun.sh/guides/ecosystem/docker)
- [Railway PostgreSQL](https://docs.railway.com/databases/postgresql)
- [Railway health checks](https://docs.railway.com/deployments/healthchecks)
