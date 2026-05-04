# Roadmap: EasyFilerComplaint — v1 Live Filing Pipeline

**Milestone:** v1 — Stripe + Phaxio Live Pipeline
**Goal:** Wire up real payment and filing so consumers can pay $1.99 and have a complaint faxed to CA AG.
**Created:** 2026-03-31

---

## Phases

- [x] **Phase 1: Schema & Data Model** - Extend Prisma schema to support full filing lifecycle
- [x] **Phase 2: Stripe Payment Integration** - Consumer pays $1.99 and Filing record is updated on confirmation
- [x] **Phase 3: Complaint PDF Generation** - Generate formal government-style complaint letter PDF with embedded fonts (completed 2026-04-01)
- [x] **Phase 4: Phaxio Fax Integration + Filing Pipeline** - Deliver PDF to CA AG via fax and wire full pipeline orchestrator (completed 2026-04-01)
- [x] **Phase 5: Filing Receipt Email** - Send consumer confirmation email with complaint PDF attached (completed 2026-04-01)
- [x] **Phase 6: Guest-to-Account Conversion** - Post-filing account creation with filing history (completed 2026-04-02)
- [x] **Phase 7: Landing Page & Legal Pages** - Consumer-facing copy and required legal pages (completed 2026-04-02)
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
**Plans**: 4 plans
Plans:
- [x] 04-01-PLAN.md — Agency directory, phaxio.ts rewrite (axios), filerInfo schema + checkout storage
- [x] 04-02-PLAN.md — Phaxio webhook handler with HMAC-SHA1 signature verification
- [x] 04-03-PLAN.md — Filing pipeline orchestrator + Stripe webhook wiring
- [x] 04-04-PLAN.md — Cron job for fax status polling + vercel.json
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
**Plans**: 2 plans
**Plans**: 2/2 complete
Plans:
- [x] 06-01-PLAN.md — Auth infrastructure: bcryptjs, Credentials provider, JWT session, register API, middleware protection
- [x] 06-02-PLAN.md — UI pages: account creation, login, filing history, PDF proxy, success page CTA update

### Phase 7: Landing Page & Legal Pages
**Goal**: Full consumer-facing copy on homepage plus required legal pages establishing EFC as a filing service
**Depends on**: Phase 6
**Requirements**: MKTG-01, MKTG-02, MKTG-03, MKTG-04, MKTG-05, MKTG-06, MKTG-07
**Success Criteria** (what must be TRUE):
  1. Homepage hero displays "File a Privacy Complaint in 5 Minutes" with a working CTA
  2. How It Works 3-step section and collapsible FAQ (5 questions) appear on homepage
  3. Privacy policy, Terms of Service, and About pages are accessible at /privacy, /terms, /about
  4. All pages pass entity separation audit with zero prohibited references
**Plans**: 3 plans
Plans:
- [x] 07-01-PLAN.md — Homepage rewrite (copy, categories, steps, pricing, FAQ) + Masthead/Footer nav updates
- [x] 07-02-PLAN.md — Legal pages: /privacy, /terms, /about
- [x] 07-03-PLAN.md — Entity separation tests + content verification for all pages
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
**Plans**: 2 plans
Plans:
- [ ] 08-01-PLAN.md — Data layer + API: FilingData extension, upload-evidence route, checkout evidence fields, hint font fix
- [ ] 08-02-PLAN.md — Wizard UI rewrite: 6-step flow, categories update, ProgressBar labels, human verify
**UI hint**: yes

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Schema & Data Model | 2/2 | Complete | 2026-04-01 |
| 2. Stripe Payment Integration | 5/5 | Complete | 2026-04-01 |
| 3. Complaint PDF Generation | 2/2 | Complete   | 2026-04-01 |
| 4. Phaxio Fax Integration + Filing Pipeline | 4/4 | Complete | 2026-04-01 |
| 5. Filing Receipt Email | 1/1 | Complete   | 2026-04-01 |
| 6. Guest-to-Account Conversion | 2/2 | Complete | 2026-04-02 |
| 7. Landing Page & Legal Pages | 3/3 | Complete   | 2026-04-02 |
| 8. Filing Wizard UX Adjustments | 0/2 | Planning complete | - |

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
*Last updated: 2026-04-14 — Phase 8 planned: 2 plans in 2 waves*
*Milestone: v1 -- 8 phases, 61 requirements*

---

# Roadmap: EasyFilerComplaint — v2.0 Triple-Filing (CPPA + CA AG + PDF)

**Milestone:** v2.0 — Triple-Filing (CPPA + CA AG + PDF)
**Goal:** Add CPPA as the primary filing channel with a guided online form walkthrough and downloadable paper PDF, while restructuring the CA AG complaint PDF to match form expectations — giving every $1.99 filing three channels.
**Created:** 2026-05-03

---

## Phases

- [x] **Phase 9: Complaint Narrative Engine + AG PDF + Success Page** - Complaint text generator, CA AG PDF restructure, and redesigned success page with three filing channel sections (completed 2026-05-03)
- [x] **Phase 10: CPPA Guided Filing Page** - Consumer-facing walkthrough page at /filing/[id]/cppa-guide with per-question copy buttons (completed 2026-05-03)
- [ ] **Phase 11: CPPA Paper Complaint PDF** - Downloadable PDF mirroring the CPPA official paper form layout, with API route and Blob storage

