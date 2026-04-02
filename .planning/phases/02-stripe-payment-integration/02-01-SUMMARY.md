---
phase: 02-stripe-payment-integration
plan: 01
subsystem: payments
tags: [stripe, singleton, typescript, vitest, tdd]

# Dependency graph
requires:
  - phase: 01-schema-and-data-model
    provides: Prisma schema with Filing model including stripePaymentIntentId and status fields
provides:
  - Stripe client singleton (src/lib/stripe.ts) with apiVersion 2026-02-25.clover
  - Unit tests verifying stripe instance, checkout sessions API, and webhooks API
affects:
  - 02-02-stripe-checkout-session (imports stripe from src/lib/stripe.ts)
  - 02-03-stripe-webhook-handler (imports stripe from src/lib/stripe.ts)
  - Any future Stripe API route in Phase 2+

# Tech tracking
tech-stack:
  added: []
  patterns: [module-level Stripe singleton with env var guard at startup]

key-files:
  created:
    - src/lib/stripe.ts
    - src/lib/stripe.test.ts
  modified: []

key-decisions:
  - "Module-level init (not globalThis lazy-init) because Stripe instances are lightweight and stateless — simpler than prisma.ts pattern"
  - "Guard throws at module load time so missing key surfaces at startup, not mid-request"

patterns-established:
  - "Stripe singleton pattern: module-level export with env guard throwing Error on missing key"
  - "TDD: test file written first (RED) then implementation to pass (GREEN)"

requirements-completed: [PAY-01]

# Metrics
duration: 2min
completed: 2026-04-01
---

# Phase 2 Plan 1: Stripe Client Singleton Summary

**Stripe singleton exported from src/lib/stripe.ts with apiVersion 2026-02-25.clover and startup env guard — 3 TDD unit tests passing**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-01T16:03:24Z
- **Completed:** 2026-04-01T16:05:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created src/lib/stripe.ts exporting a configured Stripe singleton with apiVersion 2026-02-25.clover
- Missing STRIPE_SECRET_KEY throws Error at module load time (not silently)
- 3 unit tests verifying: instance existence, checkout.sessions.create availability, webhooks.constructEvent availability

## Task Commits

Each task was committed atomically:

1. **Task 1: Write failing test stubs for stripe client (Wave 0)** - `b34820f` (test)
2. **Task 2: Implement stripe client singleton (GREEN)** - `141c721` (feat)

## Files Created/Modified
- `src/lib/stripe.ts` - Stripe singleton: module-level init with env guard and apiVersion config
- `src/lib/stripe.test.ts` - 3 unit tests for stripe instance, checkout sessions, and webhooks APIs

## Decisions Made
- Used module-level export (not globalThis pattern from prisma.ts) because Stripe instances are lightweight and stateless — no HMR concern
- Guard throws at module load time so STRIPE_SECRET_KEY absence surfaces at startup, not mid-request during checkout

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required at this step. STRIPE_SECRET_KEY will be required as an environment variable when running the application.

## Next Phase Readiness
- stripe singleton ready for import in 02-02 (checkout session API route) and 02-03 (webhook handler)
- All three plans in Wave 1 of Phase 02 can import from `src/lib/stripe`
- No blockers

## Self-Check: PASSED

- FOUND: src/lib/stripe.ts
- FOUND: src/lib/stripe.test.ts
- FOUND: .planning/phases/02-stripe-payment-integration/02-01-SUMMARY.md
- FOUND: b34820f (test commit)
- FOUND: 141c721 (feat commit)

---
*Phase: 02-stripe-payment-integration*
*Completed: 2026-04-01*
