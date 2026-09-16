# digiCasino — Project Status

Last updated: TrueForge bootstrap (Task 001 — Foundation)

## Repository audit (Step 1)
- **Project type**: brand-new repository. No existing code, stack, or tests were present prior to
  this bootstrap. This is a **new project**, not an existing application to reverse-engineer.
- **Package manager**: none previously configured. Sandbox has Node v24, npm 11, pnpm 12
  (downloadable on demand), Python 3.13. No Postgres server or client is available.
- **Frontend**: none existed. Being scaffolded in `apps/web`.
- **Backend**: none existed. Being scaffolded in `apps/api`.
- **Database / ORM**: none existed. Being scaffolded with Prisma + SQLite (see
  `trueforge/decisions/architecture-decisions.md`).
- **Authentication**: none existed. Being scaffolded as JWT-based session auth.
- **Tests**: none existed. Being scaffolded with Vitest (+ Supertest for API, + React Testing
  Library for web).
- **Deployment configuration**: none exists yet. Out of scope for Task 001 (see
  `COMPLIANCE_READINESS.md` and the P3 backlog).
- **Environment variables**: none existed. `.env.example` is being added at the repo root.

## Current phase
**Task 001 — Foundation** (P0) is COMPLETED: the app runs locally (`npm install && npm test` at
the repo root), users can register/log in, and the SQLite database is connected and migrated via
Prisma. **Task 002 — Demo Casino Vertical Slice** is READY next. See `AGENT_TASKS.md` and
`trueforge/tasks/backlog.md` for the full task registry and sequencing.

## Branching
- `main` — stable branch, pushed to `origin` (github.com/ZeroCoolrules/digiCasino).
- `feat/digicasino-foundation` — active development branch for Task 001, pushed to `origin`.

## Persistence note
This repository previously existed only locally (no remote) and was lost twice to sandbox resets
before a GitHub remote was configured. As of this bootstrap, `origin` points to
`https://github.com/ZeroCoolrules/digiCasino.git` and work is pushed incrementally to avoid a repeat.

## Known limitations at this stage
- No database server is available in the current sandbox; SQLite is used for local/dev/demo so the
  stack remains fully runnable and testable without external services.
- Only Task 001 (Foundation) is implemented in this bootstrap. Task 002 (Demo Casino Vertical
  Slice) and Task 003 (Admin + Casino Operations) are scoped and queued but not yet started.
