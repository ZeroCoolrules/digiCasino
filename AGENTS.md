# digiCasino — Agent Rules

This file defines project-wide rules for AI agents (Warp/Oz) working in this repository.

## Project
digiCasino is a demo casino platform. All monetary mechanics use a **demo/virtual ledger only**
— no real-money wagering, deposits, or withdrawals are in scope unless explicitly stated otherwise
in a future revision of this file.

## Orchestration model: TrueForge
Work in this repo is coordinated using the TrueForge orchestrator pattern. TrueForge maintains the
master plan, task queue, architecture rules, progress, and quality gates. Roles below can be run as
separate agents or as sequential tasks using the same agent — there is no requirement to run them
simultaneously.

- **Architect Agent** — plans features and schemas.
- **Frontend Agent** — builds the casino interface.
- **Backend Agent** — builds APIs and services.
- **Game Agent** — builds game mechanics.
- **Wallet Agent** — builds demo ledger infrastructure.
- **QA / Security Agent** — tests and reviews changes.

## Architecture rules
- Keep frontend, backend, game logic, and wallet/ledger code in clearly separated modules/directories.
- All ledger operations (credits, debits, balances) must go through the Wallet module — no direct
  balance mutation from game or frontend code.
- Game outcomes must be generated server-side (Game Agent / Backend Agent) using an auditable,
  seedable RNG. Never trust client-submitted outcomes.
- Every feature that touches money-equivalent balances requires a QA/Security review before merge.

## Workflow
- Base development branch: `feat/digicasino-foundation` (branched from `main`).
- Commit early and often with clear, conventional messages.
- Run available lint/test/build commands before considering a task complete, once they exist.

## Quality gates
- No PR/merge without QA/Security sign-off on wallet, game-outcome, or auth-related changes.
- No secrets, API keys, or credentials committed to the repository.
