# Completed

## Task 001 — Foundation
- **Completed**: TrueForge bootstrap, this cycle.
- **Owners**: Architect (orchestrator) → Backend + Frontend (parallel local child agents) →
  Orchestrator (merge, contract reconciliation, QA).

### Summary
- Root workspace config: npm workspaces (`apps/api`, `apps/web`, `packages/shared`), shared
  `tsconfig.base.json`, `.env.example`.
- `apps/api`: Express + TypeScript, Prisma + SQLite (`User`, `Wallet`, `LedgerEntry` append-only,
  `GameSession` stub), JWT auth (`register`, `login`, `me`), a dedicated `wallet` module that is the
  only code path creating/mutating wallet balances. bcryptjs for password hashing (pure JS, avoids
  native build tooling in the sandbox). Prisma pinned to 6.19.3 (not 7.x/8.x — avoids added
  driver-adapter/config complexity not justified for this task).
- `apps/web`: Vite + React + TypeScript, a shared theme (design tokens) and `Button`/`Card`
  components, a minimal custom router (no router dependency needed for 4 static routes), an
  `AuthContext` for client-side session state, and Landing/Lobby/Login/Register pages.
- **Contract reconciliation during merge**: the backend and frontend child agents ran in parallel
  and made slightly different assumptions about the register/me response shapes. Backend's actual,
  tested contract: `POST /auth/register` returns `{ user, wallet }` with **no token** (login is a
  separate step); `GET /auth/me` returns `{ user, wallet }` (not the bare user object). The
  orchestrator updated `apps/web/src/api/client.ts` and `AuthContext.tsx` to match: `register()` now
  calls register-then-login internally so the UI still feels like one step, and `login()`/the
  session-hydration effect both call `/auth/me` to populate wallet balance alongside the user.
- **Dependency conflict fixed during merge**: `apps/api` and `apps/web` had declared different
  major versions of `vitest` (`^5.0.1` vs `^2.1.3`), causing npm to hoist one and leave a duplicate
  nested install of the other — which broke `@testing-library/jest-dom`'s `expect` augmentation for
  the web tests. Fixed by aligning `apps/web` to `vitest ^5.0.1` and doing a clean reinstall.

### Test requirements — met
- `npm test` at the repo root: **API 12/12 passing, Web 11/11 passing.**
- `npm run lint` (tsc --noEmit, both workspaces): clean.
- `npm run build` (both workspaces): clean, `apps/web` produces a working production `dist/` bundle.

### Acceptance criteria — met
The app runs locally, a user can register and log in (JWT-issued on login, wallet auto-created with
a starting demo balance of 1000 credits on registration), and the database (SQLite via Prisma) is
connected and migrated.

### Known limitations
- No admin UI, no real games, no wallet settlement logic beyond initial balance creation — all
  correctly deferred to Task 002/003.
- `JWT_SECRET` has an insecure development default when unset; must be set via `.env` before any
  real deployment (documented in `apps/api/README.md` and `.env.example`).
- No CI pipeline configured yet (P0 backlog item "Testing setup" covers local test tooling only).

## Task 002 — Demo Casino Vertical Slice
- **Completed**: this cycle.
- **Owners**: Architect (orchestrator) → Backend + Frontend (implemented directly by the
  orchestrator, see below) → Orchestrator (merge, verification).

### Child-agent unreachability incident
The Architect stage (schema, migration, seed data, fixed API contract, ADR-004) was completed and
assigned to the same backend-agent/frontend-agent child agents that built Task 001. After the
assignment, both agents went unresponsive: two separate status-check pings and `wait_for_events`
calls across a ~28 hour span produced no commits on either assigned branch
(`feat/task002-backend`, `feat/task002-frontend`) and no reply messages. Per explicit instruction
not to spin up duplicate/replacement agents, the orchestrator implemented both halves directly in
the same pre-provisioned worktrees/branches rather than leaving the task blocked.

### Summary
- **Schema**: added a `Game` catalog model (slug, name, description, minBet, maxBet, isActive) and
  extended `GameSession` with `bet`, `payout`, `result` (JSON), `settledAt`. Seeded one game,
  `demo-slots`, via `prisma/seed.ts` (idempotent upsert).
