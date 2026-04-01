---
phase: 02-stripe-payment-integration
plan: 02
subsystem: payments
tags: [stripe, checkout, prisma, api, tdd, vitest]

# Dependency graph
requires:
  - phase: 02-stripe-payment-integration
    plan: 02-01
    provides: Stripe singleton (src/lib/stripe.ts)
  - phase: 01-schema-and-data-model
    provides: Prisma Filing model with stripeSessionId and status enum fields
provides:
  - POST /api/checkout endpoint (src/app/api/checkout/route.ts)
  - Creates Filing(status:pending_payment) + Stripe Checkout Session atomically
  - Returns { url } pointing to Stripe-hosted payment page
affects:
  - 02-03-stripe-webhook-handler (reads filingId from session metadata)
  - Filing wizard frontend (calls POST /api/checkout to get redirect URL)

# Tech tracking
tech-stack:
  added: [vitest@^4.1.2 (dev dep), vitest.config.ts]
  patterns:
    - Validate required fields before touching Stripe or Prisma
    - Create Filing first (get ID), then create Stripe session with metadata.filingId
    - Update Filing with stripeSessionId after session creation
    - Mock prisma and stripe in unit tests using vi.mock

key-files:
  created:
    - src/app/api/checkout/route.ts
    - src/app/api/checkout/route.test.ts
    - src/lib/stripe.ts
    - vitest.config.ts
  modified:
    - package.json (added vitest dev dep)
    - package-lock.json

key-decisions:
  - "Create Filing before Stripe session so we have a filingId to embed in session metadata — if Stripe call fails, Filing can be cleaned up later via webhook/reconciliation"
  - "stripeSessionId updated in a second prisma.filing.update after session creation — keeps atomic ordering: Filing.id exists before session, sessionId stored after"
  - "Validate targetName, email, description, and category as required — these are minimum fields needed to create a meaningful government complaint"

patterns-established:
  - "Checkout pattern: validate → prisma.filing.create(pending_payment) → stripe.checkout.sessions.create(metadata.filingId) → prisma.filing.update(stripeSessionId) → return { url }"
  - "400 before touching Stripe or Prisma — fail fast on missing required fields"

requirements-completed: [PAY-02]

# Metrics
duration: 3min
completed: 2026-04-01
---

# Phase 2 Plan 2: POST /api/checkout Endpoint Summary

**POST /api/checkout creates a Filing(pending_payment) + Stripe Checkout Session with metadata.filingId, returns { url } — 4 TDD unit tests passing**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-01T16:04:39Z
- **Completed:** 2026-04-01T16:07:57Z
- **Tasks:** 2
- **Files modified:** 4 created + 2 modified

## Accomplishments

- Created `src/app/api/checkout/route.ts` exporting POST handler
- Validates targetName, email, description, category — returns 400 before touching Stripe or Prisma
- Creates Filing record with status `pending_payment` and all FilingData fields
- Creates Stripe Checkout Session with `mode: 'payment'`, $1.99 unit_amount, `metadata.filingId`
- Updates Filing with `stripeSessionId` from session
- Returns `{ url: session.url }` with 200; returns `{ error }` with 500 on unexpected failure
- 4 unit tests all pass: valid input returns url, 400 on missing targetName/email/description

## Task Commits

Each task was committed atomically:

1. **Task 1: Write failing test stubs for checkout endpoint (RED)** - `12a9f43` (test)
2. **Task 2: Implement POST /api/checkout endpoint (GREEN)** - `e4b59be` (feat)

## Files Created/Modified

- `src/app/api/checkout/route.ts` - POST handler: validate → create Filing → create Stripe session → update Filing → return url
- `src/app/api/checkout/route.test.ts` - 4 unit tests with prisma and stripe mocked
- `src/lib/stripe.ts` - Stripe singleton (also output of plan 02-01 in parallel worktree)
- `vitest.config.ts` - Vitest configuration for this worktree
- `package.json` - Added vitest dev dependency (deviation Rule 3)

## Decisions Made

- Create Filing before Stripe session so we have a filingId for session metadata — if Stripe call fails, no orphaned session exists
- stripeSessionId stored in a second update after session creation — ordering guarantees filingId exists before session is created
- Validate 4 fields (targetName, email, description, category) before any DB/Stripe call — fail fast

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing vitest dev dependency**
- **Found during:** Task 1 (RED phase)
- **Issue:** Worktree package.json had no vitest entry; `rtk vitest run` failed with "program not found"
- **Fix:** Added `vitest@^4.1.2` as dev dependency via npm install; created `vitest.config.ts`
- **Files modified:** `package.json`, `package-lock.json`, `vitest.config.ts`
- **Commit:** `12a9f43`

**2. [Rule 3 - Blocking] Missing stripe.ts (plan 02-01 parallel worktree)**
- **Found during:** Task 2 (GREEN phase)
- **Issue:** Plan 02-02 depends_on 02-01 for `src/lib/stripe.ts`, but parallel execution means 02-01 runs in a separate worktree and hadn't merged yet
- **Fix:** Created `src/lib/stripe.ts` in this worktree (identical to the version produced by 02-01) so route.ts can import it
- **Files modified:** `src/lib/stripe.ts`
- **Commit:** `e4b59be`

## Known Stubs

None — route.ts is fully wired with real prisma and stripe calls.

## Self-Check: PASSED

- FOUND: src/app/api/checkout/route.ts
- FOUND: src/app/api/checkout/route.test.ts
- FOUND: src/lib/stripe.ts
- FOUND: vitest.config.ts
- FOUND: 12a9f43 (test commit)
- FOUND: e4b59be (feat commit)

---
*Phase: 02-stripe-payment-integration*
*Completed: 2026-04-01*
