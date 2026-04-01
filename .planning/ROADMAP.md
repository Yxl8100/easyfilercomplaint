# Roadmap: EasyFilerComplaint — v1 Live Filing Pipeline

**Milestone:** v1 — Stripe + Phaxio Live Pipeline
**Goal:** Wire up real payment and filing so consumers can pay $1.99 and have a complaint faxed to CA AG.
**Created:** 2026-03-31

---

## Phases

- [x] **Phase 1: Schema & Data Model** - Extend Prisma schema to support full filing lifecycle
- [x] **Phase 2: Stripe Payment Integration** - Consumer pays $1.99 and Filing record is updated on confirmation
- [x] **Phase 3: Complaint PDF Generation** - Generate formal government-style complaint letter PDF with embedded fonts (completed 2026-04-01)
- [ ] **Phase 4: Phaxio Fax Integration + Filing Pipeline** - Deliver PDF to CA AG via fax and wire full pipeline orchestrator
- [ ] **Phase 5: Filing Receipt Email** - Send consumer confirmation email with complaint PDF attached
- [ ] **Phase 6: Guest-to-Account Conversion** - Post-filing account creation with filing history
- [ ] **Phase 7: Landing Page & Legal Pages** - Consumer-facing copy and required legal pages
- [ ] **Phase 8: Filing Wizard UX Adjustments** - Wizard polish: labels, evidence upload, agency selection

---

## Phase Details

### Phase 1: Schema & Data Model
**Goal**: All Filing lifecycle fields (Stripe, Phaxio, receipt ID) exist in the database schema
**Depends on**: Nothing (first phase)
**Requirements**: SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04, SCHEMA-05, SCHEMA-06, SCHEMA-07, SCHEMA-08
**Success Criteria** (what must be TRUE):
  1. Prisma migration runs cleanly against Neon without errors
  2. Filing record can transition through all lifecycle states (draft → pending_payment → paid → generating → filing → filed → failed)
  3. Filing receipt ID generator produces unique EFC-YYYYMMDD-XXXXX formatted IDs
  4. Guest filings (no userId) and authenticated filings coexist in schema
**Plans**: 2/2 complete

### Phase 2: Stripe Payment Integration
**Goal**: Consumer can pay $1.99 via Stripe Checkout and have their Filing record confirmed as paid
**Depends on**: Phase 1
**Requirements**: PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, PAY-06, PAY-07, PAY-08
**Success Criteria** (what must be TRUE):
  1. Consumer clicking "Pay & File" redirects to Stripe Checkout
  2. Successful Stripe payment updates Filing.paymentStatus to paid and assigns a filingReceiptId
  3. Expired Stripe session resets Filing to draft (consumer can retry)
  4. Success page at /filing/[id]/success displays receipt ID, filing details, and account creation CTA
**Plans**: 5/5 complete

### Phase 3: Complaint PDF Generation
**Goal**: A paid filing produces a formal, font-embedded government complaint letter PDF stored in Vercel Blob
**Depends on**: Phase 2
**Requirements**: PDF-01, PDF-02, PDF-03, PDF-04, PDF-05, PDF-06, PDF-07
**Success Criteria** (what must be TRUE):
  1. generateComplaintPdf() returns a Uint8Array containing a valid PDF with all 13 required letter sections
  2. PDF body copy changes correctly for each complaint type (privacy_tracking, accessibility, video_sharing)
  3. Generated PDF is stored in Vercel Blob and Filing.complaintPdfUrl is set on the record
  4. An automated assertion confirms the PDF bytes contain zero occurrences of prohibited strings (DPW, Pro Veritas, APFC, ComplianceSweep, IdentifiedVerified, attorney, law firm)
  5. PDF renders consistently because it uses an embedded font via @pdf-lib/fontkit (not Standard Fonts)
**Plans**: 2 plans
Plans:
- [x] 03-01-PLAN.md — PDF generation core: deps, fonts, video-sharing template, generateComplaintPdf() with 13 sections
- [x] 03-02-PLAN.md — Vercel Blob storage + Filing.complaintPdfUrl update
**UI hint**: no

