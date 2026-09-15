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
- **Task 001 — Foundation**: IN PROGRESS (this bootstrap). Owner sequence: Architect (orchestrator,
  this pass) → Backend + Frontend (parallel child agents) → QA (orchestrator, post-merge).
- **Task 002 — Demo Casino Vertical Slice**: BACKLOG (queued next).
- **Task 003 — Admin + Casino Operations**: BACKLOG (queued after Task 002).

## Agent roles
See `trueforge/agents/*.md` for the full definition of each role (mission, responsibilities, owned
files, definition of done, handoff requirements): orchestrator, architect, frontend, backend,
game-engine, wallet-ledger, admin-operations, security-compliance, qa-devops.

## Dispatching a task
Use the reusable prompt in `trueforge/workflows/task-prompt-template.md`, filling in
`{{agent_role}}`, `{{task_id}}`, `{{task_title}}`, `{{task_description}}` from the relevant entry in
`trueforge/tasks/backlog.md`.
