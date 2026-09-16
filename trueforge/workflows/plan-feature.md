# Workflow: Plan Feature

**Stage 1 of the build pipeline. Owner: Architect.**

1. Read `PRODUCT_REQUIREMENTS.md` for the feature's requirements and `SYSTEM_ARCHITECTURE.md` for
   current architecture.
2. Define/extend the schema and API contract needed for the feature.
3. Write explicit acceptance criteria (what "done" looks like, testable).
4. Record any non-trivial decision in `trueforge/decisions/architecture-decisions.md`.
5. Update `trueforge/tasks/backlog.md` with the task's dependencies, expected files, acceptance
   criteria, and test requirements if not already present.
6. Hand off to Backend/Frontend (and Game/Wallet if applicable) using
   `trueforge/workflows/task-prompt-template.md`.

Exit criteria: Backend and Frontend (and Game/Wallet, if applicable) can start implementing without
needing to ask the Architect clarifying questions about the contract.
