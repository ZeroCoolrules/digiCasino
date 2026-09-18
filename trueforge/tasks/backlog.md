# Backlog

Tasks are listed in priority order. Task 001/002/003 are the explicit vertical-slice sequence and
take precedence over the rest of the P0–P3 list below.

## Task 001 — Foundation
- **Priority**: P0
- **Owner**: Architect → Backend → Frontend → QA/DevOps
- **Description**: Repository audit, architecture documentation, environment configuration,
  database setup, core schema, authentication foundation, API conventions, shared UI system,
  testing setup.
- **Dependencies**: none.
- **Files expected to change**: repo root docs, `trueforge/**`, `package.json`, `apps/api/**`,
  `apps/web/**`, `prisma/**`.
- **Acceptance criteria**: the app runs locally, users can register/login, the database is
  connected.
- **Test requirements**: Vitest (api + web) passing.
- **Status**: COMPLETED (see `trueforge/tasks/completed.md`).
- **Completion notes**: Implemented by backend-agent + frontend-agent child agents in parallel
  worktrees, merged into `feat/digicasino-foundation`, contract mismatch reconciled, full test
  suite green. See `trueforge/tasks/completed.md` for details.

## Task 002 — Demo Casino Vertical Slice
- **Priority**: P1
- **Owner**: Architect → Backend → Game Engine → Wallet/Ledger → Frontend → QA/DevOps →
  Orchestrator.
- **Description**: One complete playable demo game with virtual credits, server-side game results,
  transaction recording, and a working game screen.
- **Dependencies**: Task 001 completed.
- **Files expected to change**: `apps/api/src/modules/game/**`,
  `apps/api/src/modules/wallet/**`, `apps/web/src/pages/game/**`, `prisma/schema.prisma`.
- **Acceptance criteria**: a logged-in user can launch a demo game, play, receive a demo result, and
  see the transaction history.
- **Test requirements**: game session tests, wallet idempotency tests, frontend smoke test for the
  game screen.
- **Status**: COMPLETED (see `trueforge/tasks/completed.md`).
- **Completion notes**: Architect stage (schema/contract) done by orchestrator; backend and
  frontend implemented directly by the orchestrator after the originally-assigned child agents
  became unreachable (see completion notes for details). Merged into
  `feat/task-002-vertical-slice`, full test suite green (40 tests), live end-to-end smoke test
  passed against a real running server with real RNG.

## Task 003 — Admin + Casino Operations
- **Priority**: P1
- **Owner**: Admin/Operations → Backend → QA/DevOps.
- **Description**: Admin dashboard, game catalog management, player overview, demo-credit
  adjustments with audit logs, basic operational reporting.
- **Dependencies**: Task 001 completed; benefits from Task 002 (game catalog) but not strictly
  blocked by it.
- **Files expected to change**: `apps/api/src/modules/admin/**`, `apps/web/src/pages/admin/**`.
- **Acceptance criteria**: the operator can manage the demo casino without editing the database
  manually.
- **Test requirements**: admin-authorization tests, audit-log tests.
- **Status**: READY (Task 002 dependency satisfied).
- **Completion notes**: —

---

## Remaining P0 — Foundation (folded into Task 001, tracked individually for granularity)
- Repository audit — COMPLETED
- Architecture documentation — COMPLETED
- Environment configuration — COMPLETED
- Database setup — COMPLETED
- Authentication foundation — COMPLETED
- Core schema — COMPLETED
- API conventions — COMPLETED
- Shared UI system — COMPLETED
- Testing setup — COMPLETED

## P1 — First Working Casino (superset of Task 002/003, remaining items)
- Casino landing page — COMPLETED (Task 001)
- Casino lobby — COMPLETED (Task 002, DB-backed catalog)
- Game catalog — COMPLETED (Task 002)
- Player profile — BACKLOG (only auth/wallet exist so far, no dedicated profile page)
- Demo wallet — COMPLETED (Task 001/002)
- Transaction ledger — COMPLETED (Task 002)
- One playable demo game — COMPLETED (Task 002, Demo Slots)
- Game session tracking — COMPLETED (Task 002)
- Transaction history — COMPLETED (Task 002)
- Basic admin dashboard — BACKLOG (Task 003)

## P2 — Expansion
- Additional demo games
- Promotions
- Bonuses
- Loyalty
- Notifications
- Analytics
- Support system

## P3 — Production Readiness
- Security hardening
- Compliance integrations
- Responsible gaming controls
- Payment-provider architecture
- Monitoring
- Backups
- Performance testing
- Deployment automation
