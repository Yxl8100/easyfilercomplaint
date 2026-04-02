---
phase: 07-landing-page-and-legal-pages
plan: 03
subsystem: testing
tags: [vitest, entity-separation, mktg-07, homepage, legal-pages, react-server-components]

# Dependency graph
requires:
  - phase: 07-landing-page-and-legal-pages/07-01
    provides: homepage rewrite with HomeFaq component and FAQ_ITEMS export
  - phase: 07-landing-page-and-legal-pages/07-02
    provides: /privacy, /terms, /about legal pages as server components

provides:
  - Automated MKTG-07 entity separation tests for all 5 surfaces (homepage, HomeFaq, /privacy, /terms, /about)
  - Content verification tests for MKTG-01 (hero text, CTA), MKTG-02 (3 steps), MKTG-03 (5 FAQ items), MKTG-04 (CCPA), MKTG-05 (Arizona law), MKTG-06 (about content)

affects: [phase-08, launch-checklist, entity-separation-audit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "next/link mock pattern for JSON.stringify server component tests — mock must return plain object not circular ref"
    - "Legal page server component tests need only Masthead/Footer mocks (no next/link used in legal pages)"

key-files:
  created:
    - src/app/page.test.tsx
    - src/components/HomeFaq.test.tsx
    - src/app/privacy/page.test.tsx
    - src/app/terms/page.test.tsx
    - src/app/about/page.test.tsx
  modified: []

key-decisions:
  - "Mock next/link in homepage test to avoid circular JSON structure — Link component from Next.js creates circular React element references; mock returns plain object"
  - "Split hero heading assertion into two toContain checks — JSX splits 'File a Privacy Complaint' and 'in 5 Minutes' across separate text nodes (em tag boundary)"
  - "Legal page tests require no next/link mock — /privacy, /terms, /about use plain anchor tags not Link component"

patterns-established:
  - "Pattern: Always mock next/link when JSON.stringify-testing server components that use Link — use plain object return, not JSX factory"

requirements-completed: [MKTG-07]

# Metrics
duration: 10min
completed: 2026-04-02
---

# Phase 07 Plan 03: Entity Separation Tests Summary

**22 automated tests verify zero prohibited entity strings (MKTG-07) and content requirements (MKTG-01 through MKTG-06) across all 5 Phase 7 surfaces**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-02T18:47:12Z
- **Completed:** 2026-04-02T18:57:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- 22 new tests across 5 files covering entity separation for all Phase 7 pages and the HomeFaq component
- MKTG-07 prohibited strings check (DPW, Pro Veritas, APFC, ComplianceSweep, IdentifiedVerified) on homepage, HomeFaq FAQ_ITEMS, /privacy, /terms, /about
- Content assertions verify MKTG-01 (hero text + CTA), MKTG-02 (3 steps, no IV), MKTG-03 (5 FAQ items), MKTG-04 (CCPA section), MKTG-05 (Arizona, attorney-client disclaimer), MKTG-06 (filing service description, contact email)
- Full test suite: 152/152 passing (130 existing + 22 new)

## Task Commits

1. **Task 1: Homepage and HomeFaq tests** - `cfb056c` (test)
2. **Task 2: Legal page tests for /privacy, /terms, /about** - `99591d2` (test)

**Plan metadata:** TBD (docs commit)

## Files Created/Modified
- `src/app/page.test.tsx` - Homepage entity separation (MKTG-07), hero text (MKTG-01), CTA (MKTG-01), 3 steps (MKTG-02), $1.99 pricing
- `src/components/HomeFaq.test.tsx` - FAQ_ITEMS entity separation (MKTG-07), 5 items (MKTG-03), item structure
- `src/app/privacy/page.test.tsx` - Privacy page entity separation (MKTG-07), CCPA (MKTG-04), third-party services
- `src/app/terms/page.test.tsx` - Terms page entity separation (MKTG-07), Arizona law, attorney-client disclaimer (MKTG-05), $1.99
- `src/app/about/page.test.tsx` - About page entity separation (MKTG-07), filing service description, CA AG, contact email (MKTG-06)

## Decisions Made
- Mock `next/link` in homepage test — the Next.js `Link` component creates circular React element references that break JSON.stringify. Mock returns a plain object with `href` and `children` props, which serializes cleanly.
- Split the hero heading assertion — the JSX uses `<em>` for "in 5 Minutes" which splits the heading into separate text node children. `'File a Privacy Complaint in 5 Minutes'` as a single string would never match. Two separate `toContain` checks work correctly.
- Legal page tests require no next/link mock — all three legal pages (/privacy, /terms, /about) use plain `<a>` anchor tags with `mailto:` hrefs, not the `Link` component from next/link.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added next/link mock to prevent circular JSON structure**
- **Found during:** Task 1 (homepage test execution)
- **Issue:** `JSON.stringify(HomePage())` threw `TypeError: Converting circular structure to JSON` because `next/link`'s `Link` component creates circular references in the React element tree
- **Fix:** Added `vi.mock('next/link', ...)` returning a plain serializable object
- **Files modified:** src/app/page.test.tsx
- **Verification:** All 6 homepage tests pass after fix
- **Committed in:** cfb056c (Task 1 commit)

**2. [Rule 1 - Bug] Fixed hero heading assertion to match JSX children structure**
- **Found during:** Task 1 (hero heading test failure)
- **Issue:** `expect(html).toContain('File a Privacy Complaint in 5 Minutes')` failed because the `<h1>` uses an `<em>` tag splitting the text: `["File a Privacy Complaint"," ",<em>in 5 Minutes</em>]`
- **Fix:** Changed to two separate `toContain` assertions: one for `'File a Privacy Complaint'` and one for `'in 5 Minutes'`
- **Files modified:** src/app/page.test.tsx
- **Verification:** Hero heading test passes
- **Committed in:** cfb056c (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs)
**Impact on plan:** Both auto-fixes necessary for the tests to function at all. The plan's test code was correct in intent but needed minor adjustments for the actual component structure.

## Issues Encountered
- None beyond the two auto-fixed deviations above.

## User Setup Required
None — no external service configuration required.

## Known Stubs
None — all tests verify real content in the Phase 7 pages.

## Next Phase Readiness
- All MKTG-01 through MKTG-07 requirements now have automated test coverage
- Phase 7 is fully complete (3/3 plans done)
- Phase 8 (Filing Wizard UX Adjustments) can proceed independently
- Entity separation is continuously verified in CI — any future copy change that introduces prohibited strings will fail tests

---
*Phase: 07-landing-page-and-legal-pages*
*Completed: 2026-04-02*
