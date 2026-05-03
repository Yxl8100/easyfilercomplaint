---
phase: 09-complaint-narrative-engine-ag-pdf-success-page
plan: "01"
subsystem: testing
tags: [vitest, tdd, cppa, pdf-lib, next.js, prisma]

# Dependency graph
requires:
  - phase: 03-complaint-pdf-generation
    provides: generate-complaint-pdf.ts with drawWrappedText, font loading, existing test structure
  - phase: 06-guest-account-conversion
    provides: success/page.tsx with guest CTA and filing display pattern
provides:
  - Wave 0 RED test scaffold for all Phase 9 requirements
  - cppa-complaint-generator.test.ts with 14 unit tests covering CPTXT-01–05 and DESC-03
  - Updated generate-complaint-pdf.test.ts with 6 form-section header assertions and narrative opening check
  - Updated page.test.tsx with 3-channel layout, ADA conditional, and fax-status assertions
affects:
  - 09-02 (cppa-complaint-generator.ts implementation — turns RED tests GREEN)
  - 09-03 (generate-complaint-pdf.ts restructure — turns PDF-02/PDF-03 RED tests GREEN)
  - 09-04 (success page redesign — turns SUCC-01/SUCC-03 RED tests GREEN)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 Nyquist test scaffold: all tests written RED before any implementation"
    - "Mock Filing fixture with filerInfo JSON field for CPPA generator tests"
    - "extractPdfText() helper preserved — decompresses FlateDecode streams for assertion"

key-files:
  created:
    - src/lib/__tests__/cppa-complaint-generator.test.ts
  modified:
    - src/lib/__tests__/generate-complaint-pdf.test.ts
    - src/app/filing/[id]/success/page.test.tsx

key-decisions:
  - "ADA-01 test passes GREEN immediately (no cppa-guide/cppa-pdf links in current page) — this is correct behavior, it guards against regressions in Wave 1"
  - "SUCC-03 fax status test uses 'success' string not 'Delivered' — Wave 1 implementation must render faxStatus value directly"

patterns-established:
  - "cppa-complaint-generator test fixture: filerInfo as nested JSON object on Filing mock"
  - "page.test.tsx: import module inside each test body to respect vi.resetAllMocks() in beforeEach"

requirements-completed:
  - CPTXT-01
  - CPTXT-02
  - CPTXT-03
  - CPTXT-04
  - CPTXT-05
  - AGPDF-01
  - AGPDF-02
  - AGPDF-03
  - DESC-03
  - SUCC-01
  - SUCC-02
  - SUCC-03
  - SUCC-04
  - ADA-01

# Metrics
duration: 3min
completed: 2026-05-03
---

# Phase 9 Plan 01: Wave 0 Test Scaffold Summary

**RED test scaffold for 14 CPPA/AG-PDF/success-page requirements: 3 test files, 14+11+10 tests, all new assertions failing against unmodified codebase**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-03T21:23:08Z
- **Completed:** 2026-05-03T21:26:55Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Created `cppa-complaint-generator.test.ts` with 14 unit tests covering all 6 CPTXT/DESC requirements (CPTXT-01 through CPTXT-05 and DESC-03) — fails RED with "Cannot find module" confirming no implementation exists yet
- Updated `generate-complaint-pdf.test.ts`: replaced letter-format assertions (PRIVACY COMPLAINT, Re:, Respectfully submitted) with 6 form-section header checks (YOUR INFORMATION, BUSINESS INFORMATION, COMPLAINT, RESOLUTION REQUESTED, AFFIRMATION) and narrative opening check (On or about) — 4 tests now RED, 7 preserved GREEN
- Updated `page.test.tsx`: added SUCC-01 (cppa-guide + cppa-pdf links), ADA-01 (accessibility hides CPPA channels), two SUCC-03 fax-status tests, replaced stale PDF download link test with proxy route check, removed 'will be available shortly' test — 4 tests now RED, 6 preserved GREEN

## Task Commits

1. **Task 1: Create cppa-complaint-generator.test.ts** — `44a95a3` (test)
2. **Task 2: Update generate-complaint-pdf.test.ts** — `dd279eb` (test)
3. **Task 3: Update page.test.tsx** — `d953d2d` (test)

## Files Created/Modified

- `src/lib/__tests__/cppa-complaint-generator.test.ts` — New: 14 unit tests for generateCPPAComplaint covering CPTXT-01–05 and DESC-03; fails RED on module not found
- `src/lib/__tests__/generate-complaint-pdf.test.ts` — Modified: PDF-02 now asserts 6 form-section headers; PDF-03 variants assert "On or about" narrative opening; added mockFilingPrivacyTracking fixture
- `src/app/filing/[id]/success/page.test.tsx` — Modified: baseFiling extended with faxId/faxStatus; added SUCC-01, ADA-01, two SUCC-03 tests; removed stale 'will be available shortly' test

## Decisions Made

- ADA-01 test passes GREEN immediately against the current page (no cppa-guide/cppa-pdf links exist yet) — this is intentional regression-guard behavior; Wave 1 must not introduce those links for accessibility filings
- SUCC-03 fax status assertion uses `toContain('success')` (raw faxStatus value) rather than a display label like 'Delivered' — Wave 1 implementation must surface the raw status string or the test will continue to fail

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Wave 0 test scaffold complete — all Phase 9 requirement tests are in RED state
- Wave 1 agents (09-02 and 09-03) can now run in parallel:
  - 09-02: implement `src/lib/cppa-complaint-generator.ts` to turn CPTXT-01–05 and DESC-03 GREEN
  - 09-03: restructure `src/lib/generate-complaint-pdf.ts` to turn AGPDF-01–03 RED tests GREEN
- Wave 2 (09-04) depends on Wave 1 completion: rewrite `src/app/filing/[id]/success/page.tsx` to turn SUCC-01, SUCC-03 RED tests GREEN

---
*Phase: 09-complaint-narrative-engine-ag-pdf-success-page*
*Completed: 2026-05-03*

## Self-Check: PASSED

- `src/lib/__tests__/cppa-complaint-generator.test.ts` — FOUND
- `src/lib/__tests__/generate-complaint-pdf.test.ts` — FOUND (modified)
- `src/app/filing/[id]/success/page.test.tsx` — FOUND (modified)
- Commits: 44a95a3, dd279eb, d953d2d — all present in git log
