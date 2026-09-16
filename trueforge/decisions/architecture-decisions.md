# Architecture Decision Records

## ADR-001: Stack selection for a new, empty repository
**Status**: Accepted
**Date**: TrueForge bootstrap (Task 001)

### Context
digiCasino was an empty repository with no existing code, so there was no stack to reverse-engineer.
The build environment has Node v24, npm 11, and pnpm 12 (downloadable), but no Postgres server or
client. A stack had to be chosen that is fully runnable and testable without external services.

### Decision
- Monorepo via **npm workspaces** (`apps/api`, `apps/web`, `packages/shared`) — avoids requiring a
  separate package manager bootstrap step.
- **Backend**: Node.js + TypeScript + Express, tested with Vitest + Supertest.
- **Frontend**: React + Vite + TypeScript, tested with Vitest + React Testing Library.
- **Database/ORM**: Prisma with **SQLite** for local/dev/demo. The schema is written to be
  Postgres-portable so a production migration (P3 backlog) only requires a provider/connection
  change, not a schema rewrite.
- **Auth**: JWT-based session auth, bcrypt for password hashing.

### Alternatives considered
- **pnpm workspaces**: rejected for v1 to avoid an extra binary download step in constrained
  sandboxes; can be revisited later since pnpm is available.
- **Postgres from the start**: rejected because no Postgres server/client is available in the
  current sandbox, and requiring one would block Task 001 entirely.
- **Next.js (full-stack framework)**: rejected for v1 to keep a clear frontend/backend module
  boundary matching `AGENTS.md`'s architecture rules; a separate Express API also makes the
  wallet/game/auth module boundaries easier to enforce and review.

### Consequences
- Development and CI can run fully offline/without provisioning any external service.
- Moving to Postgres in production requires changing the Prisma datasource provider and running a
  fresh migration; schema design avoids SQLite-only features to keep this low-risk.

## ADR-002: Vertical-slice task sequencing over a flat backlog
**Status**: Accepted
**Date**: TrueForge bootstrap (Task 001)

### Context
The original TrueForge prompt proposed a flat, priority-tiered backlog (P0–P3). Experience shows
that dispatching many agents against a flat backlog without an explicit first sequence risks
conflicting schemas, duplicate auth/wallet implementations, and wasted rework.

### Decision
Adopt an explicit three-task sequence ahead of the rest of the backlog: **Task 001 — Foundation**,
**Task 002 — Demo Casino Vertical Slice**, **Task 003 — Admin + Casino Operations**. Each task uses
the 5-stage build pipeline (Architect → Backend+Frontend → Game/Wallet specialist → QA/Security →
Orchestrator), parallelizing only when interfaces are already fixed.

### Consequences
- Slower to reach "every P0 item done" than fully parallelizing, but avoids the described
  conflict/rework failure mode.
- The rest of the P0–P3 backlog remains available in `trueforge/tasks/backlog.md` for future
  cycles once Tasks 001–003 are complete.

## ADR-003: Require a git remote before further TrueForge implementation work
**Status**: Accepted
**Date**: TrueForge bootstrap (Task 001), after two total data-loss incidents

### Context
digiCasino was initially created with no git remote. Two separate sandbox resets wiped the entire
repository — the second time even after all work had been committed — because the session-recovery
mechanism only captures uncommitted working-tree diffs, not full commit history, and a repo with no
remote has no other durable storage.

### Decision
`origin` is now set to `https://github.com/ZeroCoolrules/digiCasino.git`, with `main` and
`feat/digicasino-foundation` pushed. All subsequent TrueForge/agent work commits and pushes
incrementally (after each meaningful chunk) rather than accumulating large uncommitted or unpushed
changes.

### Consequences
- Every agent role's workflow should treat "push to origin" as part of its definition of done for
  any non-trivial chunk of work, not just at final PR time.
- `trueforge/workflows/release-feature.md` explicitly pushes to `origin` rather than assuming a
  remote may not exist.
