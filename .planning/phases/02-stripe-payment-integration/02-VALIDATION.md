---
phase: 2
slug: stripe-payment-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `rtk vitest run --reporter=verbose src/lib/stripe.test.ts` |
| **Full suite command** | `rtk vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `rtk vitest run --reporter=verbose src/lib/stripe.test.ts`
- **After every plan wave:** Run `rtk vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 1 | PAY-01 | unit | `rtk vitest run src/lib/stripe.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 1 | PAY-02 | integration | `rtk vitest run src/app/api/checkout/route.test.ts` | ❌ W0 | ⬜ pending |
| 2-03-01 | 03 | 1 | PAY-03, PAY-04, PAY-05 | integration | `rtk vitest run src/app/api/webhooks/stripe/route.test.ts` | ❌ W0 | ⬜ pending |
| 2-04-01 | 04 | 2 | PAY-06 | manual | N/A — browser redirect flow | N/A | ⬜ pending |
| 2-05-01 | 05 | 2 | PAY-07, PAY-08 | unit | `rtk vitest run src/app/filing/[id]/success/page.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/stripe.test.ts` — stubs for PAY-01 (Stripe client lazy-init and validation)
- [ ] `src/app/api/checkout/route.test.ts` — stubs for PAY-02 (checkout session creation)
- [ ] `src/app/api/webhooks/stripe/route.test.ts` — stubs for PAY-03, PAY-04, PAY-05 (webhook signature verify + Filing updates)
- [ ] `src/app/filing/[id]/success/page.test.tsx` — stubs for PAY-07, PAY-08 (success page rendering)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Wizard final step redirects to Stripe Checkout | PAY-06 | Browser redirect — cannot assert in vitest | Open wizard, complete all steps, click Pay & File, confirm redirect to stripe.com checkout |
| Stripe Checkout completes and webhook fires | PAY-03 | Requires live Stripe test event | Use `stripe trigger checkout.session.completed` CLI or Stripe Dashboard test events |
| Success page loads after payment | PAY-07 | End-to-end browser flow | After checkout.session.completed fires, navigate to /filing/[id]/success, verify receipt ID and filing details |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
