---
phase: 6
slug: guest-to-account-conversion
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run --reporter=verbose 2>&1` |
| **Full suite command** | `npx vitest run 2>&1` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose 2>&1`
- **After every plan wave:** Run `npx vitest run 2>&1`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 6-xx-01 | 01 | 0 | AUTH-02 | unit | `npx vitest run src/lib/__tests__/register.test.ts` | ❌ W0 | ⬜ pending |
| 6-xx-02 | 01 | 0 | AUTH-03 | unit | `npx vitest run src/lib/__tests__/register.test.ts` | ❌ W0 | ⬜ pending |
| 6-xx-03 | 01 | 0 | AUTH-01 | unit | `npx vitest run src/app/account/create/page.test.tsx` | ❌ W0 | ⬜ pending |
| 6-xx-04 | 01 | 0 | AUTH-04 | unit | `npx vitest run src/app/login/page.test.tsx` | ❌ W0 | ⬜ pending |
| 6-xx-05 | 01 | 0 | AUTH-06 | unit | `npx vitest run src/middleware.test.ts` | ❌ W0 | ⬜ pending |
| 6-xx-06 | 01 | 0 | AUTH-07 | unit | `npx vitest run src/app/account/filings/page.test.tsx` | ❌ W0 | ⬜ pending |
| 6-xx-07 | 01 | — | AUTH-05 | manual | Manual browser verification | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/register.test.ts` — stubs for AUTH-02, AUTH-03
- [ ] `src/app/account/create/page.test.tsx` — stubs for AUTH-01
- [ ] `src/app/login/page.test.tsx` — stubs for AUTH-04
- [ ] `src/middleware.test.ts` — stubs for AUTH-06
- [ ] `src/app/account/filings/page.test.tsx` — stubs for AUTH-07

*Existing vitest infrastructure covers all phase requirements — no new framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| JWT session strategy — session.user.id populated after sign-in | AUTH-05 | NextAuth v5 JWT session creation goes through the framework's internal cookie layer. Unit testing the full JWT round-trip requires a full HTTP server. | Validate via browser DevTools: check `next-auth.session-token` cookie is `httpOnly` after signing in. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
