---
phase: 7
slug: landing-page-and-legal-pages
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest / Playwright |
| **Config file** | vitest.config.ts / playwright.config.ts |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run && npx playwright test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run && npx playwright test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 7-01-01 | 01 | 1 | MKTG-01 | e2e | `npx playwright test --grep "hero"` | ❌ W0 | ⬜ pending |
| 7-01-02 | 01 | 1 | MKTG-02 | e2e | `npx playwright test --grep "how-it-works"` | ❌ W0 | ⬜ pending |
| 7-01-03 | 01 | 1 | MKTG-03 | e2e | `npx playwright test --grep "faq"` | ❌ W0 | ⬜ pending |
| 7-02-01 | 02 | 2 | MKTG-04 | e2e | `npx playwright test --grep "privacy"` | ❌ W0 | ⬜ pending |
| 7-02-02 | 02 | 2 | MKTG-05 | e2e | `npx playwright test --grep "terms"` | ❌ W0 | ⬜ pending |
| 7-02-03 | 02 | 2 | MKTG-06 | e2e | `npx playwright test --grep "about"` | ❌ W0 | ⬜ pending |
| 7-03-01 | 03 | 3 | MKTG-07 | unit | `npx vitest run entity-separation` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/e2e/landing.spec.ts` — hero, how-it-works, FAQ tests for MKTG-01, MKTG-02, MKTG-03
- [ ] `tests/e2e/legal.spec.ts` — privacy, terms, about page tests for MKTG-04, MKTG-05, MKTG-06
- [ ] `tests/unit/entity-separation.test.ts` — entity separation audit for MKTG-07

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual design matches UI-SPEC typography | MKTG-01 | No visual regression tooling | Compare rendered page to UI-SPEC.md sizing tokens |
| CTA button navigates to complaint form | MKTG-01 | Requires running app | Click CTA, verify URL changes to /complaint or /start |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
