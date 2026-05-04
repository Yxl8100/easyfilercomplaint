# EasyFilerComplaint

## What This Is

EasyFilerComplaint (easyfilercomplaint.com) is a consumer privacy complaint filing service. A consumer fills out a short form about a website that violated their privacy, pays $1.99, and EFC files complaints through three government channels: a guided CPPA online form walkthrough with pre-written copy-paste answers, a downloadable CPPA paper complaint PDF matching the official form layout, and an auto-faxed complaint to the CA Attorney General. The consumer receives a filing receipt email with PDF attached.

## Core Value

A consumer can pay $1.99 and have a formal privacy complaint filed with a government agency in under 5 minutes — creating both documented economic injury and an independent government paper trail.

## Current State (v2.0 Shipped 2026-05-03)

Both v1.0 and v2.0 milestones complete. All three filing channels are live:
- **CPPA Online:** `/filing/[id]/cppa-guide` — guided page with pre-written answers for all 7 CPPA form questions, per-question copy buttons, UUID-only access
- **CPPA Paper PDF:** `GET /api/filings/[id]/cppa-pdf` — 10-section PDF mirroring official CPPA form layout, generated on demand, stored in Vercel Blob
- **CA AG Auto-Fax:** Sinch fax pipeline from Stripe webhook — unchanged since v1.0

**What's deferred to v3.0:** Phase 8 (Filing Wizard UX — WIZ-01–07: plain English labels, visit date picker, evidence upload, CA AG only, CA pre-select, review step)

## Requirements

### Validated (v2.0 — shipped 2026-05-03)

- ✓ CPPA narrative generator (`generateCPPAComplaint`) — all 7 CPPA question answers, natural language ≤2000 chars — Phase 9
- ✓ CA AG complaint PDF restructured — 6-section form layout, no legal letter, no statute citations — Phase 9
- ✓ Success page 3-channel redesign — CPPA Online (★), CPPA Paper PDF, CA AG (auto-filed); ADA shows CA AG only — Phase 9
- ✓ CPPA guided filing page at /filing/[id]/cppa-guide — CopyButton, UUID access, CPPA form CTA — Phase 10
- ✓ CPPA paper complaint PDF (`generateCPPAComplaintPdf`) — 10 sections, perjury attestation, signature line — Phase 11
- ✓ CPPA PDF download route — UUID-only access, Blob storage at `complaints/cppa/`, graceful fallback — Phase 11

### Validated (v1.0 — shipped 2026-04-02)

