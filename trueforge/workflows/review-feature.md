# Workflow: Review Feature

**Stage 4 (part 2) / Stage 5 of the build pipeline. Owners: QA/Security, then Orchestrator.**

1. QA/Security checks the diff against `AGENTS.md` architecture rules: module boundaries respected,
   wallet mutations only via the wallet module, server-side game outcomes, server-side
   authorization, no committed secrets.
2. QA/Security checks for regressions using the results from `test-feature.md`.
3. For wallet, auth, or game-outcome changes, QA/Security sign-off is mandatory before merge (see
   `AGENTS.md` quality gates).
4. Orchestrator reviews the overall diff for architecture compliance and duplicated work.
5. Orchestrator moves the task from `trueforge/tasks/review.md` to
   `trueforge/tasks/completed.md`, updates `AGENT_TASKS.md` and `PROJECT_STATUS.md`, and selects the
   next unblocked task from `trueforge/tasks/backlog.md`.

A task is only `COMPLETED` after this workflow finishes — never merely because code was written.