- **Backend**: a 3-reel slot machine (`apps/api/src/modules/game/slotMachine.ts`) using
  `crypto.randomInt`, with an injectable roll function for deterministic tests. Session lifecycle
  (`game.service.ts`): starting a session validates the bet against the game's min/max and debits
  it in one transaction; playing a session rolls the outcome, credits any payout, and transitions
  `PENDING`→`COMPLETED` via a conditional `updateMany` so a second `play` call is rejected
  (`409 SESSION_ALREADY_SETTLED`) rather than double-settling. Wallet module extended with
  `debitWallet`/`creditWallet`/`listLedgerEntriesForUser`, still the only code touching
  `Wallet`/`LedgerEntry` rows. New routes: `GET /games`, `POST /games/:slug/sessions`,
  `POST /games/sessions/:id/play`, `GET /wallet/transactions`.
- **Frontend**: Lobby now fetches the live catalog instead of a static list; a new Game page
  (`/games/:slug`) lets a logged-in user set a bet, spin (chaining start+play), and see the reel
  result and updated balance; a new Transactions page (`/transactions`) lists the ledger. Router
  extended with a dynamic `/games/${string}` route type.
- Backend and frontend were implemented sequentially by the same orchestrator against the fixed
  Architect-stage contract, so no contract drift needed reconciling at merge time (unlike Task 001).

### Test requirements — met
- `npm test` at the repo root: **API 25/25 passing** (12 from Task 001 + 13 new), **Web 15/15
  passing** (11 from Task 001, one updated for the live catalog, + 4 new).
- `npm run lint` / `npm run build`: clean for both workspaces.
- **Live end-to-end smoke test** against a real running server (not mocks): register → login →
  list games → start session (bet debited) → play (real `crypto.randomInt` outcome, correct
  payout/no-payout handling) → replay rejected with 409 → transaction history shows exactly the
  expected DEBIT + initial CREDIT entries, newest first.

### Acceptance criteria — met
A logged-in user can launch the demo slot machine, play it, receive a real server-generated result,
and see it reflected in their transaction history.

### Known limitations
- Only one demo game (`demo-slots`) exists; additional games are P2 backlog.
- No "provably fair" client-side verification of RNG outcomes — deferred, per ADR-004.
- Admin dashboard, responsible-gaming controls, and deployment automation remain out of scope
  (Task 003 / P2 / P3).

## Task 003 — Admin + Casino Operations
- **Completed**: this cycle.
- **Owners**: Architect (orchestrator) → admin-backend-agent + admin-frontend-agent (parallel
  child agents, both completed successfully) → Orchestrator (merge, verification).

### Summary
- **Schema**: `Role` enum (`PLAYER`|`ADMIN`) on `User`; append-only `AuditLogEntry` model
  (adminUserId, action, targetUserId, amount, reason, createdAt). See ADR-005.
- **Admin bootstrapping**: an `ADMIN_EMAILS` environment variable (comma-separated) auto-promotes
  matching users to `ADMIN` on register/login — no hardcoded demo credentials, no direct database
  edits ever required to create the first admin.
- **Backend** (`apps/api/src/modules/admin/`): `requireAdmin` middleware (403 for non-admins, 401
  for unauthenticated, composed after `requireAuth`); `admin.service.ts` for game management,
  player listing, credit adjustments (via the existing wallet module's `debitWallet`/
  `creditWallet`, never direct writes), audit-log queries, and operational reporting.
  Routes: `GET/PATCH /admin/games(/:slug)`, `GET /admin/players`,
  `POST /admin/players/:userId/credit-adjustments`, `GET /admin/audit-log`,
  `GET /admin/reports/summary`.
- **Frontend** (`apps/web/src/pages/Admin/`): an `AdminDashboard` page (guarded client-side by
  `role === 'ADMIN'`, with the real enforcement server-side) composed of independently-loading
  sections: `OperationalSummary`, `GameManagement` (toggle active/edit min-max bet),
  `PlayerManagement` (list players, submit credit/debit adjustments), and `AuditLog` (read-only,
  newest first). A "Admin dashboard" nav link appears in the Lobby header only for admin users.
- **Orchestration note**: unlike Task 002, both child agents (`admin-backend-agent`,
  `admin-frontend-agent`) completed their assignments successfully and reported back promptly with
  no unreachability issues, and their branches merged with zero contract drift and zero merge
  conflicts.

