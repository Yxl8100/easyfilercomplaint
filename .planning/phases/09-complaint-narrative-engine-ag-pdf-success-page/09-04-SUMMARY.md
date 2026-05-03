---
phase: 09-complaint-narrative-engine-ag-pdf-success-page
plan: "04"
subsystem: ui
tags: [next.js, prisma, success-page, accessibility, fax-status, tailwind, tdd]

# Dependency graph
requires:
  - phase: 09-01
    provides: Wave 0 RED test scaffold — page.test.tsx with SUCC-01, SUCC-03, ADA-01 failing tests
  - phase: 09-02
    provides: cppa-complaint-generator.ts (consumed by Wave 1; not directly consumed by success page)
  - phase: 09-03
    provides: generate-complaint-pdf.ts restructure (AG PDF; not directly consumed by success page)

provides:
  - src/app/filing/[id]/success/page.tsx rewritten with 3-channel layout, ADA conditional, fax status
  - All 10 success page tests passing GREEN (SUCC-01, SUCC-02, SUCC-03, SUCC-04, ADA-01)

affects:
  - Phase 10 CPPA guide page (cppa-guide link now in DOM for non-ADA filings)
  - Phase 11 CPPA paper PDF API route (cppa-pdf link now in DOM for non-ADA filings)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "isADA conditional via JSX {!isADA && (...)} — not CSS display:none — excluded content never in DOM for ADA filers"
    - "getFaxStatusDisplay helper: normalizes faxStatus string to display label + Tailwind color token"
    - "Raw faxStatus rendered via {filing.faxStatus ?? faxDisplay.label} — when faxStatus is non-null the raw value is shown; when null 'Pending' label is shown"
    - "Prisma select extended with faxId and faxStatus: both String? fields from Filing model"
    - "Three-channel card pattern: bg-bg-alt border border-border rounded-[6px] p-6 mb-4 with eyebrow + h2 + body + CTA"
    - "Dynamic step label: STEP 1 for ADA (CA AG only), STEP 1/2/3 for non-ADA (all three channels)"
    - "Worktree test execution: used vitest.worktree.config.ts with exclude omitting /.claude/worktrees/ to run tests from worktree"

key-files:
  created: []
  modified:
    - src/app/filing/[id]/success/page.tsx

key-decisions:
  - "Raw faxStatus rendered (not translated label) for SUCC-03 test compatibility — 09-01 SUMMARY decision: 'Wave 1 implementation must render faxStatus value directly'"
  - "faxStatus display: {filing.faxStatus ?? faxDisplay.label} — raw value when non-null, 'Pending' label when null"
  - "ADA conditional uses JSX {!isADA && (...)} per UI-SPEC accessibility requirement — not display:none"
  - "isADA detection: filing.category === 'accessibility' per categories.ts canonical id and STATE.md decisions log"

patterns-established:
  - "Three-channel card JSX pattern: eyebrow + badge inline, h2 heading, body copy, CTA link — established for Phase 10 and 11 consistency"

requirements-completed:
  - SUCC-01
  - SUCC-02
  - SUCC-03
  - SUCC-04
  - ADA-01

# Metrics
duration: 7min
completed: 2026-05-03
---

# Phase 9 Plan 04: Success Page Redesign Summary

**3-channel success page with ADA conditional rendering, raw faxStatus display, and extended Prisma select — all 10 tests pass GREEN**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-05-03T22:00:00Z
- **Completed:** 2026-05-03T22:07:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Rewrote `src/app/filing/[id]/success/page.tsx` with 3-channel filing card layout per UI-SPEC
- Extended Prisma `findUnique` select with `faxId: true` and `faxStatus: true`
- Added `isADA = filing.category === 'accessibility'` conditional — CPPA channel cards (A and B) are absent from the DOM when true
- Added `getFaxStatusDisplay` helper mapping faxStatus to human-readable label and Tailwind color token
- Rendered `{filing.faxStatus ?? faxDisplay.label}` for SUCC-03 test compatibility: raw 'success'/'failure' string shown when faxStatus is non-null; 'Pending' when null
- Card A (CPPA Online): eyebrow "STEP 1", "Recommended" badge, h2 heading, link to `/filing/${filing.id}/cppa-guide` — hidden for ADA
- Card B (CPPA Paper PDF): eyebrow "STEP 2", h2 heading, link to `/api/filings/${filing.id}/cppa-pdf` — hidden for ADA
- Card C (CA AG): dynamic step label (STEP 1 ADA / STEP 3 non-ADA), "Auto-Filed ✓" badge, fax ID row (conditional on faxId), status row, PDF download link (conditional on complaintPdfUrl)
- Updated Section 1 subheading copy per UI-SPEC copywriting contract (ADA vs non-ADA)
- Updated Agency detail row: "Multiple Agencies" (non-ADA) / "CA Attorney General" (ADA)
- Preserved Section 2 receipt ID card, Section 5 guest CTA (SUCC-04), Section 6 secondary action verbatim
- All 10 `page.test.tsx` tests pass GREEN; full 181-test suite passes with zero regressions

