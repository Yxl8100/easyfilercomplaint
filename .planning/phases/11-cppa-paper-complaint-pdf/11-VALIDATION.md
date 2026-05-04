---
phase: 11
slug: cppa-paper-complaint-pdf
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-03
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `rtk vitest run --reporter=verbose src/__tests__/cppa-pdf` |
| **Full suite command** | `rtk vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `rtk vitest run --reporter=verbose src/__tests__/cppa-pdf`
- **After every plan wave:** Run `rtk vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | CPPDF-01 | — | N/A | unit | `rtk vitest run src/__tests__/cppa-pdf-generator` | ❌ W0 | ⬜ pending |
| 11-01-02 | 01 | 1 | CPPDF-02 | — | N/A | unit | `rtk vitest run src/__tests__/cppa-pdf-generator` | ❌ W0 | ⬜ pending |
| 11-02-01 | 02 | 2 | CPPDF-03 | T-11-01 | UUID-only auth — no session required; route returns 404 for unowned filings | integration | `rtk vitest run src/__tests__/cppa-pdf-route` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/cppa-pdf-generator.test.ts` — stubs for CPPDF-01, CPPDF-02
- [ ] `src/__tests__/cppa-pdf-route.test.ts` — stubs for CPPDF-03
- [ ] `src/lib/cppa-pdf-generator.ts` — file exists (stub) before generator tests run

*Existing vitest infrastructure covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PDF renders all 10 layout sections with correct CPPA form layout | CPPDF-01 | Visual verification of PDF structure | Download PDF via /api/filings/[id]/cppa-pdf, open in viewer, confirm 10 sections present |
| Perjury attestation has blank signature line and CPPA mailing address header | CPPDF-01 | Visual PDF layout verification | Inspect downloaded PDF for signature line and header |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
