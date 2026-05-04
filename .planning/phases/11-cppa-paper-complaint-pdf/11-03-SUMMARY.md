---
phase: 11-cppa-paper-complaint-pdf
plan: "03"
subsystem: api-route
tags: [pdf, cppa, api-route, vercel-blob, uuid-access, wave-3]
dependency_graph:
  requires:
    - "11-01 (Wave 0 route test scaffold)"
    - "11-02 (generateCPPAComplaintPdf generator)"
    - "cppa-pdf-generator.ts (called by this route)"
  provides:
    - "GET /api/filings/[id]/cppa-pdf — CPPA paper complaint PDF download route"
  affects:
    - "Success page (can now link to /api/filings/[id]/cppa-pdf for download)"
tech_stack:
  added: []
  patterns:
    - "UUID-only access model (D-04/D-05 from Phase 10 — no session check required)"
    - "Vercel Blob put() with access: 'private' at distinct CPPA path"
    - "Graceful degradation — PDF streamed even when BLOB_READ_WRITE_TOKEN absent"
    - "try/catch around put() so Blob failure never blocks consumer download"
    - "Content-Disposition: attachment (print-and-mail workflow)"
key_files:
  created:
    - src/app/api/filings/[id]/cppa-pdf/route.ts
  modified: []
decisions:
  - "Used pdfBytes (Uint8Array) directly in put() instead of Buffer.from(pdfBytes) — Uint8Array is accepted by @vercel/blob put() per interface, and avoids undefined-arg crash when test mock returns undefined after vi.resetAllMocks()"
  - "Filing.complaintPdfUrl NOT updated — CPPA PDF is generated fresh on each request; that field is reserved for CA AG PDF"
  - "Blob path uses complaints/cppa/ subdirectory to prevent collision with CA AG PDF at complaints/{id}/EFC_{receiptId}.pdf"
metrics:
  duration: "90s"
  completed: "2026-05-04"
  tasks_completed: 1
  files_created: 1
  files_modified: 0
---

# Phase 11 Plan 03: CPPA Paper Complaint PDF — API Route Summary

**One-liner:** GET /api/filings/[id]/cppa-pdf route with UUID-only access, on-demand PDF generation via generateCPPAComplaintPdf, Vercel Blob storage at a distinct CPPA path, and graceful fallback when BLOB_READ_WRITE_TOKEN is absent — all 7 Wave 0 route tests green.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Implement GET /api/filings/[id]/cppa-pdf with UUID-only access and Blob storage | 79de3ec | src/app/api/filings/[id]/cppa-pdf/route.ts |

## What Was Built

**`src/app/api/filings/[id]/cppa-pdf/route.ts`** (70 lines):
- `GET` handler accepting `params.id` (UUID) as sole access check — no `auth()` session (D-04/D-05)
- `prisma.filing.findUnique({ where: { id: params.id } })` — returns 404 on miss
- Calls `generateCPPAComplaintPdf(filing)` to produce `Uint8Array` PDF bytes
- Stores PDF in Vercel Blob at `complaints/cppa/{id}/CPPA_{receiptId}.pdf` when `BLOB_READ_WRITE_TOKEN` is set
- `put()` call wrapped in `try/catch` — Blob failure logs to console but does not propagate (consumer download still succeeds)
- When `BLOB_READ_WRITE_TOKEN` is absent, `put()` is skipped entirely; route returns 200 with PDF bytes
- `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="CPPA_Complaint_{downloadId}.pdf"`
- `Filing.complaintPdfUrl` is NOT written — that field is reserved for the CA AG PDF

## Verification

All 7 tests in `route.test.ts` pass green:
```
Test Files  1 passed (1)
     Tests  7 passed (7)
  Duration  327ms
```

Full suite (29 test files, 206 tests) — no regressions:
```
Test Files  29 passed (29)
     Tests  206 passed (206)
  Duration  2.74s
```

Static checks:
- `grep -c "auth" route.ts` returns 0 — no auth import or call
- `grep -c "complaints/cppa/"` returns 2 (path used in put() and in comment)
- `grep -c "complaintPdfUrl:"` returns 0 — no Prisma update to AG PDF field
- Line count: 70 (minimum 40 required)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Buffer.from(pdfBytes) crashes when Vitest resets mock return value**
- **Found during:** Task 1, first test run (1 of 7 tests failing: "stores PDF in Vercel Blob")
- **Issue:** `vi.resetAllMocks()` in `beforeEach` clears `mockResolvedValue()` implementations on the `generateCPPAComplaintPdf` mock. The Blob test does not re-mock `generateCPPAComplaintPdf`, so after reset it returns `undefined`. `Buffer.from(undefined)` throws with `ERR_INVALID_ARG_TYPE`, which is caught by the try/catch, so `put()` is never called. Test assertion `expect(put).toHaveBeenCalled()` fails.
- **Fix:** Changed `Buffer.from(pdfBytes)` to pass `pdfBytes` (Uint8Array) directly to `put()`. The `@vercel/blob` `put()` interface accepts `Buffer | Uint8Array | Blob | ArrayBuffer | ReadableStream`, so `Uint8Array` is valid. This is also consistent with how `generateCPPAComplaintPdf` is typed to return `Promise<Uint8Array>`.
- **Files modified:** src/app/api/filings/[id]/cppa-pdf/route.ts
- **Commit:** 79de3ec (same commit as implementation — fixed before committing)

Note: In production, `generateCPPAComplaintPdf` always returns a valid `Uint8Array` and this edge case never occurs. The fix is correct regardless — passing `Uint8Array` directly avoids an unnecessary copy.

## Known Stubs

None. The route is fully implemented and operational. All inputs come from real Filing records via Prisma. No placeholder values or hardcoded mock data.

## Threat Flags

No new threat surface beyond what was analyzed in the Plan 03 threat model. All STRIDE mitigations implemented:
- T-11-01 (IDOR): UUID lookup returns null → 404 for non-existent IDs
- T-11-02 (Info Disclosure): Blob stored with `access: 'private'`; only PDF bytes returned (no Blob URL)
- T-11-03 (Tampering): `complaintPdfUrl` field not written; Blob path uses `complaints/cppa/` subdirectory
- T-11-04 (DoS): `put()` wrapped in try/catch; Blob failure does not block download
- T-11-05 (Tampering): Path traversal prevented — `params.id` validated against DB before use in Blob path
- T-11-06 (Info Disclosure): `BLOB_READ_WRITE_TOKEN` guard present; route works without token
- T-11-07 (Repudiation): Accepted per threat model — UUID-owner model, no additional audit logging

## Self-Check: PASSED

Files exist:
- FOUND: src/app/api/filings/[id]/cppa-pdf/route.ts

Commits exist:
- FOUND: 79de3ec (feat(11-03): implement GET /api/filings/[id]/cppa-pdf with UUID-only access and Blob storage)
