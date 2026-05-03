# Requirements: EasyFilerComplaint

**Defined:** 2026-03-31
**Core Value:** A consumer can pay $1.99 and have a formal privacy complaint filed with a government agency in under 5 minutes.

## v1 Requirements

### Schema & Data Model

- [x] **SCHEMA-01**: Filing model has all Stripe fields (stripeSessionId, stripePaymentId, paymentStatus, paymentAmount, paidAt)
- [x] **SCHEMA-02**: Filing model has all Phaxio fields (faxId, faxStatus, faxSentAt, faxCompletedAt, faxPages)
- [x] **SCHEMA-03**: Filing model has filingReceiptId (EFC-YYYYMMDD-XXXXX format, unique)
- [x] **SCHEMA-04**: Filing model has lifecycle status field with all states (draft → pending_payment → paid → generating → filing → filed → failed)
- [x] **SCHEMA-05**: Filing model supports optional userId for account linkage (guest filings have no userId)
- [x] **SCHEMA-06**: Filing model has evidence file fields (evidenceFileUrl, evidenceFileName)
- [x] **SCHEMA-07**: User model exists with passwordHash for account creation
- [x] **SCHEMA-08**: Filing receipt ID generator utility (src/lib/filing-receipt-id.ts)

### Payments

- [x] **PAY-01**: Stripe Checkout Session created for $1.99 per filing
- [x] **PAY-02**: POST /api/checkout endpoint accepts filingId, returns Stripe session URL
- [x] **PAY-03**: Stripe webhook handler at /api/webhooks/stripe verifies signature
- [x] **PAY-04**: On checkout.session.completed: Filing updated with paymentStatus=paid, filingReceiptId generated
- [x] **PAY-05**: On checkout.session.expired: Filing reset to draft status (allows retry)
- [ ] **PAY-06**: Filing wizard final step redirects to Stripe Checkout URL
- [x] **PAY-07**: Success page at /filing/[id]/success shows receipt ID, filing details, PDF download link
- [x] **PAY-08**: Success page shows account creation CTA for guest filers

### Complaint PDF

- [x] **PDF-01**: generateComplaintPdf() produces a single-page formal complaint letter
- [x] **PDF-02**: PDF includes all required sections: header, To, From, Subject, body paragraphs, closing, footer
- [x] **PDF-03**: PDF body copy is determined by complaintType (privacy_tracking / accessibility / video_sharing)
- [x] **PDF-04**: Generated PDF stored in Vercel Blob (or DB fallback if BLOB_READ_WRITE_TOKEN not set)
- [x] **PDF-05**: Filing.complaintPdfUrl updated after PDF generation
- [x] **PDF-06**: PDF contains zero references to DPW, PV Law, APFC, ComplianceSweep, IV, lawsuits, or attorneys
- [x] **PDF-07**: PDF uses @pdf-lib/fontkit with an embedded font (not Standard Fonts) for consistent rendering on government fax machines

### Fax Delivery

- [x] **FAX-01**: sendFax() sends complaint PDF to agency fax number via Phaxio API
- [x] **FAX-02**: Agency directory maps agency codes to fax numbers (ca_ag only at launch)
- [x] **FAX-03**: Filing.faxId and faxStatus updated after fax send
- [x] **FAX-04**: Phaxio webhook at /api/webhooks/phaxio updates fax status on delivery
- [x] **FAX-05**: Cron job at /api/cron/check-fax-status polls Phaxio every 15 minutes as fallback
- [x] **FAX-06**: vercel.json includes cron schedule for fax status polling
- [x] **FAX-07**: Evidence file attached to fax alongside complaint PDF (if uploaded)
- [x] **FAX-08**: Phaxio fax calls use axios or node-fetch (not native fetch) to avoid Node.js 18–23.6 multipart CRLF bug
- [x] **FAX-09**: Phaxio webhook handler verifies HMAC-SHA1 signature using PHAXIO_CALLBACK_TOKEN

### Filing Pipeline

- [x] **PIPE-01**: executeFilingPipeline() orchestrates: generate PDF → store → send fax → send email
- [x] **PIPE-02**: Pipeline triggered directly from Stripe webhook on payment confirmation
- [x] **PIPE-03**: Pipeline updates Filing status through all lifecycle states
- [x] **PIPE-04**: PDF generation failure sets status=failed and logs error
- [x] **PIPE-05**: Fax failure sets status=failed but still sends receipt email noting the issue (email step is stubbed — Phase 5 implements Resend send)
- [x] **PIPE-06**: Stripe webhook route exports maxDuration = 60; pipeline entry has idempotency guard (status !== 'paid' → skip)

