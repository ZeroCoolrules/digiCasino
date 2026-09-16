# Workflow: Test Feature

**Stage 4 (part 1) of the build pipeline. Owner: QA/DevOps.**

1. Run the full test suite for every workspace touched by the task (`apps/api`, `apps/web`).
2. Verify migrations apply cleanly and the health check endpoint responds, if the database or
   server changed.
3. Validate the task's specific acceptance criteria end-to-end (e.g. for Task 001: register → login
   → fetch profile).
4. Record exact commands run and their results.
5. If failures are found, report them to the owning agent rather than silently patching another
   agent's module.

A task cannot move to `review-feature.md` until this workflow has produced a pass, or an explicitly
documented and accepted list of known limitations.