---

## Phase Details

### Phase 9: Complaint Narrative Engine + AG PDF + Success Page
**Goal**: Every filing produces a natural-language complaint narrative usable by both CPPA and CA AG channels, the CA AG PDF is restructured into a clean form-style layout, and the success page surfaces all three filing channels with correct status
**Depends on**: Phase 8
**Requirements**: CPTXT-01, CPTXT-02, CPTXT-03, CPTXT-04, CPTXT-05, AGPDF-01, AGPDF-02, AGPDF-03, AGPDF-04, DESC-01, DESC-02, DESC-03, SUCC-01, SUCC-02, SUCC-03, SUCC-04, ADA-01
**Success Criteria** (what must be TRUE):
  1. `generateCPPAComplaint(filing)` returns a CPPAComplaint object with all 7 CPPA form question answers; the complaint description is a natural first-person narrative under 2000 characters with no statute citations
  2. Visit date in the generated text reads as "Month YYYY" (e.g., "March 2026") — never a raw date string, numeric code, or "N/A"
  3. Consumer's free-text description is woven into the narrative contextually, not appended as a standalone orphaned sentence
  4. CA AG complaint PDF uses a form-style layout (Your Information, Business Information, Complaint, Resolution, Prior Contact, Affirmation sections) with zero statute citations, no salutation, no closing, and no "N/A" placeholders for empty fields
  5. Success page shows three distinct sections — CPPA Online (recommended), CPPA Paper PDF, and CA AG (auto-filed) — each linking to the correct destination; CA AG section shows fax status/ID
  6. ADA (accessibility) complaint type shows only the CA AG fax section on the success page; CPPA guide link and paper PDF link are hidden for ADA filings
  7. Guest users see a "Create Account" CTA at the bottom of the success page
**Plans**: 4 plans
Plans:
- [x] 09-01-PLAN.md — Wave 0: test scaffolds for CPPA generator, AG PDF, and success page
- [x] 09-02-PLAN.md — CPPA complaint narrative generator (cppa-complaint-generator.ts)
- [x] 09-03-PLAN.md — CA AG PDF restructure to form-style layout (generate-complaint-pdf.ts)
- [x] 09-04-PLAN.md — Success page 3-channel redesign (success/page.tsx)
**UI hint**: yes

### Phase 10: CPPA Guided Filing Page
**Goal**: Consumer can open the CPPA online complaint form and copy pre-written answers for each question from a guided page at /filing/[id]/cppa-guide
**Depends on**: Phase 9
**Requirements**: CPGDE-01, CPGDE-02, CPGDE-03, CPGDE-04, CPGDE-05
**Success Criteria** (what must be TRUE):
  1. `/filing/[id]/cppa-guide` loads as a server component, fetches the filing server-side, generates CPPA text, and renders without client-side data fetching for the initial answers
  2. Access control: the filing UUID is the access token — same model as the success page (decision D-04/D-05 in 10-CONTEXT.md; no login wall required)
  3. Each copyable answer field has a working "Copy" button that writes the answer text to the clipboard; Q1 (checkboxes), Q3 (CA resident), and Q6 (contacted business) show visual instructions only with no copy-paste box
  4. "Open CPPA Complaint Form" button opens cppa.ca.gov/webapplications/complaint in a new tab
**Plans**: 2 plans
Plans:
- [x] 10-01-PLAN.md — Wave 1: CopyButton 'use client' component + Vitest unit tests
- [x] 10-02-PLAN.md — **Wave 2**: /filing/[id]/cppa-guide server component page + Vitest tests
**UI hint**: yes

### Phase 11: CPPA Paper Complaint PDF
**Goal**: Consumer can download a fillable-style CPPA paper complaint PDF that mirrors the official CPPA form layout, generated on demand and stored in Vercel Blob
**Depends on**: Phase 9
**Requirements**: CPPDF-01, CPPDF-02, CPPDF-03
**Success Criteria** (what must be TRUE):
  1. `generateCPPAComplaintPdf(filing)` produces a PDF with all 10 official CPPA form sections pre-filled, including the perjury attestation section with a blank signature line and the CPPA mailing address header
  2. The PDF footer contains the filing ID; the PDF contains zero references to prohibited entities
  3. GET `/api/filings/[id]/cppa-pdf` verifies the requesting user owns the filing, generates the PDF, stores it in Vercel Blob, and returns it as a file download
**Plans**: TBD
**UI hint**: no

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 9. Complaint Narrative Engine + AG PDF + Success Page | 4/4 | Complete | 2026-05-03 |
| 10. CPPA Guided Filing Page | 2/2 | Complete | 2026-05-03 |
| 11. CPPA Paper Complaint PDF | 0/TBD | Not started | - |

---
*Roadmap created: 2026-05-03*
*Last updated: 2026-05-03 — Phase 10 planned: 2 plans in 2 waves (CPGDE-01–05)*
*Phase 10 planned: 2 plans in 2 waves (2026-05-03)*
