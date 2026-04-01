---
phase: 04-phaxio-fax-integration-filing-pipeline
plan: 03
subsystem: filing-pipeline
tags: [pipeline, orchestration, stripe-webhook, fax, pdf, idempotency]
dependency_graph:
  requires:
    - 04-01 (phaxio.ts rewrite, agency-directory.ts, filerInfo schema)
    - 03-01 (generateComplaintPdf)
    - 03-02 (storeComplaintPdf)
  provides:
    - executeFilingPipeline() orchestrator (PIPE-01 through PIPE-06)
    - Stripe webhook with pipeline trigger (PIPE-02)
    - FAX-03 faxId/faxStatus writes after successful send
  affects:
    - 05-receipt-email (Phase 5 will replace email stub)
tech_stack:
  added: []
  patterns:
    - Pipeline orchestration with isolated failure domains
    - TDD (RED -> GREEN -> fix TypeScript)
    - Idempotency guard via DB status check
key_files:
  created:
    - src/lib/filing-pipeline.ts
    - src/lib/__tests__/filing-pipeline.test.ts
  modified:
    - src/app/api/webhooks/stripe/route.ts
    - src/app/api/webhooks/stripe/route.test.ts
decisions:
  - Direct pipeline call from Stripe webhook — no queue needed at this volume
  - Fax failure isolated in try/catch so email stub always runs (PIPE-05)
  - Idempotency updated to skip status != pending_payment/draft (not just != paid)
  - axios.get for evidence download per FAX-08 (no native fetch)
metrics:
  duration: "5 minutes"
  completed_date: "2026-04-01"
  tasks_completed: 2
  files_created: 2
  files_modified: 2
---

# Phase 4 Plan 3: Filing Pipeline Orchestrator Summary

**One-liner:** Filing pipeline orchestrates PDF generation -> Vercel Blob storage -> Phaxio fax send with isolated failure domains, FAX-03 faxId writes, and axios evidence download.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing pipeline tests | 408b6d1 | src/lib/__tests__/filing-pipeline.test.ts |
| 1 (GREEN) | executeFilingPipeline orchestrator | 0e05113 | src/lib/filing-pipeline.ts |
| 2 | Stripe webhook wiring + maxDuration | 6853079 | src/app/api/webhooks/stripe/route.ts, route.test.ts |
| Fix | TypeScript tuple type fix in tests | 5b14971 | src/lib/__tests__/filing-pipeline.test.ts |

## What Was Built

### `src/lib/filing-pipeline.ts`

The core filing lifecycle orchestrator — called after Stripe payment confirmation. Steps:

1. **Idempotency guard (PIPE-06):** Re-fetches Filing from DB. If `status !== 'paid'`, returns immediately.
2. **FilerInfo extraction:** Reads `filing.filerInfo` JSON field (stored at checkout) and maps to `FilerInfo` interface.
3. **PDF generation (PIPE-03):** Updates status to `generating`, calls `generateComplaintPdf(filing, filerInfo)`.
4. **PDF storage:** Calls `storeComplaintPdf(filingId, filingReceiptId, pdfBytes)` to upload to Vercel Blob.
5. **Fax send (PIPE-03):** Updates status to `filing`, builds `FaxFile[]` array (complaint PDF + optional evidence). Evidence downloaded via `axios.get(url, { responseType: 'arraybuffer' })` per FAX-08. Calls `sendFax(agencyFaxNumber, files)`.
6. **FAX-03 write:** On successful fax, updates `faxId = String(faxResult.data.id)`, `faxStatus = 'queued'`, `faxSentAt`, `status = 'filed'`.
7. **Fax failure isolation (PIPE-05):** `faxFailed = true` flag set in catch block; Filing status set to `failed`. Email stub runs regardless.
8. **Email stub:** Logs stub message (Phase 5 will implement `sendFilingReceiptEmail`).

### `src/app/api/webhooks/stripe/route.ts`

