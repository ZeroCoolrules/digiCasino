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
