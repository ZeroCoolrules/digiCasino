# digiCasino — Product Requirements

## Vision
digiCasino is a **virtual-credit / social-casino MVP**. The goal is to validate product, UX, game
engagement, and operator workflows using a demo/virtual ledger, before ever considering regulated
real-money functionality (licensing, payments, KYC, age verification, jurisdictional compliance,
responsible-gaming controls). Real-money wagering is explicitly out of scope unless a future
revision of `AGENTS.md` states otherwise.

## Target users
- **Players**: register, log in, browse a lobby of demo games, play with virtual/demo credits,
  view transaction history.
- **Operators/Admins**: manage the game catalog, view players, adjust demo credits with an audit
  trail, view basic operational reporting.

## Functional requirements by phase

### Task 001 — Foundation (P0, this bootstrap)
- A user can register and log in (JWT-based auth).
- A database is connected and reachable (Prisma + SQLite for local/dev).
- A shared UI system (design tokens + base components) exists for the frontend.
- API conventions are documented and followed by all endpoints.
- Automated tests exist and pass for both the API and the web app.
- **Deliverable**: the app runs locally, users can register/login, and the database is connected.

### Task 002 — Demo Casino Vertical Slice (P1, next)
- A logged-in user can launch one playable demo game.
- Game outcomes are generated **server-side** using an auditable, seedable RNG — never trusted from
  the client.
- Demo-credit settlement (win/loss) is recorded through the Wallet module only.
- The transaction ledger reflects every settlement.
- A working game screen and lobby card exist in the frontend.
- **Deliverable**: a logged-in user can launch a demo game, play, receive a demo result, and see the
  transaction history.

### Task 003 — Admin + Casino Operations (P1, after Task 002)
- An operator can view and manage the game catalog.
- An operator can view players and adjust demo credits, with every adjustment audit-logged.
- Basic operational reporting is available.
- **Deliverable**: the operator can manage the demo casino without editing the database manually.

### P2 — Expansion (future)
Additional demo games, promotions, bonuses, loyalty, notifications, analytics, support system.

### P3 — Production readiness (future, only if the project proves the need)
Security hardening, compliance integrations, responsible-gaming controls, payment-provider
architecture, monitoring, backups, performance testing, deployment automation.

## Non-functional requirements
- No secrets, API keys, or credentials are ever committed to the repository.
- Every feature touching money-equivalent balances requires QA/Security review before merge.
- The system must remain runnable and testable without external paid services during development.

## Explicit non-goals (for now)
- No real-money deposits, withdrawals, or wagering.
- No custom LLM gateway, model-hosting system, or expensive agent infrastructure.
- No custom web dashboard, billing system, vector database, or message queue for TrueForge itself.