- ✓ Filing wizard UI (multi-step form) with Stripe $1.99 checkout — Phase 2
- ✓ Stripe webhook handler — payment confirmation triggers pipeline — Phase 2
- ✓ Complaint PDF generation with embedded fonts (pdf-lib + @pdf-lib/fontkit) — Phase 3
- ✓ Sinch fax delivery to CA AG + filing pipeline orchestrator — Phase 4
- ✓ Filing receipt email with PDF attachment (Resend) — Phase 5
- ✓ Guest-to-account conversion + filing history at /account/filings — Phase 6
- ✓ Auth middleware protecting /account/* routes (JWT, bcrypt) — Phase 6
- ✓ Landing page with "How It Works" + FAQ; legal pages (privacy, terms, about) — Phase 7
- ✓ Prisma schema: Filing model with all lifecycle fields — Phase 1

### Active (v3.0 — not yet planned)

- [ ] **Phase 8 deferred:** Filing wizard UX adjustments (WIZ-01–07) — plain English labels, visit date picker, evidence upload, CA AG only agency step, California pre-select, review step with truthfulness attestation
- [ ] **PAY-06:** Filing wizard final step → Stripe Checkout redirect (currently handled but needs UX polish)

### Out of Scope

- FCC filing — web form submission required, different integration; evaluate for v3.0
- Multiple agencies at launch — CA AG only
- Full password reset flow — "contact support" fallback
- OAuth / social login — email+password sufficient
- Attorney features / demand letters — EFC is a consumer tool only; no attorney-client relationship
- Real-time fax status — polling + webhooks sufficient
- Subscription billing — flat $1.99 per filing
- Admin dashboard / manual retry — operations tooling for later milestone
- Multi-agency pricing tiers — keeps $1.99 flat fee

## Context

**Stack:** Next.js 14 (App Router) / Prisma / Neon (Postgres) / Sinch (fax) / Resend (email) / pdf-lib + @pdf-lib/fontkit / Vercel Blob / Vercel

**Codebase state (post v2.0):**
- ~206 Vitest tests, 29 test files — 0 failing
- Key source files: `cppa-complaint-generator.ts`, `cppa-pdf-generator.ts`, `generate-complaint-pdf.ts`, `sinch-fax.ts`, `store-complaint-pdf.ts`
- Key routes: `/api/filings/[id]/cppa-pdf`, `/api/filings/[id]/pdf`, `/filing/[id]/cppa-guide`, `/filing/[id]/success`

**Critical infrastructure notes:**
- Always use `www.` prefix in all production URLs (non-www Vercel redirect strips headers/params)
- CA AG fax number in `agency-directory.ts` is a placeholder — MUST verify against oag.ca.gov before go-live
- Fax provider: Sinch (sinch-fax.ts) — NOT Phaxio (v1 docs referenced Phaxio; superseded)
- Vercel cron `*/15` requires Pro plan; use `0 */1 * * *` on Hobby
- Entity separation enforced: zero references to DPW, Pro Veritas Law, APFC, ComplianceSweep, IdentifiedVerified anywhere

**Known tech debt:**
- `drawWrappedText` duplicated between `generate-complaint-pdf.ts` and `cppa-pdf-generator.ts` — extract to `src/lib/pdf-utils.ts`
- Phase 9 human UAT: 3 items deferred (visual layout sign-off, fax status label decision)
- No integration test covering full consumer journey end-to-end

## Constraints

- **Tech stack**: Next.js 14 + Prisma + Neon + Vercel — do not introduce new frameworks
- **Entity separation**: No references to DPW, PV Law, APFC, ComplianceSweep, IV anywhere
- **Legal positioning**: EFC is a filing service, NOT a law firm — no attorney-client language
- **URL prefix**: All production URLs must use www. prefix (Vercel redirect behavior)
- **Governing law**: Arizona (where LLC is filed) — reflected in Terms of Service
- **CA AG fax number**: Must be verified from oag.ca.gov before go-live

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Direct pipeline call from Stripe webhook | Simplest path — no queue needed at this volume | ✓ Good |
| Guest filing first, account creation after payment | Reduces friction at checkout; email captured before payment | ✓ Good |
| CA AG via fax only at launch | FCC requires web form submission (different integration) | ✓ Good |
| $1.99 flat fee, no subscription | Simple pricing; each filing is standalone value | ✓ Good |
| Vercel Blob for PDF/evidence storage | Already in Vercel ecosystem; simplest integration | ✓ Good |
| Sinch for fax delivery | Direct API, supports multi-file attachments; Phaxio deprecated in v1 docs | ✓ Good |
| bcrypt + JWT in httpOnly cookie | Standard patterns; no new auth library needed | ✓ Good |
| CPPA as primary filing channel (not CA AG) | CPPA is primary CCPA enforcer since July 2023 — added v2.0 | ✓ Good |
| ADA complaints excluded from CPPA channel | ADA is not a CCPA violation; CPPA has no jurisdiction | ✓ Good |
| UUID-only access for /cppa-guide and /cppa-pdf | Allows guest filers to access their forms without login wall | ✓ Good |
| AG PDF → form-style, no legal letter | Real consumers don't cite §1798.100; legal letter looks automated | ✓ Good |
| Complaint narrative ≤2000 chars, no statute citations | CPPA form character limit; naturalness requirement | ✓ Good |
| pdf-lib `useObjectStreams: false` | Keeps Info dict uncompressed and grep-findable in tests | ✓ Good |
| axios for fax calls (not native fetch) | Node.js 18–23.6 multipart CRLF bug in native fetch | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase:** move completed requirements from Active → Validated; log new decisions.

**After each milestone:** full review — Core Value, Out of Scope audit, Context update.

---
*Last updated: 2026-05-03 — v2.0 milestone archived. Both milestones complete. v3.0 not yet planned — start with /gsd-new-milestone.*
