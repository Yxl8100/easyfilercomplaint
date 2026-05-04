---
phase: 11-cppa-paper-complaint-pdf
plan: "01"
subsystem: testing
tags: [tdd, wave-0, pdf, cppa, vitest]
dependency_graph:
  requires: []
  provides:
    - "Failing test scaffold for generateCPPAComplaintPdf (CPPDF-01, CPPDF-02)"
    - "Failing route test scaffold for GET /api/filings/[id]/cppa-pdf (CPPDF-03)"
  affects:
    - "Plans 02 and 03 (implementation targets must make these tests pass)"
tech_stack:
  added: []
  patterns:
    - "extractPdfText helper copied verbatim from generate-complaint-pdf.test.ts"
    - "Wave 0 TDD: write failing tests before implementation"
    - "vi.mock + dynamic import('./route') pattern for route tests"
key_files:
  created:
    - src/lib/__tests__/cppa-pdf-generator.test.ts
    - src/app/api/filings/[id]/cppa-pdf/route.test.ts
  modified: []
decisions:
  - "extractPdfText helper copied verbatim (not reimplemented) per plan instruction and T-11-02 mitigation"
  - "PROHIBITED list includes 'IV' with word-boundary regex per Pitfall 6 (font CMap false positives)"
  - "Route test uses vi.mock('@/lib/cppa-pdf-generator') with %PDF magic bytes in mock Uint8Array"
  - "beforeEach/afterEach pattern restores BLOB_READ_WRITE_TOKEN to original value between tests"
metrics:
  duration: "147s"
  completed: "2026-05-04"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 11 Plan 01: CPPA Paper Complaint PDF — Wave 0 Test Scaffolds Summary

**One-liner:** Two failing Vitest test scaffolds establishing the Wave 0 red state for CPPA PDF generator (CPPDF-01/02) and API route (CPPDF-03) before any implementation exists.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create failing test for cppa-pdf-generator (CPPDF-01, CPPDF-02) | aee3f35 | src/lib/__tests__/cppa-pdf-generator.test.ts |
| 2 | Create failing test for cppa-pdf API route (CPPDF-03) | f147ba2 | src/app/api/filings/[id]/cppa-pdf/route.test.ts |

## What Was Built

**`src/lib/__tests__/cppa-pdf-generator.test.ts`** (180 lines, 7 test cases):
- `extractPdfText` helper copied verbatim from `generate-complaint-pdf.test.ts` lines 26-99
- `mockFiling` fixture with `filerInfo` JSON object, `categoryFields` with `visitMonth`/`visitYear`, and `filingReceiptId: 'EFC-20260315-CPPDF'`
- `PROHIBITED` constant with 11 entries including `'IV'` (word-boundary regex check per Pitfall 6)
- Test cases covering: Uint8Array output, CPPA mailing address header (400 R Street, 95811), 10 section markers in Info dict, perjury attestation text, filing ID footer, zero prohibited strings, no StandardFonts

**`src/app/api/filings/[id]/cppa-pdf/route.test.ts`** (137 lines, 7 test cases):
- Mocks: `@/lib/prisma`, `@vercel/blob`, `@/lib/cppa-pdf-generator`
- `beforeEach`/`afterEach` restoring `BLOB_READ_WRITE_TOKEN` environment variable
- Test cases covering: 404 on missing filing, 200 with `application/pdf`, `Content-Disposition: attachment` with `CPPA_Complaint_` filename, `generateCPPAComplaintPdf` called with filing, Vercel Blob at `complaints/cppa/` path, no-token fallback (200, no `put` call), UUID-only access (static file read asserting no `auth()` import)

## Verification

Both test files fail with "Cannot find module" errors — correct Wave 0 red state:
- `cppa-pdf-generator.test.ts`: `Cannot find module '../cppa-pdf-generator'`
- `route.test.ts`: `Cannot find module '/src/app/api/filings/[id]/cppa-pdf/route'`

Static checks:
- `cppa-pdf-generator.test.ts`: 7 `it(` cases, 24 `expect()` calls
- `route.test.ts`: 7 `it(` cases
- `extractPdfText` function present verbatim in generator test file
- Both files reference correct import paths

## Deviations from Plan

None — plan executed exactly as written.

The `extractPdfText` body was copied verbatim from lines 26-99 of `generate-complaint-pdf.test.ts` as required by T-11-02 mitigation.

## Known Stubs

None. This plan creates test scaffolds only — no production code stubs exist yet.

## Threat Flags

No new threat surface introduced. Test files only; no network endpoints, no auth paths, no file access beyond what the test harness requires (fs.readFileSync of the route.ts source for static assertion).

## Self-Check: PASSED

Files exist:
- FOUND: src/lib/__tests__/cppa-pdf-generator.test.ts
- FOUND: src/app/api/filings/[id]/cppa-pdf/route.test.ts

Commits exist:
- FOUND: aee3f35 (test(11-01): add failing test scaffold for cppa-pdf-generator)
- FOUND: f147ba2 (test(11-01): add failing route test scaffold for cppa-pdf API route)