- Added `export const maxDuration = 60` at file top (required for Vercel long-running routes).
- Added `import { executeFilingPipeline } from '@/lib/filing-pipeline'`.
- Updated idempotency guard: skips if `status !== 'pending_payment' && status !== 'draft'` (previously only skipped on `status === 'paid'`, which would re-run the pipeline on webhook retries after pipeline started).
- Added `await executeFilingPipeline(filingId)` in a try/catch after the `paid` update — webhook returns 200 regardless of pipeline outcome.

## Tests

10 tests pass in `src/lib/__tests__/filing-pipeline.test.ts`:
- Pipeline call order (generate -> store -> fax)
- Status lifecycle transitions (generating -> filing -> filed)
- Idempotency (status != paid causes immediate return)
- Null filing handling
- PDF failure -> status=failed, fax not called
- Fax failure -> status=failed, email stub still runs
- Evidence file: axios.get called, sendFax gets 2-element array
- FilerInfo extraction from JSON field
- FAX-03: faxId='99999' and faxStatus='queued' written on success
- FAX-08: axios.get called with responseType: 'arraybuffer'

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing mock] Added vi.mock for filing-pipeline in Stripe webhook tests**
- **Found during:** Task 2 verification
- **Issue:** `route.test.ts` imports `route.ts` which now imports `filing-pipeline.ts` which imports `axios`. Tests failed with "Cannot find package 'axios'" because axios wasn't installed in worktree node_modules.
- **Fix:** Ran `npm install` to install dependencies, added `vi.mock('@/lib/filing-pipeline')` to `route.test.ts`.
- **Files modified:** `src/app/api/webhooks/stripe/route.test.ts`
- **Commit:** 6853079

**2. [Rule 1 - TypeScript] Fixed tuple type annotations in test file**
- **Found during:** TypeScript check
- **Issue:** `call: [{ where: unknown; data: { status: string } }]` tuple annotations caused TS2345 errors — TypeScript inferred `any[][]` from vi.fn mock calls, which is not assignable to tuple.
- **Fix:** Changed all mock call type annotations to `any[]`.
- **Files modified:** `src/lib/__tests__/filing-pipeline.test.ts`
- **Commit:** 5b14971

### Pre-existing Issues (Out of Scope)

Documented in deferred items:
- `src/app/api/webhooks/phaxio/route.ts(24)`: TS2802 FormDataIterator downlevelIteration (from plan 04-02)
- `src/lib/submit-fax.ts(30)`: TS2554 wrong argument count (pre-existing from before phase 04)
- `src/app/api/checkout/route.ts(48)`: TS2353 filerInfo type mismatch (from plan 04-01 — Prisma type not regenerated)

These are not caused by plan 04-03 changes.

## Known Stubs

- **Email step** (`src/lib/filing-pipeline.ts` line ~100): `console.log('[pipeline] Receipt email stub...')` — intentional stub. Phase 5 will implement `sendFilingReceiptEmail`. This does not block the plan's goal (pipeline executes correctly; email is Phase 5 scope).

## Self-Check: PASSED

- `src/lib/filing-pipeline.ts` exists: FOUND
- `src/lib/__tests__/filing-pipeline.test.ts` exists: FOUND  
- `src/app/api/webhooks/stripe/route.ts` modified: FOUND
- Commits 408b6d1, 0e05113, 6853079, 5b14971: FOUND in git log
- `npx vitest run src/lib/__tests__/filing-pipeline.test.ts`: 10/10 PASSED
- `filing-pipeline.ts` has `import axios from 'axios'`: VERIFIED
- `filing-pipeline.ts` has `axios.get(filing.evidenceFileUrl`: VERIFIED
- No `await fetch(filing.evidenceFileUrl` in filing-pipeline.ts: VERIFIED
- `webhooks/stripe/route.ts` starts with `export const maxDuration = 60`: VERIFIED
- `webhooks/stripe/route.ts` calls `await executeFilingPipeline(filingId)`: VERIFIED
- `webhooks/stripe/route.ts` has `!== 'pending_payment'` idempotency guard: VERIFIED
