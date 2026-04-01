---
phase: 3
slug: complaint-pdf-generation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 3 — Validation Strategy

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

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-W0-01 | W0 | 0 | PDF-01..07 | unit | `npx vitest run src/lib/__tests__/generate-complaint-pdf.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-01 | 01 | 1 | PDF-07 | unit | `npx vitest run src/lib/__tests__/generate-complaint-pdf.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | PDF-01, PDF-02 | unit | same | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 1 | PDF-03 | unit | same | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 2 | PDF-06 | unit | same | ❌ W0 | ⬜ pending |
| 3-02-02 | 02 | 2 | PDF-04 | unit | same | ❌ W0 | ⬜ pending |
| 3-02-03 | 02 | 2 | PDF-05 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/generate-complaint-pdf.test.ts` — stubs for PDF-01 through PDF-07
- [ ] `src/assets/fonts/LiberationSerif-Regular.ttf` — required font asset (binary, committed to repo)
- [ ] `src/assets/fonts/LiberationSerif-Bold.ttf` — required font asset (binary, committed to repo)
- [ ] `npm install @pdf-lib/fontkit @vercel/blob` — must run before any code task compiles

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PDF renders correctly on fax (Liberation Serif legibility) | PDF-07 | Physical fax output cannot be automated | Print generated PDF and confirm letter legibility on fax-grade output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
