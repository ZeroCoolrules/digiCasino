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

## Core schema (Task 001 — minimal, extended in Task 002)
- `User` — id, email, passwordHash, createdAt.
- `Wallet` — id, userId (1:1 with User), balance (demo credits), currency label (e.g. "DEMO").
- `LedgerEntry` — id, walletId, type (CREDIT/DEBIT), amount, reason, createdAt. Append-only; the
  wallet balance is derived/reconciled from ledger entries, not mutated independently.
- `GameSession` — id, userId, gameId, status, createdAt (schema stub for Task 002; not populated
  with real game logic in Task 001).

## API conventions
- Base path: `/api/v1`.
- JSON request/response bodies. Errors: `{ "error": { "message": string, "code": string } }`.
- Auth: `POST /api/v1/auth/register`, `POST /api/v1/auth/login` (returns JWT), `GET /api/v1/auth/me`
  (requires `Authorization: Bearer <token>`).
- Health: `GET /api/v1/health` → `{ "status": "ok" }`.
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
