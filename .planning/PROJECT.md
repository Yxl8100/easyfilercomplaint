# EasyFilerComplaint

## What This Is

EasyFilerComplaint (easyfilercomplaint.com) is a consumer complaint filing platform. A consumer fills out a short form about a website that violated their privacy, pays $1.99, and EFC generates a formal complaint PDF and faxes it to a government agency (currently CA Attorney General). The consumer receives a filing receipt email with a copy of the complaint PDF attached.

## Core Value

A consumer can pay $1.99 and have a formal privacy complaint filed with a government agency in under 5 minutes — creating both documented economic injury and an independent government paper trail.

## Requirements

### Validated

- ✓ Filing wizard UI (multi-step form) — existing
- ✓ Homepage / landing page scaffold — existing
- ✓ Modern editorial design (Fraunces + Inter, white/gray palette) — existing
- ✓ Prisma schema foundation + Neon database — existing
- ✓ Next.js 14 app structure + Vercel deployment — existing
- ✓ pdf-lib installed and available — existing
- ✓ Resend email integration (stub) — existing

### Active

- [ ] Stripe $1.99 checkout integration
- [ ] Stripe webhook handler (payment confirmation → pipeline trigger)
- [ ] Complaint PDF generation (formal government-style document)
- [ ] Phaxio fax delivery to CA AG
- [ ] Filing pipeline orchestrator (PDF → fax → email in sequence)
- [ ] Filing receipt confirmation email with PDF attachment
- [x] Prisma schema: Filing model with Stripe + Phaxio + receipt fields — Validated in Phase 01: schema-and-data-model
- [ ] Guest-to-account conversion flow (post-filing)
- [ ] Filing history page (/account/filings)
- [ ] Auth middleware protecting /account/* routes
- [ ] Landing page with full consumer-facing copy
- [ ] Privacy policy, Terms of Service, About pages
- [ ] Filing wizard UX adjustments (labels, agency selection, evidence upload)
- [ ] Evidence file upload (Vercel Blob) + attach to fax

### Out of Scope

- FCC filing — requires web form submission, not fax; different integration, deferred to v2
- Multiple agencies at launch — CA AG only for v1
- Full password reset flow — "contact support" fallback for v1
- OAuth / social login — email+password only for v1
- Attorney features / demand letters / litigation pipeline — EFC is a standalone consumer tool; no cross-entity references
- Real-time fax status updates — polling + Phaxio webhook covers it
- Subscription plans — flat $1.99 per filing, no recurring billing

## Context

**Stack:** Next.js 14 (App Router) / Prisma / Neon (Postgres) / Resend / pdf-lib / Vercel

**What's already built:**
- Multi-step filing wizard (pages/components exist)
- Auto-submit engine (currently stubbed, `EFC_LIVE_SUBMIT` flag is off)
- Homepage scaffold with restyled theme
- Basic Prisma schema (may need extension for Stripe/Phaxio fields)

**What's NOT live:**
- Stripe payment processing
- Phaxio fax submission
- Real complaint PDF generation
- Receipt email with PDF attachment

**Critical infrastructure notes:**
- Always use `www.` prefix in all URLs (non-www Vercel redirect strips headers/params, breaking Stripe webhook signatures and Checkout return URLs)
- Stripe webhook endpoint: `https://www.easyfilercomplaint.com/api/webhooks/stripe`
- Phaxio webhook endpoint: `https://www.easyfilercomplaint.com/api/webhooks/phaxio`
- CA AG fax number MUST be verified against oag.ca.gov before go-live
- Entity separation: zero references to DPW, Pro Veritas Law, APFC, ComplianceSweep, IdentifiedVerified across all pages and emails

**Domain:** easyfilercomplaint.com (note: deployed at easyfilercompliant.com — verify actual domain)

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
*Last updated: 2026-04-01 — Phase 01 complete: schema extended with FilingStatus enum, all Stripe/Phaxio/receipt fields, guest filing support, vitest infrastructure*
