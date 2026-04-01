---
phase: 04-phaxio-fax-integration-filing-pipeline
plan: "04"
subsystem: infra
tags: [phaxio, vercel, cron, fax, polling]

# Dependency graph
requires:
  - phase: 04-phaxio-fax-integration-filing-pipeline
    plan: "01"
    provides: "getFaxStatus(faxId) in phaxio.ts (axios-based), PhaxioFaxStatus interface"
provides:
  - "GET /api/cron/check-fax-status — Vercel cron handler polls Phaxio for in-progress fax statuses"
  - "vercel.json — Hobby-safe daily cron schedule (0 0 * * *)"
  - "Unit tests: 8 cases covering auth, no-op, terminal updates, skip-unchanged, error isolation"
affects:
  - filing-pipeline

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Vercel cron: Bearer token auth via CRON_SECRET env var"
    - "Per-filing error isolation: try/catch per loop iteration, errors logged but do not halt batch"
    - "Optimistic skip: only call prisma.filing.update when status has changed"

key-files:
  created:
    - src/app/api/cron/check-fax-status/route.ts
    - src/lib/__tests__/cron-check-fax.test.ts
    - vercel.json

key-decisions:
  - "Vercel cron schedule defaults to 0 0 * * * (once daily) — Hobby plan safe; Pro upgrade needed for */15 * * * * polling"
  - "Per-filing try/catch ensures one Phaxio API failure does not block other filings in the same cron run"
  - "Skip prisma.filing.update when faxStatus has not changed — avoids unnecessary writes on every cron tick"

patterns-established:
  - "Cron auth: check authorization header === Bearer ${CRON_SECRET} before any DB access"
  - "Terminal fax status mapping: success -> Filing.status=filed, failure -> Filing.status=failed"

requirements-completed: [FAX-05, FAX-06]

# Metrics
duration: 2min
completed: 2026-04-01
---

# Phase 4 Plan 04: Fax Status Polling Cron + vercel.json Summary

**Vercel cron handler polling Phaxio for in-progress fax statuses with CRON_SECRET auth, daily schedule safe for Hobby plan**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-01T19:13:29Z
- **Completed:** 2026-04-01T19:15:48Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments

- GET /api/cron/check-fax-status polls Phaxio for all filings with in-progress fax statuses (queued/pendingbatch/inprogress), updates Filing.faxStatus, faxPages, faxCompletedAt, and maps terminal statuses to Filing.status (filed/failed)
- vercel.json added at project root with Hobby-safe daily schedule (0 0 * * *); route contains comment with Pro upgrade path for 15-minute polling
- 8 unit tests covering: missing auth (401), wrong token (401), no filings (no-op), terminal success update, skip unchanged, terminal failure update, per-filing error isolation, getFaxStatus false response

## Task Commits

1. **Task 1: Create cron handler for fax status polling** - `473f555` (feat)
2. **Task 2: Create vercel.json with cron schedule** - `7b9628a` (chore)

**Plan metadata:** (docs commit — see final commit below)

## Files Created/Modified

- `src/app/api/cron/check-fax-status/route.ts` — Vercel cron GET handler; CRON_SECRET auth, Phaxio polling loop, terminal status transitions
- `src/lib/__tests__/cron-check-fax.test.ts` — 8 unit tests covering all acceptance criteria
- `vercel.json` — Project root cron configuration; Hobby-safe daily schedule

## Decisions Made

- Vercel cron schedule defaults to `0 0 * * *` (once daily) — Hobby plan safe. Pro upgrade needed for `*/15 * * * *` polling. Comment in route.ts documents the upgrade path.
- Per-filing try/catch ensures one Phaxio API failure does not block other filings in the same cron run.
- Skip `prisma.filing.update` when `faxStatus` has not changed — avoids unnecessary writes on every cron tick.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Worktree was behind master (did not have Phase 04 Plan 01/02 commits). Merged master into the worktree branch before executing to ensure phaxio.ts axios rewrite was available. No code changes needed as a result — the merge was a standard fast-forward.

## User Setup Required

- `CRON_SECRET` env var: generate with `openssl rand -hex 32` and add to Vercel project environment variables.
- For 15-minute polling: upgrade to Vercel Pro and change `vercel.json` schedule to `*/15 * * * *`.

## Next Phase Readiness

- Cron fallback is live — Phaxio webhooks (Plan 02) are primary status update path; this cron catches any missed webhook deliveries.
- Phase 04 is now complete: agency-directory, phaxio rewrite, webhook handler, filing pipeline orchestrator (Plan 03), and cron status poller (Plan 04) all done.
- Ready to proceed to Phase 05 (Filing Receipt Email).

---
*Phase: 04-phaxio-fax-integration-filing-pipeline*
*Completed: 2026-04-01*
