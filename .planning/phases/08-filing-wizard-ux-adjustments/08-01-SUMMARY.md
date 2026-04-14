---
phase: 08-filing-wizard-ux-adjustments
plan: "01"
subsystem: backend-data-layer
tags: [filing-data, evidence-upload, vercel-blob, form-components, api-route]
dependency_graph:
  requires: []
  provides:
    - FilingData interface with visitMonth/visitYear/evidenceFileUrl/evidenceFileName
    - defaultFilingData.state = 'CA'
    - POST /api/upload-evidence route
    - checkout route stores evidence fields on Filing
  affects:
    - src/lib/filing-state.ts
    - src/app/api/upload-evidence/route.ts
    - src/app/api/checkout/route.ts
    - src/components/forms/FormSelect.tsx
    - src/components/forms/FormField.tsx
tech_stack:
  added: []
  patterns:
    - Vercel Blob put() with access: private for evidence files
    - Dynamic import in tests after env mutation (checkout test pattern)
    - crypto.randomUUID() path prefix for path traversal prevention
key_files:
  created:
    - src/app/api/upload-evidence/route.ts
    - src/app/api/upload-evidence/route.test.ts
  modified:
    - src/lib/filing-state.ts
    - src/components/forms/FormSelect.tsx
    - src/components/forms/FormField.tsx
    - src/app/api/checkout/route.ts
decisions:
  - access: private on all evidence Blob puts — evidence files contain PII (matches Phase 3 PDF storage pattern)
  - crypto.randomUUID() directory prefix prevents path traversal even after filename sanitization
  - Filename sanitized with /[^a-zA-Z0-9._-]/g before use in Blob path
  - 503 returned when BLOB_READ_WRITE_TOKEN absent — clear signal for local dev/missing config
  - evidence fields in checkout are optional (nullish coalescing to undefined) — no breaking change
metrics:
  duration_minutes: 15
  completed_date: "2026-04-14"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 6
---

# Phase 08 Plan 01: Data Layer and Evidence Upload API Summary

**One-liner:** Vercel Blob evidence upload route (5MB/MIME validation, private access, UUID path), extended FilingData with visit date and evidence fields, CA default state, and 9px hint fix on form components.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Extend FilingData interface and fix form component hint sizes | f4d295a | filing-state.ts, FormSelect.tsx, FormField.tsx |
| 2 | Create /api/upload-evidence route with tests | 54f94cf | route.ts, route.test.ts (new) |
| 3 | Extend /api/checkout to store evidence fields on Filing | 2ebcf6b | checkout/route.ts |

## What Was Built

### FilingData Extension (src/lib/filing-state.ts)
Added four optional fields to the `FilingData` interface:
- `visitMonth?: string` — '01'-'12' from Details step dropdown
- `visitYear?: string` — e.g. '2026' from Details step dropdown
- `evidenceFileUrl?: string` — set after /api/upload-evidence, forwarded to checkout
- `evidenceFileName?: string` — set after /api/upload-evidence, forwarded to checkout

Changed `defaultFilingData.state` from `''` to `'CA'` (WIZ-05: California pre-selected).

### Evidence Upload Route (src/app/api/upload-evidence/route.ts)
POST endpoint handling evidence file uploads to Vercel Blob:
- Returns 503 when `BLOB_READ_WRITE_TOKEN` is absent
- Validates file size <= 5MB (returns 400 if exceeded)
- Validates MIME type against allowlist: `application/pdf`, `image/png`, `image/jpeg`
- Sanitizes filename with `/[^a-zA-Z0-9._-]/g` replace
- Stores to `evidence/tmp/{crypto.randomUUID()}/{filename}` with `access: 'private'`
- Returns `{ url, filename }` on success

### Checkout Route Extension (src/app/api/checkout/route.ts)
Added two lines inside `prisma.filing.create` data block:
- `evidenceFileUrl: data.evidenceFileUrl ?? undefined`
- `evidenceFileName: data.evidenceFileName ?? undefined`

### Form Component Hint Size Fix
Changed `text-[8px]` to `text-[9px]` on hint paragraph in both `FormSelect.tsx` and `FormField.tsx`.

## Verification

- `grep "text-[8px]" src/components/forms/` returns zero matches
- `grep "state: 'CA'" src/lib/filing-state.ts` matches
- `grep "evidenceFileUrl" src/app/api/checkout/route.ts` matches
- 159/159 tests passing (152 baseline + 7 new upload-evidence tests)

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

All threat mitigations from the plan's threat register were implemented:
- T-08-01: 5MB size limit validated server-side before blob write
- T-08-02: MIME type allowlist + filename sanitize regex
- T-08-03: Path traversal prevented by sanitized filename + crypto.randomUUID() directory
- T-08-04: access: 'private' on all Blob puts

No new threat surface beyond what the plan documented.

## Known Stubs

None — all fields are wired to real API calls. The evidenceFileUrl/evidenceFileName flow: client uploads to /api/upload-evidence → gets {url, filename} → passes both to /api/checkout → stored on Filing record. The fax attachment integration (attaching evidence to fax) is a future concern documented in PROJECT.md as "Evidence file upload (Vercel Blob) + attach to fax".

## Self-Check: PASSED

- src/app/api/upload-evidence/route.ts: EXISTS
- src/app/api/upload-evidence/route.test.ts: EXISTS
- Commit f4d295a: EXISTS
- Commit 54f94cf: EXISTS
- Commit 2ebcf6b: EXISTS
- 159/159 tests passing
