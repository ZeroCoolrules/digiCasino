# digiCasino — System Architecture

## Stack (see `trueforge/decisions/architecture-decisions.md` for rationale)
- **Monorepo**: npm workspaces — `apps/api`, `apps/web`, `packages/shared`.
- **Backend**: Node.js + TypeScript + Express. Tests: Vitest + Supertest.
- **Frontend**: React + Vite + TypeScript. Tests: Vitest + React Testing Library.
- **Database / ORM**: Prisma, SQLite for local/dev/demo. Schema is written to be Postgres-portable
  for a future production migration (P3 backlog).
- **Auth**: JWT-based session auth, passwords hashed with bcrypt.

## Module boundaries (enforced, per `AGENTS.md`)
```
apps/
  api/            Backend Agent owns this
    src/
      modules/
        auth/       registration, login, JWT issuance
        wallet/      the ONLY module allowed to mutate balances/ledger
        game/        game session + outcome logic (server-side RNG)
        health/      health check endpoint
      prisma/       schema + migrations (Database)
  web/            Frontend Agent owns this
    src/
      theme/        design tokens
      components/    shared UI components (Button, Card, ...)
      pages/         Landing, Lobby, Login, Register, ...
packages/
  shared/          types/constants shared between api and web (owned jointly, changes require
                   coordination between Backend and Frontend agents)
```

- **Wallet module is the single source of truth for balance mutation.** Game and frontend code must
  never write balances or ledger rows directly — they call into the wallet module's API/service
  layer.
- **Game outcomes are always generated server-side** (Game Engine / Backend agents), using an
  auditable, seedable RNG. Client-submitted outcomes are never trusted.
- Frontend, backend, game logic, and wallet/ledger code stay in clearly separated directories, per
  `AGENTS.md`.

## Core schema (Task 001 foundation + Task 002/003 additions)
- `User` — id, email, passwordHash, role (`PLAYER`|`ADMIN`, default `PLAYER`, Task 003), createdAt.
- `Wallet` — id, userId (1:1 with User), balance (demo credits), currency label (e.g. "DEMO").
- `LedgerEntry` — id, walletId, type (CREDIT/DEBIT), amount, reason, createdAt. Append-only; the
  wallet balance is derived/reconciled from ledger entries, not mutated independently.
- `Game` (Task 002) — id, slug (unique), name, description, minBet, maxBet, isActive. The catalog
  shown in the lobby; seeded via `prisma/seed.ts`.
- `GameSession` (Task 002) — id, userId, gameId, status (`PENDING`→`COMPLETED`), bet, payout
  (null until settled), result (JSON string, null until settled), createdAt, settledAt. Settlement
  (bet debit + payout credit) happens through the wallet module only, inside a single transaction
  per session, guarded so a session can only be settled once.
- `AuditLogEntry` (Task 003) — id, adminUserId, action (e.g. `CREDIT_ADJUSTMENT`, `GAME_UPDATED`),
  targetUserId (nullable), amount (nullable), reason, createdAt. Append-only; written only by the
  admin module, never updated/deleted (see ADR-005).

## API conventions
- Base path: `/api/v1`.
- JSON request/response bodies. Errors: `{ "error": { "message": string, "code": string } }`.
- Auth: `POST /api/v1/auth/register`, `POST /api/v1/auth/login` (returns JWT), `GET /api/v1/auth/me`
  (requires `Authorization: Bearer <token>`).
- Health: `GET /api/v1/health` → `{ "status": "ok" }`.
- Games (Task 002):
  - `GET /api/v1/games` → `{ "games": [{ "slug", "name", "description", "minBet", "maxBet" }] }`
    (active games only, no auth required).
  - `POST /api/v1/games/:slug/sessions` (auth) body `{ "bet": number }` →
    `201 { "session": { "id", "gameId", "status": "PENDING", "bet" } }`. Debits the bet immediately.
  - `POST /api/v1/games/sessions/:id/play` (auth, must own the session) →
    `200 { "session": { "id", "status": "COMPLETED", "bet", "payout", "result" }, "wallet": { "balance", "currency" } }`.
    `409 SESSION_ALREADY_SETTLED` if called more than once for the same session.
  - `GET /api/v1/wallet/transactions` (auth) →
    `{ "transactions": [{ "id", "type", "amount", "reason", "createdAt" }] }`, newest first.
- Admin (Task 003) — all routes require `Authorization: Bearer <token>` for a user whose `role`
  is `ADMIN` (`403 FORBIDDEN` otherwise). Any user whose email is listed in the `ADMIN_EMAILS`
  environment variable is auto-promoted to `ADMIN` on register/login — see
  `apps/api/src/modules/auth/auth.service.ts` and `.env.example`.
  - `GET /api/v1/admin/games` → `{ "games": [{ "id", "slug", "name", "description", "minBet", "maxBet", "isActive" }] }`
    (all games, including inactive — unlike the public `GET /games`).
  - `PATCH /api/v1/admin/games/:slug` body (all fields optional) `{ "name"?, "description"?, "minBet"?, "maxBet"?, "isActive"? }`
    → `200 { "game": {...} }`. Writes an `AuditLogEntry` (`action: "GAME_UPDATED"`). `404 GAME_NOT_FOUND` for an unknown slug.
  - `GET /api/v1/admin/players` → `{ "players": [{ "id", "email", "role", "createdAt", "wallet": { "balance", "currency" } }] }`.
  - `POST /api/v1/admin/players/:userId/credit-adjustments` body `{ "type": "CREDIT"|"DEBIT", "amount": number, "reason": string }`
    → `201 { "wallet": { "balance", "currency" }, "auditLogEntry": { "id", "action", "targetUserId", "amount", "reason", "createdAt" } }`.
    Adjustments are applied via the wallet module's `debitWallet`/`creditWallet` (never direct Prisma writes) and audit-logged in the
    same transaction. `400 VALIDATION_ERROR` for a non-positive amount or invalid `type`; `400 INSUFFICIENT_BALANCE` if a `DEBIT`
    would take the player's balance negative; `404 USER_NOT_FOUND` for an unknown player.
  - `GET /api/v1/admin/audit-log` → `{ "entries": [{ "id", "adminUserId", "adminEmail", "action", "targetUserId", "targetEmail", "amount", "reason", "createdAt" }] }`,
    newest first. Read-only — no update/delete route exists for audit entries.
  - `GET /api/v1/admin/reports/summary` →
    `{ "playerCount", "activeGameCount", "totalGameCount", "sessionCount", "completedSessionCount", "ledgerEntryCount", "totalCreditsInCirculation" }`
    (basic operational reporting per `trueforge/agents/admin-operations.md`).
- All routes that touch a user's wallet or ledger must go through the wallet service layer, never
  through direct Prisma calls from route handlers.

## Shared UI system
- Design tokens (colors, spacing, typography) centralized in `apps/web/src/theme`.
- Base components (`Button`, `Card`, etc.) built once and reused across Lobby/Auth/Game screens
  (see Task 002/003) to avoid duplicated UI implementations.

## Testing
- `apps/api`: Vitest + Supertest, covering health, auth, and wallet service unit tests.
- `apps/web`: Vitest + React Testing Library, smoke tests for rendered pages/components.
- No test may be skipped to mark a task complete — see `trueforge/workflows/test-feature.md`.
