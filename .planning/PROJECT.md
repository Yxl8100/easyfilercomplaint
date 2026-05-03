# EasyFilerComplaint

## What This Is

EasyFilerComplaint (easyfilercomplaint.com) is a consumer complaint filing platform. A consumer fills out a short form about a website that violated their privacy, pays $1.99, and EFC provides three filing channels: a guided CPPA online form walkthrough with pre-written copy-paste text, a downloadable CPPA paper complaint PDF, and an auto-faxed complaint to the CA Attorney General. The consumer receives a filing receipt email and full access to all three channels.

## Core Value

A consumer can pay $1.99 and have a formal privacy complaint filed with a government agency in under 5 minutes — creating both documented economic injury and an independent government paper trail.

## Current Milestone: v2.0 Triple-Filing (CPPA + CA AG + PDF)

**Goal:** Add CPPA as the primary filing channel with a guided online form walkthrough and downloadable paper PDF, while restructuring the CA AG complaint PDF to match form expectations — giving every $1.99 filing three channels.

**Target features:**
- CPPA text generator (pre-written answers for all 7 CPPA form questions)
- CPPA guided filing page at /filing/[id]/cppa-guide with per-question copy buttons
- CPPA paper complaint PDF (mirrors official form layout, downloadable)
- Success page redesign — three channel sections with status
- CA AG PDF restructure — form-style layout, no legal letter, no statute citations
- Complaint description improvements — natural language, ≤2000 chars, integrated user description
- Wizard complaint type → CPPA checkbox mapping (ADA excluded from CPPA channel)

## Requirements

### Validated

- ✓ Filing wizard UI (multi-step form) — existing
- ✓ Homepage / landing page scaffold — existing
- ✓ Modern editorial design (Fraunces + Inter, white/gray palette) — existing
- ✓ Prisma schema foundation + Neon database — existing
- ✓ Next.js 14 app structure + Vercel deployment — existing
- ✓ pdf-lib installed and available — existing
- ✓ Resend email integration (stub) — existing

### Active (v2.0)

- [ ] CPPA guided filing page at /filing/[id]/cppa-guide with copy buttons and external form link
- [ ] CPPA paper complaint PDF (generateCPPAComplaintPdf) — mirrors official form, Blob storage
- [ ] Wizard complaint type → CPPA checkbox mapping

### Validated (v2.0)

- ✓ CPPA text generator (generateCPPAComplaint) — all 7 question answers, natural language, ≤2000 chars — Phase 09 (2026-05-03)
- ✓ Success page redesign — three filing channel sections with status indicators — Phase 09 (2026-05-03)
- ✓ CA AG complaint PDF restructured — form-style, no legal letter, no statute citations — Phase 09 (2026-05-03)
- ✓ ADA complaint type excludes CPPA channel (CA AG fax only for ADA) — Phase 09 (2026-05-03)

### Validated

- ✓ Complaint PDF generation (formal government-style document) — Phase 03 (2026-04-01)
- ✓ Sinch fax delivery to CA AG + filing pipeline orchestrator — Phase 04
- ✓ Filing receipt confirmation email with PDF attachment (Resend) — Phase 05 (2026-04-01)
- ✓ Stripe $1.99 checkout integration — Phase 02 (2026-04-01)
- ✓ Stripe webhook handler (payment confirmation → pipeline trigger) — Phase 02 (2026-04-01)
- ✓ Prisma schema: Filing model with Stripe + fax + receipt fields — Phase 01 (2026-04-01)
- ✓ Guest-to-account conversion flow (post-filing) — Phase 06 (2026-04-02)
- ✓ Filing history page (/account/filings) — Phase 06 (2026-04-02)
- ✓ Auth middleware protecting /account/* routes — Phase 06 (2026-04-02)
- ✓ Landing page with full consumer-facing copy — Phase 07 (2026-04-02)
- ✓ Privacy policy, Terms of Service, About pages — Phase 07 (2026-04-02)
- [ ] Filing wizard UX adjustments (labels, agency selection, evidence upload) — Phase 08 (in planning)

### Out of Scope

- FCC filing — requires web form submission, not fax; different integration, deferred to v2
- Multiple agencies at launch — CA AG only for v1
- Full password reset flow — "contact support" fallback for v1
- OAuth / social login — email+password only for v1
- Attorney features / demand letters / litigation pipeline — EFC is a standalone consumer tool; no cross-entity references
- Real-time fax status updates — polling + Phaxio webhook covers it
- Subscription plans — flat $1.99 per filing, no recurring billing

## Context

**Stack:** Next.js 14 (App Router) / Prisma / Neon (Postgres) / Sinch (fax) / Resend (email) / pdf-lib / Vercel Blob / Vercel

**What's already built (v1):**
- Full filing wizard (multi-step form) with Stripe checkout
- Sinch fax pipeline to CA AG + Vercel Blob PDF storage
- Filing receipt email via Resend
- Guest-to-account conversion + filing history at /account/filings
- Landing page, Privacy Policy, Terms, About pages
- generate-complaint-pdf.ts (existing CA AG letter — needs restructuring in v2)
- complaint-generator.ts (existing complaint text generator — needs updating in v2)

**What's new in v2.0:**
- CPPA text generator (src/lib/cppa-complaint-generator.ts)
- CPPA paper PDF generator (src/lib/cppa-pdf-generator.ts)
- CPPA guide page (/filing/[id]/cppa-guide)
- Redesigned success page
- AG PDF restructured (no legal letter format)

**Critical infrastructure notes:**
- Always use `www.` prefix in all URLs (non-www Vercel redirect strips headers/params)
- Stripe webhook endpoint: `https://www.easyfilercomplaint.com/api/webhooks/stripe`
- Entity separation: zero references to DPW, Pro Veritas Law, APFC, ComplianceSweep, IdentifiedVerified
- Fax provider: Sinch (sinch-fax.ts) — not Phaxio

**Domain:** easyfilercomplaint.com

## Constraints

- **Tech stack**: Next.js 14 + Prisma + Neon + Vercel — do not introduce new frameworks
- **Entity separation**: No references to affiliated entities (DPW, PV Law, APFC, ComplianceSweep, IV) anywhere in the codebase or copy
- **Legal positioning**: EFC is a filing service, NOT a law firm — no attorney-client language
- **URL prefix**: All production URLs must use www. prefix (Vercel redirect behavior)
- **Governing law**: Arizona (where LLC is filed) — reflected in Terms of Service
- **CA AG fax number**: Must be verified from oag.ca.gov before go-live — placeholder in agency-directory.ts

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Direct pipeline call from Stripe webhook | Simplest path — no queue needed at this volume | — Pending |
| Guest filing first, account creation after payment | Reduces friction at checkout; email captured before payment | — Pending |
| CA AG via fax only at launch | FCC requires web form submission (different integration complexity) | — Pending |
| $1.99 flat fee, no subscription | Simple pricing; each filing is standalone value | — Pending |
| Vercel Blob for PDF/evidence storage | Already in Vercel ecosystem; simplest integration | — Pending |
| Phaxio for fax delivery | Direct API, supports multi-file attachments, test mode available | — Pending |
| bcrypt for password hashing | Standard; no new auth library needed | — Pending |
| JWT in httpOnly cookie for sessions | Consistent with ecosystem pattern | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-03 — Milestone v2.0 started: Triple-Filing (CPPA + CA AG + PDF). CPPA becomes primary channel. AG PDF restructured. Success page redesigned. 23 requirements defined across 7 categories.*
