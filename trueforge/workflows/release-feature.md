# Workflow: Release Feature

**Final step of the build pipeline, after `review-feature.md` sign-off.**

1. Merge the task's branch(es) into `feat/digicasino-foundation` (or the current integration
   branch).
2. Re-run the full test suite on the merged result.
3. Push the branch to `origin` (https://github.com/ZeroCoolrules/digiCasino.git) and open a draft
   PR with a concise summary (what was implemented, files changed, tests run/results, known
   limitations, recommended next task).
4. Update `trueforge/tasks/completed.md` and `AGENT_TASKS.md`.

This workflow does not perform autonomous production deployment or live-money payment integration
— those remain explicitly out of scope (see `trueforge/README.md`, "What TrueForge is (v1)").
