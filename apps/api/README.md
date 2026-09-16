# @digicasino/api

Backend API for digiCasino — Task 001 (Foundation): health check, auth (register/login/me), and
the minimal wallet module that provisions a demo wallet on registration.

## Stack notes

- Express 4 + TypeScript, compiled to CommonJS (see `tsconfig.json`).
- Prisma ORM **6.19.3** (pinned) + SQLite. Prisma 7 was intentionally not used: it requires a
  `prisma.config.ts`, mandatory driver adapters, and ESM-only output, which is unnecessary
  complexity for this foundation-stage demo app. Prisma 6.x supports enums on SQLite (since 6.2.0)
  and configures the datasource directly in `schema.prisma` via `env("DATABASE_URL")`.
- `bcryptjs` (pure JS, avoids native build tooling) for password hashing.
- Vitest + Supertest for tests.

## Setup

```bash
npm install                # from the repo root
npm run predev --prefix apps/api   # applies Prisma migrations + generates the client (also runs automatically before `npm run dev`)
npm run dev --prefix apps/api
```

The app works out of the box without a `.env` file (see `src/config/env.ts` for defaults), but you
should copy the repo-root `.env.example` to `.env` and set a real `JWT_SECRET` for anything beyond
local experimentation.

## Scripts (run from `apps/api/`)

- `npm run dev` — start the dev server with `tsx watch` (runs `predev` first: migrate + generate).
- `npm run build` — type-check and compile to `dist/` (runs `prebuild`: prisma generate).
- `npm start` — run the compiled server (runs `prestart`: apply migrations).
- `npm test` — apply migrations to a dedicated `prisma/test.db` and run the Vitest suite.
- `npm run prisma:migrate` — create/apply a new migration against `prisma/dev.db` during schema
  changes (Task 002+).

## API contract (base path `/api/v1`)

Errors always have the shape `{ "error": { "message": string, "code": string } }`.

### `GET /api/v1/health`

`200` → `{ "status": "ok" }`

### `POST /api/v1/auth/register`

Request: `{ "email": string, "password": string (min 8 chars) }`

`201` →
```json
{
  "user": { "id": "string", "email": "string", "createdAt": "ISO-8601 string" },
  "wallet": { "balance": 1000, "currency": "DEMO" }
}
```

Errors: `400 VALIDATION_ERROR`, `409 EMAIL_ALREADY_REGISTERED`.

### `POST /api/v1/auth/login`

Request: `{ "email": string, "password": string }`

`200` →
```json
{
  "token": "string (JWT, 7d expiry)",
  "user": { "id": "string", "email": "string", "createdAt": "ISO-8601 string" }
}
```

Errors: `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`.

### `GET /api/v1/auth/me`

Requires header `Authorization: Bearer <token>`.

`200` →
```json
{
  "user": { "id": "string", "email": "string", "createdAt": "ISO-8601 string" },
  "wallet": { "balance": 1000, "currency": "DEMO" } // or null if somehow missing
}
```

Errors: `401 UNAUTHORIZED`.

## Notes / assumptions

- Starting demo balance is **1000** credits (`STARTING_DEMO_BALANCE` in
  `src/modules/wallet/wallet.service.ts`), matching the example in `AGENTS.md`.
- Wallet creation on registration goes through `apps/api/src/modules/wallet/wallet.service.ts`
  (never mutated directly from the auth module), and also writes a matching `CREDIT` ledger entry
  so the balance is always backed by the append-only ledger, per `SYSTEM_ARCHITECTURE.md`.
- `GameSession` is a schema stub only — no routes or logic exist for it yet (Task 002 scope).
