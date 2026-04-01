---
phase: 04-phaxio-fax-integration-filing-pipeline
plan: 02
subsystem: webhooks
tags: [phaxio, webhook, hmac-sha1, fax-status, security]
dependency_graph:
  requires:
    - prisma.filing (faxId, faxStatus, faxCompletedAt, faxPages, status fields)
  provides:
    - src/lib/verify-phaxio-signature.ts (HMAC-SHA1 verification utility)
    - src/app/api/webhooks/phaxio/route.ts (Phaxio delivery webhook handler)
  affects:
    - Filing.faxStatus (updated on every delivery callback)
    - Filing.status (set to filed/failed on terminal fax statuses)
    - Filing.faxCompletedAt, Filing.faxPages (updated on completion)
tech_stack:
  added: []
  patterns:
    - HMAC-SHA1 webhook signature verification with crypto.timingSafeEqual
    - multipart/form-data parsing via request.formData() in App Router
    - verify-before-write security pattern (signature check before DB access)
key_files:
  created:
    - src/lib/verify-phaxio-signature.ts
    - src/lib/__tests__/verify-phaxio-signature.test.ts
    - src/app/api/webhooks/phaxio/route.ts
    - src/lib/__tests__/phaxio-webhook.test.ts
  modified: []
decisions:
  - "Used crypto.timingSafeEqual wrapped in try/catch to handle length-mismatch edge case without throwing"
  - "Extracted HMAC verification into standalone verifyPhaxioSignature() utility for testability"
  - "Terminal status check uses TERMINAL_STATUSES const for explicit documentation of all terminal values"
  - "NEXT_PUBLIC_APP_URL used to construct callbackUrl so webhook URL matches what Phaxio was configured with"
metrics:
  duration: "~5 minutes"
  completed_date: "2026-04-01"
  tasks_completed: 2
  files_created: 4
  files_modified: 0
---

# Phase 04 Plan 02: Phaxio Webhook Handler Summary

**One-liner:** HMAC-SHA1 verified Phaxio delivery webhook that parses multipart form data and updates Filing.faxStatus, faxCompletedAt, faxPages on delivery callbacks.

## What Was Built

### verifyPhaxioSignature() utility (FAX-09)

`src/lib/verify-phaxio-signature.ts` implements the full Phaxio HMAC-SHA1 algorithm:
1. Start with callback URL
2. Sort POST param keys, concatenate key+value
3. Optionally sort file SHA1 digests, concatenate (for callbacks with file parts)
4. Compute HMAC-SHA1 with the callback token
5. Compare to received `X-Phaxio-Signature` header using `crypto.timingSafeEqual`

The `try/catch` around `timingSafeEqual` handles the length-mismatch case (short/invalid hex signatures) without throwing.

### Phaxio webhook route (FAX-04)

`src/app/api/webhooks/phaxio/route.ts` handles `POST /api/webhooks/phaxio`:
- Fails fast if `PHAXIO_CALLBACK_TOKEN` is not set (500)
- Parses multipart form data with `request.formData()` — not `request.json()`
- Verifies HMAC-SHA1 signature **before** any database access
- Updates `Filing.faxStatus`, `faxPages`, `faxCompletedAt` on valid callbacks
- Sets `Filing.status = 'filed'` on `status=success`
- Sets `Filing.status = 'failed'` on `status=failure`
- Returns `400` with no DB writes for invalid signatures

## Test Coverage

| File | Tests | Coverage |
|------|-------|----------|
| verify-phaxio-signature.test.ts | 5 | known vectors, true/false, length mismatch, empty fields |
| phaxio-webhook.test.ts | 5 | success/failure status, invalid sig, missing fax_id, missing token |

All 10 tests pass.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data paths wired. The webhook reads real `PHAXIO_CALLBACK_TOKEN` from env, parses real multipart data, and writes to real Prisma Filing records.

## Self-Check: PASSED

- `src/lib/verify-phaxio-signature.ts` - FOUND
- `src/lib/__tests__/verify-phaxio-signature.test.ts` - FOUND
- `src/app/api/webhooks/phaxio/route.ts` - FOUND
- `src/lib/__tests__/phaxio-webhook.test.ts` - FOUND
- Commit `be9fb2f` (Task 1) - FOUND
- Commit `73689dd` (Task 2) - FOUND
