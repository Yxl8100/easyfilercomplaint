# Roadmap: EasyFilerComplaint — v1 Live Filing Pipeline

**Milestone:** v1 — Stripe + Phaxio Live Pipeline
**Goal:** Wire up real payment and filing so consumers can pay $1.99 and have a complaint faxed to CA AG.
**Created:** 2026-03-31

---

## Phase 1 — Schema & Data Model

**Goal:** Extend Prisma schema to support the full filing lifecycle (Stripe payments, Phaxio fax, receipt IDs).

**Why first:** All subsequent phases write to the Filing record. The schema must be finalized before any pipeline code is written.

**Plans:** 2/2 plans complete

Plans:
- [x] 01-01-PLAN.md — Extend Filing model + User passwordHash + FilingStatus enum + push to Neon
- [x] 01-02-PLAN.md — Filing receipt ID generator utility (TDD) + vitest setup

**Requirements covered:** SCHEMA-01 through SCHEMA-08

**Commit:** `feat: extend schema for Stripe payments + Phaxio fax filing`

---

## Phase 2 — Stripe Payment Integration

**Goal:** Consumer can pay $1.99 via Stripe Checkout and have their Filing record updated on payment confirmation.

**Why:** Payment is the revenue gate. Nothing proceeds to filing until payment is confirmed via webhook.

**Plans:** 5 plans

Plans:
- [x] 02-01-PLAN.md — Stripe client singleton (src/lib/stripe.ts, lazy-init, STRIPE_SECRET_KEY guard)
- [ ] 02-02-PLAN.md — POST /api/checkout endpoint (creates Filing + Stripe session, returns URL)
- [ ] 02-03-PLAN.md — POST /api/webhooks/stripe (signature verify, paid/draft lifecycle updates, idempotency)
- [ ] 02-04-PLAN.md — Wire wizard final step to /api/checkout + Stripe redirect + Review & Pay UI
- [ ] 02-05-PLAN.md — /filing/[id]/success page (receipt ID, filing details, PDF link, account CTA)

**Requirements covered:** PAY-01 through PAY-08

**Commit:** `feat: Stripe checkout integration for $1.99 filing payment`

---

## Phase 3 — Complaint PDF Generation

**Goal:** Generate a formal, single-page government-style complaint letter as a PDF using pdf-lib.

**Why:** The PDF is the core deliverable — it's what gets faxed to the agency and emailed to the consumer.

### Plans

1. **PDF generator function** — src/lib/generate-complaint-pdf.ts (all complaint types, all agency variants)
2. **Vercel Blob storage** — Upload PDF after generation, store URL on Filing record
3. **Fallback storage** — If BLOB_READ_WRITE_TOKEN not set, store base64 in DB with TODO note
4. **Entity separation audit** — Verify PDF output has zero prohibited references

**Requirements covered:** PDF-01 through PDF-06

**Commit:** `feat: complaint PDF generator for government agency filings`

---

## Phase 4 — Phaxio Fax Integration + Filing Pipeline

**Goal:** Send the generated PDF to the CA AG via Phaxio fax, and wire up the full pipeline orchestrator.

**Why:** Fax delivery to the agency is the action that creates the government paper trail.

### Plans

1. **Phaxio client** — src/lib/phaxio.ts (sendFax, getFaxStatus, Basic auth, FormData upload)
2. **Agency directory** — src/lib/agency-directory.ts (CA AG only; fax number placeholder with verification note)
3. **Filing pipeline orchestrator** — src/lib/filing-pipeline.ts (PDF → store → fax → email sequence)
4. **Phaxio webhook handler** — POST /api/webhooks/phaxio (updates fax status on delivery)
5. **Cron fax status poller** — GET /api/cron/check-fax-status + vercel.json cron entry (15-min schedule)

**Requirements covered:** FAX-01 through FAX-07, PIPE-01 through PIPE-05

**Commit:** `feat: Phaxio fax integration + filing pipeline orchestrator`

---

## Phase 5 — Filing Receipt Email

**Goal:** Send the consumer a confirmation email with the complaint PDF attached immediately after filing.

**Why:** The consumer needs proof of filing for their personal records. This is the primary consumer-facing output.

### Plans