### Phase 4: Phaxio Fax Integration + Filing Pipeline
**Goal**: A paid complaint PDF is delivered to the CA AG fax number and the Filing record reflects the full pipeline lifecycle
**Depends on**: Phase 3
**Requirements**: FAX-01, FAX-02, FAX-03, FAX-04, FAX-05, FAX-06, FAX-07, FAX-08, FAX-09, PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05, PIPE-06
**Success Criteria** (what must be TRUE):
  1. sendFax() successfully transmits the complaint PDF (and optional evidence file) to the CA AG fax number via Phaxio, updating Filing.faxId and faxStatus
  2. Phaxio delivery webhook at /api/webhooks/phaxio updates fax status on the Filing record with HMAC-SHA1 signature verification
  3. A fax failure does NOT prevent the consumer from receiving a receipt email — the email step runs regardless of fax outcome
  4. The Stripe webhook calls executeFilingPipeline() with maxDuration=60 and an idempotency guard that skips already-processed filings
  5. Vercel cron job polls Phaxio fax status every 15 minutes as a fallback (note: requires Vercel Pro; on Hobby use hourly fallback schedule 0 */1 * * *)
**Plans**: TBD
**UI hint**: no

### Phase 5: Filing Receipt Email
**Goal**: Consumer receives a branded confirmation email with the complaint PDF attached after every paid filing
**Depends on**: Phase 4
**Requirements**: EMAIL-01, EMAIL-02, EMAIL-03, EMAIL-04, EMAIL-05, EMAIL-06
**Success Criteria** (what must be TRUE):
  1. Consumer receives an email from noreply@easyfilercomplaint.com with filing ID, business name, agency, date filed, and amount paid
  2. Email attachment is named EFC_Filing_{filingReceiptId}.pdf and contains the complaint PDF
  3. Filing.receiptEmailSentAt is set on the record after successful send
  4. Email body contains zero occurrences of prohibited strings (DPW, PV Law, APFC, lawsuits, attorney)
**Plans**: TBD
**UI hint**: no

### Phase 6: Guest-to-Account Conversion
**Goal**: Allow post-filing account creation so consumers can track their filing history
**Depends on**: Phase 5
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07
**Success Criteria** (what must be TRUE):
  1. Consumer can create an account from the success page with email pre-filled and password set
  2. New account links all prior same-email filings to the user record
  3. Authenticated user can view filing history at /account/filings with PDF download links
  4. Unauthenticated requests to /account/* redirect to /login
**Plans**: TBD

### Phase 7: Landing Page & Legal Pages
**Goal**: Full consumer-facing copy on homepage plus required legal pages establishing EFC as a filing service
**Depends on**: Phase 6
**Requirements**: MKTG-01, MKTG-02, MKTG-03, MKTG-04, MKTG-05, MKTG-06, MKTG-07
**Success Criteria** (what must be TRUE):
  1. Homepage hero displays "File a Privacy Complaint in 5 Minutes" with a working CTA
  2. How It Works 3-step section and collapsible FAQ (5 questions) appear on homepage
  3. Privacy policy, Terms of Service, and About pages are accessible at /privacy, /terms, /about
  4. All pages pass entity separation audit with zero prohibited references
**Plans**: TBD
**UI hint**: yes

### Phase 8: Filing Wizard UX Adjustments
**Goal**: Wizard steps match final product decisions: plain English complaint types, CA AG only, evidence upload, California default
**Depends on**: Phase 7
**Requirements**: WIZ-01, WIZ-02, WIZ-03, WIZ-04, WIZ-05, WIZ-06, WIZ-07
**Success Criteria** (what must be TRUE):
  1. Complaint type step shows plain English labels (not technical codes) mapped to correct complaint type values
  2. Details step includes approximate visit date dropdown and optional evidence file upload (PDF/PNG/JPG, max 5MB)
  3. Agency step shows CA AG as the only active option with FCC marked "coming soon"
  4. Evidence file is stored in Vercel Blob and attached to the fax alongside the complaint PDF
**Plans**: TBD
**UI hint**: yes

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Schema & Data Model | 2/2 | Complete | 2026-04-01 |
| 2. Stripe Payment Integration | 5/5 | Complete | 2026-04-01 |
| 3. Complaint PDF Generation | 2/2 | Complete   | 2026-04-01 |
| 4. Phaxio Fax Integration + Filing Pipeline | 0/? | Not started | - |
| 5. Filing Receipt Email | 0/? | Not started | - |
| 6. Guest-to-Account Conversion | 0/? | Not started | - |
| 7. Landing Page & Legal Pages | 0/? | Not started | - |
| 8. Filing Wizard UX Adjustments | 0/? | Not started | - |

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
PHAXIO_CALLBACK_TOKEN=...
RESEND_API_KEY=re_...
BLOB_READ_WRITE_TOKEN=...
CRON_SECRET=...
```

---
*Roadmap created: 2026-03-31*
*Last updated: 2026-04-01 — Phase 3 planned: 2 plans in 2 waves*
*Milestone: v1 -- 8 phases, 61 requirements*