### Test requirements — met
- `npm test` at the repo root: **API 38/38 passing** (25 from Tasks 001/002 + 13 new admin tests),
  **Web 22/22 passing** (15 from Tasks 001/002 + 7 new admin/lobby tests).
- `npx tsc --noEmit` / `npm run lint` / `npm run build`: clean for both workspaces.
- **Live end-to-end smoke test** against a real running server (not mocks): registered an
  `ADMIN_EMAILS`-matching user (auto-promoted to ADMIN), registered a regular player; verified
  403 for a non-admin and 401 for unauthenticated requests on an admin route; deactivated and
  reactivated the demo game via the admin API and confirmed the public catalog reflected the
  change immediately; credited a player 500 demo credits (balance updated correctly, audit entry
  created); attempted an over-limit debit (correctly rejected with `400 INSUFFICIENT_BALANCE`,
  no partial state change); confirmed the audit log and operational summary numbers were fully
  internally consistent (ledger entry count, total credits in circulation, player count all
  matched expectations).

### Acceptance criteria — met
An operator can manage the game catalog, view players, adjust demo credits with a full audit
trail, and see basic operational metrics — all without ever touching the database directly.

### Known limitations
- Admin access is granted via the `ADMIN_EMAILS` environment variable with no invitation/approval
  workflow — acceptable for this demo-stage project per ADR-005, but must be revisited before any
  real-money functionality is considered.
- No pagination on players/audit-log listings yet; acceptable at current data volumes.
- Reporting is computed on-demand (no caching/materialization) — fine at current scale per ADR-005.

## Task 004 — Player Profile
- **Completed**: this cycle.
- **Owners**: Architect (orchestrator) → profile-backend-agent + profile-frontend-agent (parallel
  child agents, both completed successfully) → Orchestrator (merge, verification).

### Summary
- **No schema changes** — all profile data already existed on `User`/`Wallet`/`GameSession`. See
  ADR-006 for the design rationale (on-demand aggregation, separate endpoint from `/auth/me`).
- **Backend** (`apps/api/src/modules/profile/`): `GET /profile` returns account info, wallet
  balance, and lifetime play stats (`totalSessions`, `totalWagered`, `totalPayout`, `netResult`)
  computed via a single Prisma `aggregate()` query over the user's `COMPLETED` `GameSession` rows
  (count + sum, not a full row load). `PATCH /profile/password` verifies the current password via
  bcrypt (same pattern as `auth.service.ts`'s login) before hashing and storing the new one.
- **Frontend** (`apps/web/src/pages/Profile/`): a `/profile` page showing account info, balance,
  and stats (net result styled win/loss), plus a password-change form with client-side
  confirm-match and length validation before ever calling the API. A "Profile" nav link appears
  in the Lobby header for any logged-in user (not admin-gated, unlike the Admin link).
- **Orchestration note**: both child agents (`profile-backend-agent`, `profile-frontend-agent`)
  completed successfully with no unreachability issues, and their branches merged with zero
  contract drift and zero merge conflicts — same clean outcome as Task 003.

### Test requirements — met
- `npm test` at the repo root: **API 45/45 passing** (38 from Tasks 001–003 + 7 new profile
  tests), **Web 27/27 passing** (22 from Tasks 001–003 + 5 new profile tests).
- `npx tsc --noEmit` / `npm run lint` / `npm run build`: clean for both workspaces.
- **Live end-to-end smoke test** against a real running server (not mocks): verified zero-stats
  for a brand-new user; played 3 real game sessions and confirmed the profile's aggregated stats
  (wagered/payout/net result) exactly matched the sum of those sessions' real RNG outcomes, with
  the wallet balance staying consistent; verified wrong-current-password rejection (401), too-short
  new-password rejection (400), and a full password-change lifecycle proof (old password stops
  working, new password logs in successfully).

### Acceptance criteria — met
A logged-in user can view their profile (account info, balance, lifetime play stats) and change
their password.

### Known limitations
- Password change does not invalidate other already-issued JWTs (no server-side revocation list
  exists yet) — acceptable for this demo-stage project per ADR-006; revisit under P3 security
  hardening if needed.
- No pagination or date-range filtering on stats; fine at current data volumes.
