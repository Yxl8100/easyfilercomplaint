---
phase: 1
slug: schema-and-data-model
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (or none — Wave 0 installs if missing) |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | SCHEMA-01..06 | schema audit | `npx prisma validate` | ✅ | ⬜ pending |
| 1-01-02 | 01 | 1 | SCHEMA-01..06 | schema lint | `npx prisma validate` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 1 | SCHEMA-07 | schema lint | `npx prisma validate` | ❌ W0 | ⬜ pending |
| 1-01-04 | 01 | 2 | SCHEMA-08 | unit | `npx vitest run src/lib/filing-receipt-id` | ❌ W0 | ⬜ pending |
| 1-01-05 | 01 | 3 | SCHEMA-01..08 | integration | `npx prisma db push --accept-data-loss` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/filing-receipt-id.test.ts` — unit tests for EFC-YYYYMMDD-XXXXX generator (SCHEMA-08)
- [ ] `vitest.config.ts` — if not already present in repo

*Existing prisma validate covers schema structure; unit tests cover the ID generator utility.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Neon DB accepts enum migration without data loss | SCHEMA-04 | DB state unknown; `db push` may require `--accept-data-loss` | Run `npx prisma db push`, check for warnings about data loss on `status` field |
| FilingReceiptId uniqueness in DB | SCHEMA-03 | Requires live DB query | `SELECT filing_receipt_id, COUNT(*) FROM filings GROUP BY filing_receipt_id HAVING COUNT(*) > 1` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
