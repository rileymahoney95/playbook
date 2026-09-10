# Playbook setup

Playbook runs personal routines as reusable checklists. The first MVP is a
morning mobility routine, with a generic routine model for future use cases.

- Repository: https://github.com/rileymahoney95/playbook
- Railway project: `2eee94db-1dbe-4cc7-baa5-f576c177dfc6`
- Railway environment: `production`
- Railway application service: `playbook`

The application runs as one Bun service and a Railway Postgres service with a
5 GB persistent volume. The application domain is
https://playbook-production-8801.up.railway.app.

The app uses Bun, TypeScript, Effect, Drizzle, React, Vite, and Tailwind. See
[README](../README.md) for local development and deployment instructions and
[architecture](architecture.md) for the data model and consistency boundaries.

Initial access was verified by pushing commit `86b4d1b` to GitHub and setting and
reading a variable on the Railway application service before product work began.
