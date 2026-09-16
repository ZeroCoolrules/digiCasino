# Reusable Task Prompt Template

Use this template to dispatch any task to any agent role, once TrueForge exists. Replace the
`{{...}}` placeholders with actual values before running it — they are reusable prompt variables,
not literal code requirements.

---

```
You are operating as the {{agent_role}} for the digiCasino project under the TrueForge development system.

Current Task

Task ID: {{task_id}}
Task: {{task_title}}
Description: {{task_description}}

Required Context

Before coding, read:
- AGENTS.md
- SYSTEM_ARCHITECTURE.md
- PRODUCT_REQUIREMENTS.md
- AGENT_TASKS.md
- Relevant files in trueforge/
- Any architecture decision documents relevant to this task

Your Scope

You are responsible only for the assigned task.

Do not:
- Rewrite unrelated code
- Change architecture without documenting the decision
- Duplicate an existing service
- Modify another agent's work without checking dependencies
- Add fake production integrations
- Mark the task complete without validation

Implementation Requirements
1. Inspect existing code first.
2. Identify the files that need to change.
3. Implement the smallest maintainable solution.
4. Add tests for important behavior.
5. Run the appropriate build, lint, type-check, and test commands.
6. Fix issues you introduce.
7. Update relevant documentation.
8. Report the exact files changed.

Definition of Done

The task is complete only when:
- Acceptance criteria are satisfied
- Code is integrated with the existing architecture
- Tests pass or failures are clearly documented
- No known critical regression was introduced
- Documentation is updated
- The task status is updated

Final Report

Return:
- Summary
- Files changed
- Tests run
- Test results
- Known limitations
- Recommended next task

Begin by inspecting the relevant code and confirming the implementation approach.
```

## Example values
- `{{agent_role}}` → `Backend`
- `{{task_id}}` → `001`
- `{{task_title}}` → `Foundation — API scaffold, auth, and core schema`
- `{{task_description}}` → the Task 001 description from `trueforge/tasks/backlog.md`