### Receipt Email

- [x] **EMAIL-01**: sendFilingReceiptEmail() sends confirmation email via Resend
- [x] **EMAIL-02**: Email sent from noreply@easyfilercomplaint.com (Resend-verified domain)
- [x] **EMAIL-03**: Email includes filing ID, business name, agency, date filed, amount paid
- [x] **EMAIL-04**: Complaint PDF attached as EFC_Filing_{filingReceiptId}.pdf
- [x] **EMAIL-05**: Email contains no references to DPW, PV Law, APFC, lawsuits, or attorneys
- [x] **EMAIL-06**: Filing.receiptEmailSentAt updated after successful send

### Authentication & Accounts

- [x] **AUTH-01**: Post-filing account creation form (name pre-filled, email read-only, password + confirm)
- [x] **AUTH-02**: Account creation hashes password with bcrypt
- [x] **AUTH-03**: Account creation links current filing and all prior same-email filings to new user
- [x] **AUTH-04**: Login page at /login with email + password
- [x] **AUTH-05**: Authenticated session stored as JWT in httpOnly cookie
- [x] **AUTH-06**: /account/* routes protected by middleware (redirect to /login if unauthenticated)
- [x] **AUTH-07**: Filing history page at /account/filings shows all user filings with PDF download links

### Wizard UX

- [ ] **WIZ-01**: Complaint type step uses plain English labels (not technical codes)
- [ ] **WIZ-02**: Details step includes approximate visit date dropdown
- [ ] **WIZ-03**: Details step includes optional evidence file upload (PDF/PNG/JPG, max 5MB)
- [ ] **WIZ-04**: Agency step shows only CA AG at launch; FCC grayed out with "coming soon" note
- [ ] **WIZ-05**: Filer info step pre-selects California for state dropdown
- [ ] **WIZ-06**: Review step shows full summary + truthfulness attestation before payment
- [ ] **WIZ-07**: Evidence file stored in Vercel Blob at evidence/{filingId}/{filename}

### Marketing & Legal Pages

- [x] **MKTG-01**: Homepage hero with "File a Privacy Complaint in 5 Minutes" + CTA
- [x] **MKTG-02**: "How It Works" 3-step section on homepage
- [x] **MKTG-03**: FAQ section on homepage (collapsible, 5 questions)
- [x] **MKTG-04**: Privacy policy page at /privacy (CCPA section included)
- [x] **MKTG-05**: Terms of Service at /terms (filing service, not law firm)
- [x] **MKTG-06**: About page at /about (no references to other entities)
- [x] **MKTG-07**: All pages pass entity separation check (zero prohibited references)

## v2.0 Requirements — Triple-Filing (CPPA + CA AG + PDF)

### CPPA Text Generator

- [ ] **CPTXT-01**: `generateCPPAComplaint(filing: Filing): CPPAComplaint` returns all 7 CPPA form question answers
- [ ] **CPTXT-02**: Complaint description is a natural first-person narrative, no statute citations, ≤2000 characters
- [ ] **CPTXT-03**: Visit date formatted as "Month YYYY" readable text (e.g., "March 2026"), never "N/A" or numeric codes
- [ ] **CPTXT-04**: User's free-text description integrated naturally into complaint narrative (not orphaned "Specifically, I observed:" sentence)
- [ ] **CPTXT-05**: Business name field: "{targetName} ({targetUrl})" or just "{targetName}" if no URL

### CPPA Guide Page

- [ ] **CPGDE-01**: Page at `/filing/[id]/cppa-guide` is a server component that fetches the filing and generates CPPA text server-side
- [ ] **CPGDE-02**: Auth check: user must own the filing (match by userId or filerEmail)
- [ ] **CPGDE-03**: Each copyable answer has a working "Copy" button using the browser clipboard API
- [ ] **CPGDE-04**: "Open CPPA Complaint Form" button opens cppa.ca.gov/webapplications/complaint in a new tab
- [ ] **CPGDE-05**: Q1 (checkboxes), Q3 (CA resident), Q6 (contacted business) show visual instructions only — no copy-paste text box

### Success Page

- [ ] **SUCC-01**: Success page shows 3 distinct filing channel sections: CPPA Online (★ recommended), CPPA Paper PDF, CA AG (auto-filed ✓)
- [ ] **SUCC-02**: CPPA section links to `/filing/[id]/cppa-guide`; Paper PDF section links to `/api/filings/[id]/cppa-pdf`
- [ ] **SUCC-03**: CA AG section shows fax ID and status if available; shows failure or pending state if fax not complete
- [ ] **SUCC-04**: Guest users see "Create Account" CTA at the bottom of the success page

### ADA Complaint Handling

- [ ] **ADA-01**: ADA (accessibility) complaint type hides CPPA channel (guide page + paper PDF) — CA AG fax is the only channel for ADA complaints

### CPPA Paper PDF

- [ ] **CPPDF-01**: `generateCPPAComplaintPdf(filing)` produces a PDF that mirrors the CPPA official paper form layout with all 10 sections pre-filled
- [ ] **CPPDF-02**: PDF includes perjury attestation section with blank signature line, CPPA mailing address header, and filing ID footer
- [ ] **CPPDF-03**: `GET /api/filings/[id]/cppa-pdf` authenticates user (owns filing), generates PDF, stores in Vercel Blob, and returns as file download

### CA AG PDF Restructure

- [ ] **AGPDF-01**: CA AG complaint PDF uses form-style layout with sections: Your Information, Business Information, Complaint, Resolution Requested, Prior Contact, Affirmation
- [ ] **AGPDF-02**: AG PDF has zero statute citations, no "Dear Attorney General" salutation, no "Respectfully submitted" closing
- [ ] **AGPDF-03**: Empty fields are omitted entirely — no "N/A" placeholder text anywhere in the AG PDF
- [ ] **AGPDF-04**: Sinch fax pipeline is unchanged — same delivery mechanism, only PDF content changes

### Complaint Description Quality

- [ ] **DESC-01**: Generated complaint description uses natural first-person language throughout; user's free-text integrated contextually (not as a separate orphaned sentence)
- [ ] **DESC-02**: Description stays ≤2000 characters; visit date formatted as readable "Month YYYY" text
- [ ] **DESC-03**: Wizard complaint types map correctly to CPPA checkboxes: privacy_tracking → 2 boxes ("collection/use/storage/sharing" + "Right to Opt-out"), video_sharing → 1 box, accessibility → none (CPPA channel skipped)

## Out of Scope

| Feature | Reason |
|---------|--------|
| FCC filing | Web form submission required, different integration than fax — future milestone |
| Attorney / law firm features | EFC is a consumer tool only — no attorney-client relationship |
| Cross-entity references (DPW, PV Law, APFC, ComplianceSweep, IV) | Entity separation requirement — EFC is independent |
| Subscription or recurring billing | Flat per-filing fee only |
| OAuth / social login | Email+password sufficient |
| Real-time fax status | Polling + webhooks sufficient |
| Full password reset flow | Contact support fallback |
| FCC complaints as additional channel | Out of scope for v2.0 — evaluate for v3 |
| Admin dashboard / manual retry | Operations tooling — future milestone |
| Multi-agency filing at different price points | v2.0 keeps $1.99 flat fee for all three channels |

## Traceability

### v1 Requirements

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCHEMA-01 to SCHEMA-08 | Phase 1 | Complete |
| PAY-01 to PAY-08 | Phase 2 | Complete |
| PDF-01 to PDF-07 | Phase 3 | Complete |
| FAX-01 to FAX-09, PIPE-01 to PIPE-06 | Phase 4 | Complete |
| EMAIL-01 to EMAIL-06 | Phase 5 | Complete |
| AUTH-01 to AUTH-07 | Phase 6 | Complete |
| MKTG-01 to MKTG-07 | Phase 7 | Complete |
| WIZ-01 to WIZ-07 | Phase 8 | In planning |

**v1 coverage:** 61 requirements, 61 mapped ✓

### v2.0 Requirements

| Requirement | Phase | Status |
|-------------|-------|--------|
| CPTXT-01 to CPTXT-05 | TBD (roadmap) | Pending |
| CPGDE-01 to CPGDE-05 | TBD (roadmap) | Pending |
| SUCC-01 to SUCC-04 | TBD (roadmap) | Pending |
| ADA-01 | TBD (roadmap) | Pending |
| CPPDF-01 to CPPDF-03 | TBD (roadmap) | Pending |
| AGPDF-01 to AGPDF-04 | TBD (roadmap) | Pending |
| DESC-01 to DESC-03 | TBD (roadmap) | Pending |

**v2.0 coverage:** 23 requirements, phases TBD (roadmap being created) ✓

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-05-03 — v2.0 milestone requirements added: 23 requirements across 7 categories for Triple-Filing*
