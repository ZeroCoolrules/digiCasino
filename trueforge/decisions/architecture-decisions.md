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

## ADR-004: Demo game choice, RNG, and settlement design for Task 002
**Status**: Accepted
**Date**: Task 002 — Demo Casino Vertical Slice

### Context
Task 002 requires one complete playable demo game with server-side outcomes and real wallet
settlement, per `AGENTS.md`'s rule that game outcomes are never trusted from the client and all
balance mutations go through the wallet module only.

### Decision
- **Game**: a 3-reel slot machine (`slug: demo-slots`), seeded into a new `Game` catalog table via
  `prisma/seed.ts` (idempotent upsert by slug).
- **RNG**: Node's built-in `crypto.randomInt` (CSPRNG) rolls each reel independently server-side;
  the full outcome (reel symbols + payout multiplier) is stored as a JSON string on `GameSession.result`
  for auditability. The client never supplies or influences the outcome.
- **Settlement**: a session is created (`POST /games/:slug/sessions`) which validates the bet
  against `Game.minBet`/`maxBet` and the wallet balance, then immediately debits the bet via the
  wallet module. Playing the session (`POST /games/sessions/:id/play`) resolves the RNG outcome and
  credits any payout, also via the wallet module, inside one Prisma transaction. The session's
  `status` transitions `PENDING` → `COMPLETED` as part of that same transaction (conditioned on the
  current status being `PENDING`), so a second `play` call on an already-settled session is
  rejected (`409 SESSION_ALREADY_SETTLED`) rather than double-crediting/debiting.
- **Wallet module extension**: generic `debit()`/`credit()` functions were added to the existing
  wallet service (alongside the Task 001 `createWalletForUser`), all still writing through the same
  append-only `LedgerEntry` table — no other module gained direct write access to `Wallet`/
  `LedgerEntry`.

### Alternatives considered
- **Card-based game (blackjack) or a number-guessing game**: rejected for the first vertical slice
  as needlessly more complex (multi-step player decisions) than needed to validate the full
  login→play→ledger loop; a slot machine is a single-decision (bet amount) game that still reads as
  a real casino game.
- **Deterministic/seeded PRNG exposed to the client for "provably fair" verification**: deferred to
  a future P2/P3 backlog item; out of scope for the foundation vertical slice.

### Consequences
- Extending to additional games later mainly means adding new `Game` rows plus a new game-specific
  resolver, without changing the settlement/session-lifecycle contract.
- The wallet module's `debit`/`credit` functions are now the reusable building blocks Task 003's
  admin-initiated credit adjustments should also call, rather than introducing a second mutation
  path.

## ADR-005: Admin role and audit-log design for Task 003
**Status**: Accepted
**Date**: Task 003 — Admin + Casino Operations

### Context
Task 003 requires operator-facing admin functionality (game catalog management, player overview,
audited demo-credit adjustments, basic reporting) without giving anyone direct database access, and
without introducing real-money payment processing (explicitly out of scope per `AGENTS.md` /
`PRODUCT_REQUIREMENTS.md`).

### Decision
- **Authorization**: a `role` enum (`PLAYER` | `ADMIN`, default `PLAYER`) was added directly to
  `User` rather than a separate roles/permissions table — there are only two roles and no plans for
  more granular permissions in this phase, so the simplest model that satisfies "server-side
  enforcement" (per `trueforge/agents/admin-operations.md`) was chosen over premature generality.
- **Admin bootstrapping**: rather than a hardcoded admin account (which would mean either a
  committed demo password or a manual database edit — both against `AGENTS.md`'s "no direct
  database edits" and "no committed credentials" rules), a new `ADMIN_EMAILS` environment variable
  (comma-separated) is checked on register/login; a matching email is promoted to `ADMIN`
  automatically. This keeps the repo credential-free while still letting an operator self-serve
  admin access locally or in any deployment by setting one env var.
- **Audit log**: a new append-only `AuditLogEntry` model (adminUserId, action, targetUserId, amount,
  reason, createdAt) is written by the admin module for every credit adjustment and game-catalog
  edit. No update/delete route exists for it, satisfying the "tamper-evident, never editable by the
  admin who created them" requirement structurally rather than just by convention.
- **Credit adjustments reuse the wallet module**: `POST /admin/players/:userId/credit-adjustments`
  calls the same `debitWallet`/`creditWallet` functions introduced in ADR-004, in the same
  transaction as the audit-log write — the wallet module remains the only code path that ever
  touches `Wallet`/`LedgerEntry` rows, including for admin-initiated changes.

### Alternatives considered
- **Seeded demo admin account with a known password**: rejected — even clearly-labeled demo
  credentials are a committed secret pattern this project has avoided everywhere else.
- **Separate `Role`/`Permission` join tables**: rejected as unnecessary complexity for two roles
  with no per-permission granularity requirement yet; can be introduced later without migrating
  existing data if finer-grained permissions become necessary.

### Consequences
- Anyone who can set the `ADMIN_EMAILS` environment variable on the server can grant themselves
  admin access by registering/logging in with that email — acceptable for this demo-stage project
  (no real money involved) but must be revisited (e.g. an explicit invitation/approval flow) before
  any real-money functionality is ever considered, per `COMPLIANCE_READINESS.md`.
- Reporting (`GET /admin/reports/summary`) is computed on-demand via aggregate queries rather than
  a materialized/cached reporting table — acceptable at current data volumes; revisit if reporting
  queries become a performance concern.

## ADR-006: Player profile design for Task 004
**Status**: Accepted
**Date**: Task 004 — Player Profile

### Context
The P1 backlog carried a leftover "Player profile" item: players had a wallet and transaction
history (Task 002) but no dedicated profile view, and no way to change their password after
registration.

### Decision
- **No new tables.** Every field a profile needs already exists on `User`/`Wallet`/`GameSession`.
  `GET /api/v1/profile` is a pure read/aggregate endpoint: account info from `User`, balance from
  `Wallet`, and lifetime play stats (`totalSessions`, `totalWagered`, `totalPayout`, `netResult`)
  computed on-demand from the user's `COMPLETED` `GameSession` rows. This mirrors ADR-005's
  "compute reporting on-demand" choice for the same reason: simplicity at current data volumes.
- **Password change** (`PATCH /api/v1/profile/password`) reuses the exact bcrypt compare/hash
  pattern already used by `auth.service.ts`'s `loginUser`/`registerUser`, requiring the current
  password before accepting a new one — standard practice, and keeps the auth module as the only
  place that ever reads/writes `passwordHash`.
- **Ownership**: a new `apps/api/src/modules/profile/` module (backend) and
  `apps/web/src/pages/Profile/` (frontend), kept separate from `auth`/`wallet`/`game`/`admin` per
  `AGENTS.md`'s module-separation rule, even though it reads from all three.

### Alternatives considered
- **Folding this into `GET /auth/me`**: rejected — `/auth/me` is a lightweight session-check
  endpoint used on every page load (via `AuthContext`); adding aggregate `GameSession` queries to
  it would make every app load pay that cost. A separate `/profile` endpoint is only called when
  the player actually visits the profile page.
- **A dedicated `PlayerStats` table updated incrementally on each settlement**: rejected as
  premature optimization; revisit only if on-demand aggregation becomes a measured performance
  problem.

### Consequences
- Adding more profile fields or stats later (e.g. favorite game, win streak) means extending the
  aggregate query, not a schema migration, as long as the underlying data already exists elsewhere.
- Password-change intentionally does not invalidate other active JWTs (no server-side token
  revocation list exists yet) — acceptable for this demo-stage project; revisit under P3 security
  hardening if this becomes a real concern.
