---
phase: 4
slug: phaxio-fax-integration-filing-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (or package.json scripts) |
| **Quick run command** | `rtk vitest run --reporter=verbose` |
| **Full suite command** | `rtk vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `rtk vitest run --reporter=verbose`
- **After every plan wave:** Run `rtk vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 1 | FAX-01, FAX-07 | unit | `rtk vitest run src/lib/__tests__/agency-directory.test.ts` | W0 | pending |
| 4-01-02 | 01 | 1 | FAX-02, FAX-08 | unit | `rtk vitest run src/lib/__tests__/phaxio.test.ts` | W0 | pending |
| 4-02-01 | 02 | 1 | FAX-09 | unit | `rtk vitest run src/lib/__tests__/verify-phaxio-signature.test.ts` | W0 | pending |
| 4-02-02 | 02 | 1 | FAX-04 | unit | `rtk vitest run src/lib/__tests__/phaxio-webhook.test.ts` | W0 | pending |
| 4-03-01 | 03 | 2 | FAX-03, PIPE-01, PIPE-03, PIPE-04, PIPE-05 | unit | `rtk vitest run src/lib/__tests__/filing-pipeline.test.ts` | W0 | pending |
| 4-03-02 | 03 | 2 | PIPE-02, PIPE-06 | unit | `rtk vitest run src/lib/__tests__/filing-pipeline.test.ts` | W0 | pending |
| 4-04-01 | 04 | 2 | FAX-05 | unit | `rtk vitest run src/lib/__tests__/cron-check-fax.test.ts` | W0 | pending |
| 4-04-02 | 04 | 2 | FAX-06 | verify | `node -e "const v = JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log(v.crons[0].path === '/api/cron/check-fax-status' ? 'PASS' : 'FAIL')"` | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/phaxio.test.ts` — stubs for FAX-02, FAX-08
- [ ] `src/lib/__tests__/agency-directory.test.ts` — stubs for FAX-01, FAX-07
- [ ] `src/lib/__tests__/verify-phaxio-signature.test.ts` — stubs for FAX-09
- [ ] `src/lib/__tests__/phaxio-webhook.test.ts` — stubs for FAX-04
- [ ] `src/lib/__tests__/filing-pipeline.test.ts` — stubs for FAX-03, PIPE-01 through PIPE-06
- [ ] `src/lib/__tests__/cron-check-fax.test.ts` — stubs for FAX-05

*If vitest not yet installed: run `pnpm add -D vitest @vitest/coverage-v8`*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Phaxio sandbox fax delivery end-to-end | FAX-01 | Requires live Phaxio test API key and sandbox fax number | Send a test fax via Phaxio sandbox; confirm receipt in Phaxio dashboard |
| Stripe webhook triggers full pipeline | PIPE-05 | Requires live Stripe test event | Use `stripe trigger payment_intent.succeeded` CLI; verify Filing status updates |
| Phaxio webhook HMAC validation in production | FAX-04 | Requires actual Phaxio callback with real signature | Use ngrok + Phaxio webhook config pointing to local; verify 200 response |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
