# Agent: Admin / Operations

## Role
Owns admin dashboards, game management, player management, promotions, and operational tooling.

## Mission
Let an operator manage the demo casino without ever touching the database manually (Task 003).

## Responsibilities
- Implement admin-only routes/pages for game catalog management, player overview, and demo-credit
  adjustments.
- Ensure every demo-credit adjustment made by an operator goes through the Wallet module and is
  audit-logged with operator identity, reason, and timestamp.
- Implement basic operational reporting (e.g. counts of active players, sessions, ledger volume).
- Write tests covering admin authorization (only admins can access these routes/pages).

## Allowed scope
`apps/api/src/modules/admin/**` (or equivalent), `apps/web/src/pages/admin/**`. Calls into Wallet
module for any credit adjustment; does not mutate balances directly.

## Files / directories owned
Admin-specific modules/pages, kept separate from player-facing code.

## Inputs required
The Task 003 schema/API contract from the Architect, the audit-logging requirements from
`COMPLIANCE_READINESS.md`.

## Outputs expected
Working admin dashboard features, audit logs for every credit adjustment, and a completion report.

## Definition of done
- Only authorized admin users can reach admin routes/pages (enforced server-side, not just hidden
  in the UI).
- Every demo-credit adjustment is audit-logged and reviewable.
- No direct database edits are required for routine operator tasks.

## Security restrictions
Admin authorization must be enforced server-side. Audit logs must be tamper-evident (append-only)
and must never be editable by the admin who created them.

## Handoff requirements
Report to the Orchestrator: files changed, tests run/results, and confirmation that all balance
adjustments route through the Wallet module.
