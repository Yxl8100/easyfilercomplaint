---
phase: 8
slug: filing-wizard-ux-adjustments
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (or none — Wave 0 installs) |
| **Quick run command** | `rtk vitest run` |
| **Full suite command** | `rtk vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `rtk vitest run`
- **After every plan wave:** Run `rtk vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | WIZ-01 | — | Plain English labels render correctly | unit | `rtk vitest run` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | WIZ-02 | — | Category IDs map to correct complaint type values | unit | `rtk vitest run` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 1 | WIZ-03 | — | Visit date dropdown renders correct options | unit | `rtk vitest run` | ❌ W0 | ⬜ pending |
| 08-02-02 | 02 | 1 | WIZ-04 | T-8-01 | File upload rejects >5MB and invalid types | unit | `rtk vitest run` | ❌ W0 | ⬜ pending |
| 08-02-03 | 02 | 2 | WIZ-04 | T-8-02 | Evidence upload API validates file type/size before storing | unit | `rtk vitest run` | ❌ W0 | ⬜ pending |
| 08-03-01 | 03 | 1 | WIZ-05 | — | CA AG is the only active agency option | unit | `rtk vitest run` | ❌ W0 | ⬜ pending |
| 08-03-02 | 03 | 1 | WIZ-06 | — | FCC is shown as "coming soon" (disabled) | unit | `rtk vitest run` | ❌ W0 | ⬜ pending |
| 08-03-03 | 03 | 2 | WIZ-07 | — | Evidence URL forwarded to checkout and stored in DB | unit | `rtk vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/wizard-labels.test.tsx` — stubs for WIZ-01, WIZ-02
- [ ] `__tests__/visit-date.test.tsx` — stubs for WIZ-03
- [ ] `__tests__/evidence-upload.test.tsx` — stubs for WIZ-04
- [ ] `__tests__/agency-step.test.tsx` — stubs for WIZ-05, WIZ-06
- [ ] `__tests__/checkout-evidence.test.ts` — stubs for WIZ-07

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Evidence file attaches to fax PDF | WIZ-04, WIZ-07 | Requires live Phaxio + Vercel Blob | Submit test complaint with evidence file, verify fax has 2 attachments |
| Full wizard flow end-to-end | All WIZ | Requires Stripe test mode + DB + Phaxio | Run wizard → checkout → webhook → confirm filing created |
| File input resets after Remove | WIZ-04 | DOM ref behavior hard to unit test | Click "Remove", verify file input is empty, re-upload works |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
