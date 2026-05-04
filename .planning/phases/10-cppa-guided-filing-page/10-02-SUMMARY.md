---
phase: 10-cppa-guided-filing-page
plan: "02"
subsystem: pages
tags: [server-component, cppa, guide-page, vitest, tdd, prisma, copy-button]
dependency_graph:
  requires:
    - src/components/CopyButton.tsx (Phase 10 Plan 01 — named export CopyButton)
    - src/lib/cppa-complaint-generator.ts (Phase 9 — generateCPPAComplaint)
    - src/lib/prisma.ts (Prisma client singleton)
    - src/components/Masthead.tsx (shared shell component)
    - src/components/Footer.tsx (shared shell component)
  provides:
    - src/app/filing/[id]/cppa-guide/page.tsx — Next.js RSC: Prisma fetch + CPPA section layout
    - src/app/filing/[id]/cppa-guide/page.test.tsx — Vitest suite, 7 tests, Pattern D
  affects:
    - /filing/[id]/cppa-guide route (new page, linked from success page Card A)
tech_stack:
  added: []
  patterns:
    - Server component + client boundary: page.tsx is RSC; CopyButton is the only client component
    - Pattern D: vi.mock() at top of test file, dynamic import() inside each it() block
    - Cast Prisma select result to Filing type via `as unknown as Filing` for generator compatibility
key_files:
  created:
    - src/app/filing/[id]/cppa-guide/page.tsx
    - src/app/filing/[id]/cppa-guide/page.test.tsx
  modified: []
decisions:
  - "Used `filing as unknown as Filing` cast for Prisma select result — select includes all generator-required fields; cast is safe and avoids importing partial types"
  - "Generator mocked in tests — decouples page tests from narrative generation logic (tested separately in Phase 9)"
  - "CopyButton mock returns string (not null) in tests — allows asserting text prop propagation via JSON.stringify output"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-04T01:10:00Z"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 10 Plan 02: CPPA Guide Page Summary

**One-liner:** Next.js RSC at /filing/[id]/cppa-guide that fetches a filing via Prisma, calls generateCPPAComplaint server-side, and renders 4 copyable sections (Q2/Q4/Q5/Q7), a Q1 checkbox list, instruction block, and CPPA form CTA.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | cppa-guide page — server component | 30d0aca | src/app/filing/[id]/cppa-guide/page.tsx |
| 2 | cppa-guide page tests (Pattern D) | a2c44f2 | src/app/filing/[id]/cppa-guide/page.test.tsx |

## What Was Built

**cppa-guide page** (`src/app/filing/[id]/cppa-guide/page.tsx`):
- No `'use client'` — pure React Server Component (Next.js App Router default)
- `prisma.filing.findUnique` with 9-field select: id, category, targetName, targetUrl, description, filerInfo, filingReceiptId, categoryFields, filerEmail
- Filing not found guard renders "Filing Not Found" fallback with Masthead/Footer shell
- `generateCPPAComplaint(filing as unknown as Filing)` called server-side to produce CPPAComplaint
- Q1: visual checkbox list with `✔` prefix, labeled "Q1 — Check These Boxes on the Form" — no CopyButton (D-03)
- Q2, Q4, Q5, Q7: card sections with `CopyButton` alongside read-only text display (D-01)
- Q3 and Q6 not rendered at all (instruction-only fields the user fills directly — D-02)
- Instruction text at top: "Open the CPPA complaint form, paste your complaint in the description field, fill in your details, and submit." (D-06)
- CTA button links to `https://cppa.ca.gov/webapplications/complaint` with `target="_blank"` (CPGDE-04), placed at top and bottom (D-07)
- Back link to `/filing/[id]/success` at bottom (implementation discretion per 10-CONTEXT.md)
- Tailwind vocabulary from Phase 9: `bg-bg-alt border border-border rounded-[6px] p-6`, `font-mono text-[9px]` labels, `font-body text-sm` body text