## Task Commits

1. **Task 1: Rewrite success page — 3-channel layout, ADA conditional, fax status, extended Prisma select** — `32ded04` (feat)

## Files Created/Modified

- `src/app/filing/[id]/success/page.tsx` — Rewritten: 194 lines; 3-channel card layout; isADA conditional; getFaxStatusDisplay helper; extended Prisma select (faxId, faxStatus); all preserved sections unchanged

## Decisions Made

- **Raw faxStatus rendered**: The `page.test.tsx` SUCC-03 test asserts `toContain('success')` — not `toContain('Delivered')`. Per the 09-01 SUMMARY decision note, the implementation renders the raw faxStatus value when non-null. The pattern `{filing.faxStatus ?? faxDisplay.label}` satisfies both SUCC-03 tests: raw value for non-null status, 'Pending' label for null.
- **JSX conditional for ADA**: `{!isADA && (...)}` ensures CPPA channel content is never in the DOM for accessibility filers — satisfying ADA-01 and the UI-SPEC accessibility requirement that hidden content not be discoverable by assistive technology.
- **Worktree test execution**: The project vitest config excludes `.claude/worktrees/**`. Created `vitest.worktree.config.ts` (temporary, deleted post-verification) to override the exclusion and run 181 tests from the worktree, confirming GREEN before commit.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written with one clarification on faxStatus rendering (addressed via the 09-01 SUMMARY decision note).

**Note on faxStatus rendering clarification:** The plan's action block showed `{faxDisplay.label}` (would render 'Delivered' for 'success'). The 09-01 SUMMARY explicitly states "Wave 1 implementation must render faxStatus value directly". Applied `{filing.faxStatus ?? faxDisplay.label}` to satisfy both the raw-value test assertion and the null-Pending fallback. This is not a deviation but a reconciliation of the plan action with the established test contract.

## Known Stubs

None — all three channel links are functional hrefs:
- `/filing/${filing.id}/cppa-guide` — Phase 10 page (planned)
- `/api/filings/${filing.id}/cppa-pdf` — Phase 11 API route (planned)
- `/api/filings/${filing.id}/pdf` — existing Phase 3 PDF proxy route

The Phase 10 and Phase 11 links will return 404 until those phases ship. This is an accepted UX issue (T-9-04-05) — links must exist in DOM now so success page tests pass.

## Threat Flags

No new threat surface beyond what the threat model documents. The success page remains a receipt-paradigm page (accessible by anyone with the filing UUID). No new auth boundaries, network endpoints, or schema changes introduced.

## Issues Encountered

**Worktree test exclusion**: The project `vitest.config.ts` excludes `**/.claude/worktrees/**`, preventing tests from running directly in the worktree. Created a temporary `vitest.worktree.config.ts` override (no `.claude/worktrees` exclusion) to run the full 181-test suite from the worktree. File deleted after verification. This is a known constraint of the worktree execution pattern.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 9 Wave 2 complete: `src/app/filing/[id]/success/page.tsx` now has cppa-guide and cppa-pdf links in the DOM
- Phase 10 (CPPA Guide Page at `/filing/[id]/cppa-guide`) can proceed — the navigation entry point exists
- Phase 11 (CPPA Paper PDF API at `/api/filings/[id]/cppa-pdf`) can proceed — the download entry point exists
- All Phase 9 requirements satisfied: CPTXT-01–05, AGPDF-01–04, DESC-01–03, SUCC-01–04, ADA-01

---
*Phase: 09-complaint-narrative-engine-ag-pdf-success-page*
*Completed: 2026-05-03*

## Self-Check: PASSED

- `src/app/filing/[id]/success/page.tsx` — FOUND (194 lines, rewritten in this plan)
- Commit 32ded04 — FOUND in git log
- All 10 success page tests: PASSED GREEN (verbose output confirmed)
- Full 181-test suite: PASSED GREEN (no regressions)
- Structural verification:
  - `cppa-guide` pattern: FOUND (line 135)
  - `cppa-pdf` pattern: FOUND (line 156)
  - `faxId` in Prisma select: FOUND (line 23)
  - `faxStatus` in Prisma select: FOUND (line 24)
  - `isADA` conditional: FOUND (line 44, 118, 144)
  - `accessibility` ADA detection: FOUND (line 44)
  - `Track Your Filings` guest CTA: FOUND (preserved)
  - `Filing Not Found` guard: FOUND (preserved)
  - All 3 channel card headings use h2 tags: VERIFIED