1. **Receipt email function** — src/lib/send-filing-receipt-email.ts (Resend, HTML + plain text)
2. **PDF attachment** — Attach complaint PDF as EFC_Filing_{filingReceiptId}.pdf
3. **Hook into pipeline** — Verify pipeline step 9 calls sendFilingReceiptEmail correctly
4. **Entity separation audit** — Verify email has zero prohibited references

**Requirements covered:** EMAIL-01 through EMAIL-06

**Commit:** `feat: filing receipt confirmation email with PDF attachment`

---

## Phase 6 — Guest-to-Account Conversion

**Goal:** Allow post-filing account creation so consumers can track their filing history.

**Why:** Filing history requires an account. Guest flow is frictionless at checkout; account prompt comes after.

### Plans

1. **Account creation form** — On success page: name/email pre-filled, password fields, submit → create User
2. **bcrypt password hashing + User record creation** — POST /api/account/create
3. **Filing linkage** — Link current + prior same-email filings to new User on account creation
4. **Login page** — /login with email + password, JWT cookie session
5. **Auth middleware** — src/middleware.ts protects /account/* routes
6. **Filing history page** — /account/filings table with status, dates, PDF download links

**Requirements covered:** AUTH-01 through AUTH-07

**Commit:** `feat: guest-to-account conversion + filing history page`

---

## Phase 7 — Landing Page & Legal Pages

**Goal:** Full consumer-facing copy on homepage + required legal pages (privacy, terms, about).

**Why:** Required before accepting real payments. Legal pages establish EFC as a filing service, not a law firm.

### Plans

1. **Homepage hero + How It Works + Why File** — Update existing homepage components with finalized copy
2. **FAQ section** — Collapsible FAQ (5 questions) on homepage
3. **Privacy policy page** — /privacy (CCPA section, third-party disclosures)
4. **Terms of Service page** — /terms (filing service, not law firm; AZ governing law)
5. **About page** — /about (independent company description, zero entity references)
6. **Entity separation audit** — Scan all pages for prohibited references

**Requirements covered:** MKTG-01 through MKTG-07

**Commit:** `feat: landing page, privacy policy, terms, about page`

---

## Phase 8 — Filing Wizard UX Adjustments

**Goal:** Adjust wizard steps to match final product decisions: plain English labels, CA AG only, evidence upload.

**Why:** Last polish phase before go-live. Wizard must reflect the final complaint types, agency selection, and evidence upload feature.

### Plans

1. **Audit existing wizard steps** — Read all step components before modifying anything
2. **Complaint type step** — Plain English labels mapping to complaintType codes
3. **Details step** — Visit date dropdown, evidence file upload (PDF/PNG/JPG, 5MB max)
4. **Agency step** — CA AG only at launch; FCC grayed out with "coming soon"
5. **Filer info step** — State dropdown defaulting to California
6. **Review & Pay step** — Summary + truthfulness attestation + "Pay & File — $1.99" button
7. **Evidence upload backend** — Vercel Blob storage for evidence files + fax attachment logic

**Requirements covered:** WIZ-01 through WIZ-07

**Commit:** `feat: filing wizard UX adjustments + evidence upload`

---

## Pre-Launch Checklist

Before enabling `EFC_LIVE_SUBMIT` or switching Stripe to live mode:

- [ ] Verify CA AG fax number against oag.ca.gov
- [ ] Test full flow in Stripe test mode: wizard -> checkout -> webhook -> PDF -> fax -> email
- [ ] Verify Stripe webhook URL uses www. prefix
- [ ] Verify easyfilercomplaint.com domain verified in Resend
- [ ] Phaxio account funded and tested
- [ ] Evidence upload + multi-attachment fax tested
- [ ] Guest-to-account flow tested end-to-end
- [ ] All pages pass entity separation audit
- [ ] Privacy policy and Terms published
- [ ] Mobile rendering verified

## Environment Variables

```
NEXT_PUBLIC_APP_URL=https://www.easyfilercomplaint.com
DATABASE_URL=<Neon connection string>
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
PHAXIO_API_KEY=...
PHAXIO_API_SECRET=...
RESEND_API_KEY=re_...
BLOB_READ_WRITE_TOKEN=...
```

---
*Roadmap created: 2026-03-31*
*Milestone: v1 -- 8 phases, ~57 requirements*
