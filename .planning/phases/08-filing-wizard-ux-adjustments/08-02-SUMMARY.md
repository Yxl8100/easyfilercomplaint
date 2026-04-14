---
phase: 08-filing-wizard-ux-adjustments
plan: "02"
subsystem: filing-wizard-ux
tags: [wizard, complaint-types, evidence-upload, attestation, progress-bar]
dependency_graph:
  requires:
    - FilingData.visitMonth/visitYear/evidenceFileUrl/evidenceFileName (08-01)
    - POST /api/upload-evidence (08-01)
    - defaultFilingData.state = 'CA' (08-01)
  provides:
    - 6-step filing wizard with complaint type selection
    - Evidence file upload (client-side validation + checkout-time upload)
    - Agency display (CA AG active, FCC coming soon)
    - Attestation gate on Pay & File button
  affects:
    - src/lib/categories.ts
    - src/components/forms/ProgressBar.tsx
    - src/app/file/page.tsx
    - src/app/file/[category]/page.tsx
tech_stack:
  added: []
  patterns:
    - useRef for file input reset on remove
    - Evidence uploaded at checkout time (not on file select) — avoids orphaned Blob objects
    - COMPLAINT_TYPES constant maps DB enum values to plain English labels
key_files:
  created: []
  modified:
    - src/lib/categories.ts
    - src/components/forms/ProgressBar.tsx
    - src/app/file/page.tsx
    - src/app/file/[category]/page.tsx
decisions:
  - categories.ts reduced to 3 Phase 8 types (privacy_tracking, accessibility, video_sharing) each with ca_ag only — matches DB enum values used by PDF generator
  - Evidence file held in React state until handleSubmit — avoids orphaned Blob objects if user abandons wizard
  - COMPLAINT_TYPES constant maps enum values to plain English — DB values never exposed in UI text
  - ProgressBar currentStep={step} (0-indexed) so step 0 highlights "Complaint Type" and step 5 highlights "Review"
  - Removed all legacy category-specific fields for unsupported types (FDA, environmental, city-code, consumer-protection)
metrics:
  duration_minutes: 20
  completed_date: "2026-04-14"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 4
---

# Phase 08 Plan 02: Filing Wizard UX Rewrite Summary

**One-liner:** 6-step wizard rewrite with complaint type radio cards, visit date dropdowns, evidence upload drop zone (5MB/MIME client validation), agency display (CA AG + FCC coming soon), attestation checkbox gating Pay & File, and categories reduced to 3 Phase 8 types.

**Status: COMPLETE — All 3 tasks complete. Task 3 (human-verify) approved by user.**

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Update categories.ts, ProgressBar.tsx, file/page.tsx | 170e10e | categories.ts, ProgressBar.tsx, file/page.tsx |
| 2 | Rewrite wizard page.tsx with 6-step flow | 7a5970c | file/[category]/page.tsx |

## Tasks Pending

| # | Name | Status |
|---|------|--------|
| 3 | Human verify wizard 6-step flow | Awaiting human-verify checkpoint |

## What Was Built

### Task 1: categories.ts, ProgressBar.tsx, file/page.tsx

**src/lib/categories.ts:** Replaced 6-category array with 3 Phase 8 complaint types:
- `privacy_tracking` — "Privacy & Tracking" — ca_ag only
- `accessibility` — "Accessibility (ADA)" — ca_ag only
- `video_sharing` — "Video Sharing & Streaming" — ca_ag only

Zero occurrences of: data-privacy, consumer-protection, fda-violations, environmental, city-code.

**src/components/forms/ProgressBar.tsx:** STEPS updated to:
`['Complaint Type', 'Business', 'Details', 'Agency', 'Your Info', 'Review']`

**src/app/file/page.tsx:**
- Heading: "What type of complaint are you filing?"
- Description: "Select the category that best describes your complaint."
- Top bar: "File a Complaint" (no "Select Category")
- Removed "Step I of VI" text and double rule border
- Removed agency count badge and agency name tags from category cards

### Task 2: src/app/file/[category]/page.tsx (full rewrite)

**6-step wizard flow (steps 0–5):**

- **Step 0 (Complaint Type):** Three radio cards with plain English labels (not raw enum strings). `border-bg-dark` on selected card. Continue disabled until selection made.
- **Step 1 (Business Info):** Unchanged business fields. `onBack → step 0`.
- **Step 2 (Details):** Description textarea + accessibility-specific radio (hasDisability) + prior contact + visit date Month/Year `FormSelect` dropdowns + evidence file upload drop zone (5MB/MIME client-side validation, file held in React state until checkout).
- **Step 3 (Agency):** CA AG card at full opacity. FCC card with `opacity-50 cursor-not-allowed` and "Coming Soon" badge. Continue always enabled.
- **Step 4 (Your Info):** Filer information. State field uses `defaultFilingData.state = 'CA'` (pre-selected from Plan 01). Full required field validation on Continue.
- **Step 5 (Review):** Summary showing complaint type label, business name, agency, visit date (if entered), evidence filename (if uploaded), filer name, email. Cost breakdown ($1.99). Attestation checkbox. `StepNavigation isLast continueDisabled={!attested || isSubmitting}`.

**handleSubmit:** Uploads evidence to `/api/upload-evidence` before `/api/checkout` when file is present. Passes `evidenceFileUrl` and `evidenceFileName` in checkout body.

**Removed:** `generateComplaintText`, `FormCheckboxGroup`, `expandedText`, `toggleAgency`, `downloadPdf`, `selectedAgencyObjects`, `totalCost`, `PAYMENT_METHODS`, `AGE_RANGES` (old), `TRACKING_TYPES`, `FDA_OUTCOMES`, `POLLUTION_TYPES`, `BARRIER_TYPES`, `CITY_CODE_VIOLATIONS`. Old step 5 confirmation block removed.

## Verification

- 159/159 tests passing (no regressions from wizard rewrite — wizard is a client component with no direct test coverage)
- Acceptance criteria grep checks passed for all required strings/patterns

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data flows are wired. The wizard collects real user input and submits to real API endpoints.

## Threat Surface Scan

All threat mitigations from the plan's threat register were implemented:
- T-08-06: Client-side 5MB size limit and MIME type allowlist validated before setting state
- T-08-07: handleRemoveFile resets fileInputRef.current.value = '' preventing stale file state
- T-08-08: Review summary shows only data the user entered — no PII leakage beyond user's own input

No new threat surface beyond what the plan documented.

## Self-Check: PASSED

- Commit 170e10e: EXISTS (Task 1 — categories, ProgressBar, file page)
- Commit 7a5970c: EXISTS (Task 2 — wizard rewrite)
- src/lib/categories.ts: 3 categories with privacy_tracking, accessibility, video_sharing
- src/components/forms/ProgressBar.tsx: STEPS[0] = 'Complaint Type'
- src/app/file/page.tsx: heading updated, agency badges removed
- src/app/file/[category]/page.tsx: COMPLAINT_TYPES, attested state, upload-evidence fetch, Coming Soon badge, currentStep={step}
- 159/159 tests passing
