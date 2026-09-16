# digiCasino — Compliance Readiness

## Current scope: demo/virtual ledger only
digiCasino currently operates on a **demo/virtual credit ledger only**. There is no real-money
wagering, deposit, or withdrawal functionality, and none is planned until this document is
explicitly revised alongside `AGENTS.md`. As such, most licensing, payments, KYC, age-verification,
and jurisdictional gambling regulations do not yet apply.

## Why this matters architecturally
Building the demo/social-casino MVP first (Task 001–003) lets the product, UX, game engagement, and
operator workflows be validated before taking on the much heavier compliance surface of regulated
real-money gambling. This is a deliberate sequencing choice, not an oversight.

## Baseline hygiene enforced now (even for a demo product)
- No secrets, API keys, or credentials are committed to the repository.
- Passwords are hashed (bcrypt), never stored or logged in plaintext.
- All balance mutations flow through the Wallet module, producing an append-only ledger — this
  gives us an audit trail from day one, even though funds are virtual.
- Game outcomes are generated server-side with an auditable, seedable RNG.

## Deferred until there is a demonstrated need (P3 backlog)
- Real-money payment-provider integration.
- KYC / identity verification.
- Age verification.
- Jurisdiction-specific licensing and geofencing.
- Responsible-gaming controls (deposit limits, self-exclusion, etc.).
- Formal security audit and penetration testing.
- Monitoring, alerting, and backup/DR procedures for production data.

## Trigger for revisiting this document
Re-open this document (and get explicit QA/Security + product-owner sign-off) before any of the
following: introducing real-money balances, connecting a live payment provider, or deploying to a
publicly reachable production environment.
