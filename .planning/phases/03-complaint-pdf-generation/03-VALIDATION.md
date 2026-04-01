---
phase: 3
slug: complaint-pdf-generation
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-01
---

# Phase 3 -- Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run src/lib/__tests__/generate-complaint-pdf.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/__tests__/generate-complaint-pdf.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Wave 0 Resolution

Wave 0 prerequisites are fulfilled inline by Plan 01 tasks (no separate Wave 0 plan needed):

- **Test file creation:** Plan 01 Task 2 (TDD RED step) creates `src/lib/__tests__/generate-complaint-pdf.test.ts`
- **Font assets:** Plan 01 Task 1 downloads and commits `src/assets/fonts/LiberationSerif-*.ttf`
- **npm install:** Plan 01 Task 1 runs `npm install @pdf-lib/fontkit @vercel/blob`

All Wave 0 items are covered by Plan 01 Wave 1 execution before any test runs.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 1 | PDF-07 | asset | `test -f src/assets/fonts/LiberationSerif-Regular.ttf` | created by task | pending |
| 3-01-02 | 01 | 1 | PDF-01, PDF-02, PDF-03, PDF-06, PDF-07 | unit | `npx vitest run src/lib/__tests__/generate-complaint-pdf.test.ts` | created by task (TDD RED) | pending |
| 3-02-01 | 02 | 2 | PDF-04, PDF-05 | unit+integration | `npx vitest run src/lib/__tests__/generate-complaint-pdf.test.ts` | exists from Plan 01 | pending |

*Status: pending . green . red . flaky*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PDF renders correctly on fax (Liberation Serif legibility) | PDF-07 | Physical fax output cannot be automated | Print generated PDF and confirm letter legibility on fax-grade output |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 items covered by Plan 01 Task 1 (fonts + npm install) and Plan 01 Task 2 TDD RED step (test file)
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter
- [x] `wave_0_complete: true` set in frontmatter

**Approval:** accepted
