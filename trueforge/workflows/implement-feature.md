# Workflow: Implement Feature

**Stages 2–3 of the build pipeline. Owners: assigned specialist(s).**

## The recommended build pipeline
1. **Architect** defines the feature, schema, API contract, and acceptance criteria (see
   `plan-feature.md`).
2. **Backend + Frontend** work on independent parts of the same approved feature. Run in parallel
   only when their interface is already clear (i.e. Architect's contract is finalized).
3. **Game / Wallet specialist** implements the game or financial domain when the feature requires
   it (only for tasks like Task 002 that touch games or settlement).
4. **QA / Security** tests the complete flow, checks permissions, and identifies regressions (see
   `test-feature.md`).
5. **Orchestrator** reviews, updates the task registry, and selects the next task (see
   `review-feature.md`).

## Example: building the first demo game (Task 002)
| Order | Agent | Task |
|---|---|---|
| 1 | Architect | Define game session, game, and demo transaction schema |
| 2 | Backend | Implement game session APIs |
| 3 | Game Engine | Implement one demo game |
| 4 | Wallet | Implement controlled demo-credit settlement |
| 5 | Frontend | Build the game screen and lobby card |
| 6 | QA | Test login → game → result → ledger |
| 7 | Orchestrator | Review and mark complete |

## Implementation requirements (every task)
1. Inspect existing code first.
2. Identify the files that need to change.
3. Implement the smallest maintainable solution.
4. Add tests for important behavior.
5. Run the appropriate build, lint, type-check, and test commands.
6. Fix issues you introduce.
7. Update relevant documentation.
8. Report the exact files changed.

## Rules
- Do not rewrite unrelated code.
- Do not change architecture without documenting the decision.
- Do not duplicate an existing service.
- Do not modify another agent's owned files without checking dependencies with the Orchestrator.
- Do not add fake production integrations.
- Do not mark a task complete without validation (see `test-feature.md`).

Exit criteria: implementation matches the Architect's contract, builds/lints/type-checks cleanly,
and is ready for `test-feature.md`.
