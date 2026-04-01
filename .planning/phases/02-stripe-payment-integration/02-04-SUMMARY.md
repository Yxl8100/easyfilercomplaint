---
phase: 02-stripe-payment-integration
plan: "04"
subsystem: ui
tags: [stripe, react, nextjs, wizard, checkout]

# Dependency graph
requires:
  - phase: 02-stripe-payment-integration/02-02
    provides: POST /api/checkout endpoint that creates Filing + Stripe session and returns redirect URL
provides:
  - Wizard final step (step 4) wired to POST /api/checkout with full FilingData
  - Browser hard-redirect to Stripe-hosted checkout on success
  - Loading state "Redirecting to Stripe..." with disabled button
  - Error callout labeled "PAYMENT ERROR" on failure
  - Fixed $1.99 cost breakdown replacing per-agency variable rows
  - Attestation callout on step 4
affects:
  - 02-05-stripe-payment-integration (success page — step 5 is now unreachable from wizard)
  - ui, payments

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Payment-gated wizard: POST /api/checkout → window.location.href for hard redirect (not Next.js router)"
    - "Loading state via text change only (no spinner), button disabled during in-flight request"
    - "Error callout with semantic label (PAYMENT ERROR) and descriptive body text"

key-files:
  created: []
  modified:
    - src/app/file/[category]/page.tsx

key-decisions:
  - "Used window.location.href for Stripe redirect — Next.js router.push cannot navigate to external domains"
  - "Removed SubmissionResult import and submissionResults state — no longer used after replacing /api/submit with /api/checkout"
  - "Step 5 confirmation block left as static UI — it is no longer reachable from the new payment flow"

patterns-established:
  - "External redirect pattern: fetch API endpoint → hard-redirect via window.location.href"
  - "In-flight UX: text-only loading state (no spinner), disabled CTA, error callout with mono uppercase label"

requirements-completed: [PAY-06]

# Metrics
duration: checkpoint-gated (human verification)
completed: 2026-04-01
---

# Phase 02 Plan 04: Stripe Checkout Redirect Summary

**Wizard step 4 rewired from /api/submit to /api/checkout with hard-redirect to Stripe-hosted payment page and fixed $1.99 cost display**

## Performance

- **Duration:** Checkpoint-gated (human verification required)
- **Started:** 2026-04-01
- **Completed:** 2026-04-01
- **Tasks:** 1 auto + 1 checkpoint (human-verify, approved)
- **Files modified:** 1

## Accomplishments
- Replaced `handleSubmit` to POST to `/api/checkout` instead of `/api/submit`
- On success, `window.location.href = result.url` hard-redirects to Stripe Checkout
- Loading state shows "Redirecting to Stripe..." with disabled CTA button
- Error callout changed from "Submission Error" to "PAYMENT ERROR" label
- Cost breakdown replaced: removed per-agency rows, replaced with single "Privacy Complaint Filing — $1.99" line item
- Attestation callout added to step 4 after filing summary card
- Removed now-unused `SubmissionResult` import and `submissionResults` state variable
- StepHeader updated: step=5, title="Review & Pay", description="Your complaint is ready. Complete payment to file."

## Task Commits

1. **Task 1: Rewire wizard step 4 to POST /api/checkout and redirect** - `deb11cc` (feat)
2. **Task 2 (Checkpoint): Human verification — Stripe Checkout redirect** — Approved by user

**Plan metadata:** _(docs commit — see below)_

## Files Created/Modified
- `src/app/file/[category]/page.tsx` - Wizard page: handleSubmit rewired to /api/checkout, step 4 UI updated (cost breakdown, attestation, error label, CTA label), SubmissionResult removed

## Decisions Made
- Used `window.location.href` for the Stripe redirect — Next.js `router.push` cannot navigate to external domains (checkout.stripe.com)
- Removed `SubmissionResult` import and state since step 5 is no longer reachable after payment gating
- Step 5 confirmation block retained as static UI for future use (success page handled by 02-05)

## Deviations from Plan

None — plan executed exactly as written. Human verification checkpoint approved.

## Issues Encountered

None.

## User Setup Required

None — no new external service configuration required. STRIPE_SECRET_KEY and NEXT_PUBLIC_APP_URL must be set (configured in prior plans 02-01 and 02-02).

## Next Phase Readiness
- Wizard is end-to-end wired: user completes wizard → POST /api/checkout creates Filing + Stripe session → browser redirects to Stripe-hosted checkout
- Plan 02-05 (success/receipt page) was completed separately and handles the post-payment confirmation flow
- Phase 02 Stripe Payment Integration is complete

---
*Phase: 02-stripe-payment-integration*
*Completed: 2026-04-01*
