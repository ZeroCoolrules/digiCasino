# digiCasino — Agent Tasks

This is the top-level pointer into the TrueForge task registry. The authoritative, per-status task
lists live under `trueforge/tasks/`:

- `trueforge/tasks/backlog.md` — not-yet-started tasks, in priority order (Task 001/002/003 first,
  then the rest of the P0–P3 backlog).
- `trueforge/tasks/in-progress.md` — tasks currently being implemented.
- `trueforge/tasks/review.md` — implemented tasks pending QA/Security or Orchestrator review.
- `trueforge/tasks/completed.md` — tasks that have passed review and are done.

## Task lifecycle
```
BACKLOG → READY → IN PROGRESS → IMPLEMENTED → TESTING → REVIEW → COMPLETED
```
A task is never marked `COMPLETED` merely because code was written — see
`trueforge/workflows/test-feature.md` and `trueforge/workflows/review-feature.md`.

## Current top-level status
- **Task 001 — Foundation**: COMPLETED. Implemented by Architect (orchestrator) → Backend +
  Frontend (parallel child agents) → Orchestrator (merge, API-contract reconciliation, QA). Full
  test suite green (API 12/12, Web 11/11); lint and build clean for both workspaces.
- **Task 002 — Demo Casino Vertical Slice**: COMPLETED. Architect stage (schema/contract) by the
  orchestrator; backend and frontend implemented directly by the orchestrator after the assigned
  child agents became unreachable (see `trueforge/tasks/completed.md`). Full test suite green
  (API 25/25, Web 15/15); lint, build, and a live end-to-end smoke test all passed.
- **Task 003 — Admin + Casino Operations**: COMPLETED. Architect stage (schema/contract) by the
  orchestrator; backend and frontend each implemented by a dedicated child agent in parallel
  (both completed successfully, no contract drift). Full test suite green (API 38/38, Web 22/22);
  lint, build, and a live end-to-end smoke test all passed.

All three vertical-slice tasks (001–003) are now complete. Remaining work is P1's leftover
"Player profile" item plus the P2/P3 backlog in `trueforge/tasks/backlog.md`.

## Agent roles
See `trueforge/agents/*.md` for the full definition of each role (mission, responsibilities, owned
files, definition of done, handoff requirements): orchestrator, architect, frontend, backend,
game-engine, wallet-ledger, admin-operations, security-compliance, qa-devops.

## Dispatching a task
Use the reusable prompt in `trueforge/workflows/task-prompt-template.md`, filling in
`{{agent_role}}`, `{{task_id}}`, `{{task_title}}`, `{{task_description}}` from the relevant entry in
`trueforge/tasks/backlog.md`.
