---
phase: 9
slug: complaint-narrative-engine-ag-pdf-success-page
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-03
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 |
| **Config file** | `vitest.config.ts` (project root) |
| **Quick run command** | `npx vitest run src/lib/__tests__/cppa-complaint-generator.test.ts src/lib/__tests__/generate-complaint-pdf.test.ts src/app/filing/\\[id\\]/success/page.test.tsx` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command above
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 0 | CPTXT-01 | — | N/A | unit | `npx vitest run src/lib/__tests__/cppa-complaint-generator.test.ts` | ❌ W0 | ⬜ pending |
| 9-01-02 | 01 | 1 | CPTXT-02 | — | q4 has no statute citations | unit | `npx vitest run src/lib/__tests__/cppa-complaint-generator.test.ts` | ❌ W0 | ⬜ pending |
| 9-01-03 | 01 | 1 | CPTXT-03 | — | Visit date is readable text | unit | same | ❌ W0 | ⬜ pending |
| 9-01-04 | 01 | 1 | CPTXT-04 | T-9-01 | User text integrated, not orphaned | unit | same | ❌ W0 | ⬜ pending |
| 9-01-05 | 01 | 1 | CPTXT-05 | — | Business name format correct | unit | same | ❌ W0 | ⬜ pending |
| 9-01-06 | 01 | 1 | DESC-03 | — | Checkbox mapping per category | unit | same | ❌ W0 | ⬜ pending |
| 9-02-01 | 02 | 1 | AGPDF-01 | — | 6 form section headers present | unit | `npx vitest run src/lib/__tests__/generate-complaint-pdf.test.ts` | ✅ modify | ⬜ pending |
| 9-02-02 | 02 | 1 | AGPDF-02 | — | No salutation, no closing, no § | unit | same | ✅ modify | ⬜ pending |
| 9-02-03 | 02 | 1 | AGPDF-03 | — | No "N/A" in PDF output | unit | same | ✅ modify | ⬜ pending |
| 9-03-01 | 03 | 1 | SUCC-01 | — | 3-channel sections in HTML | unit | `npx vitest run src/app/filing/\\[id\\]/success/page.test.tsx` | ✅ modify | ⬜ pending |
| 9-03-02 | 03 | 1 | SUCC-02 | — | Correct hrefs for CPPA guide and PDF | unit | same | ✅ modify | ⬜ pending |
| 9-03-03 | 03 | 1 | SUCC-03 | — | Fax ID/status shown; pending fallback | unit | same | ✅ modify | ⬜ pending |
| 9-03-04 | 03 | 1 | SUCC-04 | — | Guest CTA present when userId null | unit | same | ✅ verify | ⬜ pending |
| 9-03-05 | 03 | 1 | ADA-01 | — | CPPA sections hidden for accessibility | unit | same | ✅ modify | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/cppa-complaint-generator.test.ts` — new test file covering CPTXT-01 through CPTXT-05 and DESC-03; import `generateCPPAComplaint` from `../cppa-complaint-generator`
- [ ] Update `src/lib/__tests__/generate-complaint-pdf.test.ts` — remove `'Respectfully submitted'` and `'Re:'` assertions (broken by AGPDF-02); add 6 form section header checks + `§` and `'Dear Attorney General'` prohibition checks
- [ ] Update `src/app/filing/[id]/success/page.test.tsx` — add tests for 3-channel sections, ADA conditional, fax status display; verify SUCC-04 guest CTA preserved

*Wave 0 must complete before Wave 1 tasks run.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CPPA guide link opens cppa.ca.gov in new tab | SUCC-02 | Browser tab behavior not testable in vitest | Load /filing/{id}/success, click "File Now — Step-by-Step Guide", verify new tab opens to https://cppa.ca.gov/webapplications/complaint |
| AG PDF renders correctly on-screen | AGPDF-01 | Visual layout requires PDF viewer | Generate filing, download complaint PDF, verify 6 sections visible with labels, no "N/A", no statute text |
| CPPA paper PDF link accessible | SUCC-02 | Requires Phase 11 cppa-pdf route | Stub check: link href = `/api/filings/{id}/cppa-pdf`; actual download tested in Phase 11 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