**Tests** (`src/app/filing/[id]/cppa-guide/page.test.tsx`):
- 7 tests, all GREEN
- Pattern D: `vi.mock()` calls at top, dynamic `import()` inside each `it()` block, `beforeEach(() => vi.resetAllMocks())`
- Mocks: `@/lib/prisma`, `next/navigation`, `@/components/Masthead`, `@/components/Footer`, `@/components/CopyButton`, `@/lib/cppa-complaint-generator`
- CPGDE-01: 4 copy sections with Q2/Q4/Q5/Q7 text — tested
- CPGDE-04: cppa.ca.gov/webapplications/complaint link — tested
- CPGDE-05: Q1 checkbox text renders; Q3/Q6 absent from output — tested
- Filing not found guard — tested
- generateCPPAComplaint called once — tested
- Instruction text (D-06) — tested
- Back link to success page — tested

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED (test) | n/a | Note: Plan 02 is structured as two sequential tasks (page first, tests second). Tests were written to the completed page — the TDD gate applies at the task level within the overall plan. Tests verified GREEN immediately. |
| GREEN (feat) | 30d0aca | PASS — page.tsx passes all 7 test assertions |
| REFACTOR | n/a | Skipped — implementation was clean |

Note: This plan's TDD marking (`tdd="true"`) applies per-task. Task 1 built the page; Task 2 wrote tests against it. The plan's must_haves were fully satisfied. All 7 tests pass GREEN against the completed implementation.

## Deviations from Plan

None — plan executed exactly as written. The `as unknown as Filing` cast was specified in the plan's action notes. The CopyButton mock returning a string for text prop propagation testing was specified in the plan's test implementation notes.

## Known Stubs

None — all 4 copy sections are fully wired to `generateCPPAComplaint` output. No placeholder values or TODO items.

## Threat Surface Scan

No new threat surface beyond what is documented in the plan's threat model. The page introduces one new network endpoint:

| Flag | File | Description |
|------|------|-------------|
| Covered by plan | src/app/filing/[id]/cppa-guide/page.tsx | GET /filing/[id]/cppa-guide — covered by T-10-02-01 through T-10-02-04 in plan threat model |

All threats were addressed in the plan:
- T-10-02-01: UUID access model — accepted (per D-04/D-05)
- T-10-02-02: filerInfo disclosure — accepted (filer's own data, UUID-gated)
- T-10-02-03: Filing ID spoofing — mitigated (Prisma parameterized query, null guard)
- T-10-02-04: generateCPPAComplaint DoS — accepted (pure sync O(1) function)

## Verification Results

- `npx vitest run src/app/filing/[id]/cppa-guide/page.test.tsx` — 7/7 PASS
- `npx vitest run` (full suite) — 192/192 PASS, 27 files, zero regressions
- `npx tsc --noEmit` — exits 0, no TypeScript errors
- `'use client'` absent from page.tsx — CONFIRMED (server component)
- `q3CaliforniaResident` absent from page.tsx — CONFIRMED (not rendered)
- `q6ContactedBusiness` absent from page.tsx — CONFIRMED (not rendered)
- `cppa.ca.gov/webapplications/complaint` present in page.tsx — CONFIRMED

## Self-Check: PASSED

- [x] src/app/filing/[id]/cppa-guide/page.tsx exists — FOUND
- [x] src/app/filing/[id]/cppa-guide/page.test.tsx exists — FOUND
- [x] 'use client' absent — CONFIRMED
- [x] generateCPPAComplaint import — FOUND
- [x] CopyButton import — FOUND
- [x] prisma.filing.findUnique — FOUND
- [x] cppa.ca.gov/webapplications/complaint — FOUND
- [x] target="_blank" — FOUND
- [x] Filing Not Found guard — FOUND
- [x] q1CheckboxInstructions — FOUND
- [x] q2BusinessName — FOUND
- [x] q4Description — FOUND
- [x] q5SupportingMaterials — FOUND
- [x] q7ContactInfo — FOUND
- [x] q3CaliforniaResident absent — CONFIRMED
- [x] q6ContactedBusiness absent — CONFIRMED
- [x] All 7 page tests GREEN — CONFIRMED
- [x] Full 192-test suite GREEN — CONFIRMED
- [x] TypeScript clean — CONFIRMED
- [x] Commit 30d0aca exists — CONFIRMED
- [x] Commit a2c44f2 exists — CONFIRMED
