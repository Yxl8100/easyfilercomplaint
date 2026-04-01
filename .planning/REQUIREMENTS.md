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

- [ ] **EMAIL-01**: sendFilingReceiptEmail() sends confirmation email via Resend
- [ ] **EMAIL-02**: Email sent from noreply@easyfilercomplaint.com (Resend-verified domain)
- [ ] **EMAIL-03**: Email includes filing ID, business name, agency, date filed, amount paid
- [ ] **EMAIL-04**: Complaint PDF attached as EFC_Filing_{filingReceiptId}.pdf
- [ ] **EMAIL-05**: Email contains no references to DPW, PV Law, APFC, lawsuits, or attorneys
- [ ] **EMAIL-06**: Filing.receiptEmailSentAt updated after successful send

### Authentication & Accounts

- [ ] **AUTH-01**: Post-filing account creation form (name pre-filled, email read-only, password + confirm)
- [ ] **AUTH-02**: Account creation hashes password with bcrypt
- [ ] **AUTH-03**: Account creation links current filing and all prior same-email filings to new user
- [ ] **AUTH-04**: Login page at /login with email + password
- [ ] **AUTH-05**: Authenticated session stored as JWT in httpOnly cookie
- [ ] **AUTH-06**: /account/* routes protected by middleware (redirect to /login if unauthenticated)
- [ ] **AUTH-07**: Filing history page at /account/filings shows all user filings with PDF download links

### Wizard UX

- [ ] **WIZ-01**: Complaint type step uses plain English labels (not technical codes)
- [ ] **WIZ-02**: Details step includes approximate visit date dropdown
- [ ] **WIZ-03**: Details step includes optional evidence file upload (PDF/PNG/JPG, max 5MB)
- [ ] **WIZ-04**: Agency step shows only CA AG at launch; FCC grayed out with "coming soon" note
- [ ] **WIZ-05**: Filer info step pre-selects California for state dropdown
- [ ] **WIZ-06**: Review step shows full summary + truthfulness attestation before payment
- [ ] **WIZ-07**: Evidence file stored in Vercel Blob at evidence/{filingId}/{filename}

### Marketing & Legal Pages

- [ ] **MKTG-01**: Homepage hero with "File a Privacy Complaint in 5 Minutes" + CTA
- [ ] **MKTG-02**: "How It Works" 3-step section on homepage
- [ ] **MKTG-03**: FAQ section on homepage (collapsible, 5 questions)
- [ ] **MKTG-04**: Privacy policy page at /privacy (CCPA section included)
- [ ] **MKTG-05**: Terms of Service at /terms (filing service, not law firm)
- [ ] **MKTG-06**: About page at /about (no references to other entities)
- [ ] **MKTG-07**: All pages pass entity separation check (zero prohibited references)

## v2 Requirements

### Additional Agencies

- **AGCY-01**: FCC filing via web form submission adapter
- **AGCY-02**: Multi-agency filing ($1.99 per agency selected)
- **AGCY-03**: State-level AG offices beyond California

### Account Features

- **ACCT-01**: Password reset via email link
- **ACCT-02**: Account settings page (name, email, password update)
- **ACCT-03**: Delete account + data

### Operations

- **OPS-01**: Admin dashboard showing filing volume and status
- **OPS-02**: Manual retry for failed filings
- **OPS-03**: Refund flow via Stripe dashboard integration

## Out of Scope

| Feature | Reason |
|---------|--------|
| FCC filing at launch | Web form submission required, different integration than fax |
| Attorney / law firm features | EFC is a consumer tool only — no attorney-client relationship |
| Cross-entity references (DPW, PV Law, APFC, ComplianceSweep, IV) | Entity separation requirement — EFC is independent |
| Subscription or recurring billing | Flat per-filing fee only |
| OAuth / social login | Email+password sufficient for v1 |
| Real-time fax status | Polling + webhooks sufficient |
| Full password reset flow | Contact support fallback for v1 |
| Video evidence / screen recording | File upload (PDF/PNG/JPG) is sufficient |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCHEMA-01 to SCHEMA-08 | Phase 1 | Complete |
| PAY-01 to PAY-08 | Phase 2 | Complete |
| PDF-01 to PDF-07 | Phase 3 | Complete |
| FAX-01 to FAX-09, PIPE-01 to PIPE-06 | Phase 4 | Complete |
| EMAIL-01 to EMAIL-06 | Phase 5 | Pending |
| AUTH-01 to AUTH-07 | Phase 6 | Pending |
| MKTG-01 to MKTG-07 | Phase 7 | Pending |
| WIZ-01 to WIZ-07 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 57 total
- v1.1 additions (research-derived): 4 (PDF-07, FAX-08, FAX-09, PIPE-06)
- Total: 61
- Mapped to phases: 61
- Unmapped: 0 ✓

**v1.1 milestone scope (Phases 3-5):**
- PDF-01 to PDF-07: 7 requirements → Phase 3
- FAX-01 to FAX-09: 9 requirements → Phase 4
- PIPE-01 to PIPE-06: 6 requirements → Phase 4
- EMAIL-01 to EMAIL-06: 6 requirements → Phase 5
- Total v1.1: 28 requirements, 100% mapped ✓

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-04-01 — Phase 4 complete: FAX-01 to FAX-09, PIPE-01 to PIPE-06 all satisfied*
