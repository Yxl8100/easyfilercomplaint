---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Triple-Filing (CPPA + CA AG + PDF)
status: planning
last_updated: "2026-05-03T00:00:00.000Z"
last_activity: 2026-05-03 -- Milestone v2.0 started
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# State: EasyFilerComplaint

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-03)

**Core value:** A consumer can pay $1.99 and have a formal privacy complaint filed with government agencies in under 5 minutes — via CPPA guided form, CPPA paper PDF, and CA AG fax.
**Current focus:** Milestone v2.0 — defining phases

## Current Position

Phase: Not started (defining roadmap)
Plan: —
Status: Roadmap being created
Last activity: 2026-05-03 — Milestone v2.0 started

## Phase Status

_(phases will be added when roadmap is created)_

## Milestone Context (v1 Complete)

v1 milestone (Phases 1–7 complete, Phase 8 planned):

- Phase 1: Prisma schema extended (SCHEMA-01–08) — Neon deployed
- Phase 2: Stripe checkout wired (PAY-01–08) — verified
- Phase 3: Complaint PDF generation with embedded fonts (PDF-01–07) — complete
- Phase 4: Sinch fax pipeline to CA AG + orchestrator (FAX-01–09, PIPE-01–06) — complete
- Phase 5: Filing receipt email via Resend (EMAIL-01–06) — complete
- Phase 6: Guest-to-account conversion + filing history (AUTH-01–07) — complete
- Phase 7: Landing page + legal pages + entity separation tests (MKTG-01–07) — complete
- Phase 8: Filing wizard UX adjustments (WIZ-01–07) — planned, not yet executed

## Decisions Log

| Date | Decision | Context |
|------|----------|---------|
| 2026-03-31 | Standard granularity, YOLO mode, parallel execution | Initial config |
| 2026-03-31 | Research + plan-check + verifier all enabled | Quality gates on |
| 2026-04-01 | axios + form-data for fax calls (not native fetch) | Node.js 18-23.6 multipart CRLF bug |
| 2026-04-01 | Vercel Blob access: 'private' for all complaint PDFs | PII content |
| 2026-04-02 | JWT session strategy for NextAuth Credentials provider | Database strategy silently fails |
| 2026-05-03 | CPPA becomes primary filing channel (not CA AG fax) | CPPA is primary CCPA enforcer since July 2023 |
| 2026-05-03 | ADA complaints excluded from CPPA channel | ADA is not a CCPA violation — CPPA has no jurisdiction |
| 2026-05-03 | AG PDF restructured to form-style (not legal letter) | Real consumers don't cite §1798.100; looks automated |
| 2026-05-03 | Complaint description ≤2000 chars, no statute citations | CPPA form character limit; naturalness requirement |

## Critical Notes

- CA AG fax number in agency-directory.ts is a placeholder — MUST verify against oag.ca.gov before go-live
- www. prefix is critical in all production URLs (Vercel redirect behavior strips headers on non-www)
- Entity separation must be verified across ALL pages, emails, and PDFs — automated assertion required
- Fax provider: Sinch (sinch-fax.ts) — old Phaxio references in ROADMAP.md are superseded
- @pdf-lib/fontkit installed — needed for embedded fonts in both AG and CPPA PDFs
- Vercel cron at */15 requires Pro plan; use 0 */1 * * * on Hobby

## Accumulated Context

**From v1:**
- generate-complaint-pdf.ts: existing CA AG complaint generator (legal letter style — needs restructuring in Phase 3 of v2)
- complaint-generator.ts: existing complaint text generator — review before writing cppa-complaint-generator.ts
- sinch-fax.ts: Sinch fax integration (replaces old Phaxio references in v1 planning docs)
- store-complaint-pdf.ts: Vercel Blob storage utility — reuse pattern for CPPA PDF storage
- /api/filings/[id]/pdf: existing PDF proxy route — use as pattern for /api/filings/[id]/cppa-pdf
- Success page at /filing/[id]/success: needs full redesign to show 3 channels

**For v2.0:**
- CPPA form URL: cppa.ca.gov/webapplications/complaint (new tab link on guide page)
- CPPA mailing address: California Privacy Protection Agency, ATTN: Complaints, 400 R Street, Suite 350, Sacramento, CA 95811
- CPPA complaint description character limit: 2000 characters
- Complaint types: privacy_tracking → 2 CPPA checkboxes; video_sharing → 1 CPPA checkbox; accessibility (ADA) → no CPPA channel

*Last updated: 2026-05-03 — Milestone v2.0 started: Triple-Filing. Roadmap being created.*
