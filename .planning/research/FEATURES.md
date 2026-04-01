# Feature Research

**Domain:** Consumer complaint filing pipeline — PDF generation, fax delivery, receipt email
**Researched:** 2026-04-01
**Confidence:** MEDIUM-HIGH (PDF structure: MEDIUM via government form analysis; Phaxio workflow: HIGH via official docs; Resend email: HIGH via official docs)

---

## Feature Landscape

### Domain 1: Formal Complaint PDF Generation (PDF-01 through PDF-06)

#### Table Stakes (Users and Agencies Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Sender block (filer name, address, email, phone) | All formal letters require sender identification | LOW | Top-left of letter; pulled from Filing model filerName/filerEmail/filerAddress fields |
| Recipient block (agency name, mailing address) | Official correspondence requires named recipient | LOW | "Office of the Attorney General, Privacy Enforcement and Protection Unit, Sacramento CA 94244-2550" for CA AG |
| Date line | All dated correspondence is required for legal record | LOW | Format: "April 1, 2026" — use filing paidAt or createdAt |
| Subject / Re: line | Orients recipient to complaint category before reading | LOW | E.g. "Re: CCPA Privacy Violation Complaint — [Business Name]" |
| Salutation | Standard letter convention | LOW | "Dear Attorney General:" or "To Whom It May Concern:" |
| Statement of facts paragraph | Agency reviewers need the who/what/when | MEDIUM | Derived from wizard fields: businessName, websiteUrl, visitDate, complaintType |
| Legal basis paragraph | Ties the complaint to specific statute (CCPA, CalOPPA) | MEDIUM | Boilerplate keyed by complaintType; requires accurate statute citation |
| Relief requested paragraph | Agencies require stated remedy to action a complaint | LOW | Standard: "I respectfully request that your office investigate this violation and take appropriate enforcement action." |
| Filer attestation / signature block | Confirms filer identity under penalty of perjury (CPPA standard) | LOW | "I declare under penalty of perjury under the laws of California that the foregoing is true and correct." |
| EFC service footer | Identifies filing service; required to avoid confusion about sender | LOW | "This complaint was prepared and submitted on behalf of the above-named complainant by EasyFilerComplaint.com, a consumer filing service. EasyFilerComplaint.com is not a law firm and does not provide legal advice." |
| Filing receipt ID in footer | Creates unique audit trail reference | LOW | "EFC Filing Reference: EFC-20260401-XXXXX" |
| Single-page output | Fax machines and agency intake expect standard 1–2 page letters | MEDIUM | pdf-lib with careful font sizing; may require 2 pages for evidence-rich complaints |

#### Differentiators (Above Minimum)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Complaint-type–specific body copy | Generic letters get ignored; tailored language signals legitimacy | MEDIUM | Three templates: privacy_tracking (CCPA §1798.100), accessibility (Unruh/ADA), video_sharing (CCPA §1798.100 + Video Privacy) |
| Visit date reference in body | Makes complaint specific rather than abstract | LOW | "On or around [visitDate], I visited [websiteUrl]..." |
| Evidence attachment notation | Signals that supporting documentation exists | LOW | "See attached evidence (Exhibit A)" when evidenceFileUrl is present |
| EFC letterhead/logo area | Professional appearance increases credibility | LOW | Simple text header in a bordered box; avoid imagery to keep fax quality high |
| Vercel Blob storage of generated PDF | PDF survives beyond the request; enables email attachment and download link | LOW | Required for PIPE-01 and EMAIL-04 — this is actually table stakes for the pipeline |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Attorney-style demand language ("You are hereby notified…", "Failure to comply may result in…") | Sounds authoritative | Crosses into unauthorized practice of law; creates liability for EFC | Factual, civil-servant–facing language: "I am writing to report a potential violation..." |
| Law firm or attorney references | Credibility signaling | Violates EFC entity separation requirement; implies legal representation | EFC service footer clearly identifies EFC as a filing service, not a law firm |
| Multi-page evidence exhibits embedded in PDF | Completeness | Blows up fax transmission time; risks partial fax delivery | Attach evidence as a separate file (FAX-07); note in body "See attached Exhibit A" |
| QR codes or barcodes in PDF | Modern touch | Fax transmission destroys raster content at low DPI; QR codes become unreadable | Plain text reference ID in footer |
| Color formatting, gradients, images | Visual polish | Fax machines print in black and white; images degrade to noise | Black and white with clear typographic hierarchy only |

---

### Domain 2: Phaxio Fax Delivery Workflow (FAX-01 through FAX-07)

#### Table Stakes (Users and Operations Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| `sendFax()` POST to Phaxio API with `to`, `file` (complaint PDF) | Core delivery mechanism | LOW | POST to `https://api.phaxio.com/v2.1/faxes`; returns `{success, data: {id}}` immediately; store `faxId` in Filing |
| Agency directory mapping agency code → E.164 fax number | Required for correct routing; must be maintainable | LOW | `src/lib/agency-directory.ts`; CA AG only at launch; MUST verify number from oag.ca.gov before go-live |
| `faxStatus` field update after send | Tracks whether fax is queued, in progress, delivered, or failed | LOW | Status values: `queued → inprogress → success / failure / partialsuccess`; store on Filing.faxStatus |
| `faxId` stored in Filing | Required for status polling and webhook correlation | LOW | Already in schema (FAX-03 is met by SCHEMA-02 which is validated) |
| Phaxio webhook handler at `/api/webhooks/phaxio` | Real-time delivery confirmation without polling | MEDIUM | Phaxio POSTs `multipart/form-data`; parse `event_type` (`fax_completed`, `transmitting_page`, `retry_scheduled`); verify signature with webhook token |
| Fax status updated on delivery webhook (`fax_completed`) | Filing lifecycle must reach `filed` state | LOW | On `fax_completed`: update `faxStatus`, `faxCompletedAt`; transition Filing.status to `filed` |
| Cron fallback polling (`/api/cron/check-fax-status`) | Webhooks can be missed; cron ensures eventual consistency | MEDIUM | GET `https://api.phaxio.com/v2.1/faxes/{id}`; check status; update if completed; runs every 15 min via Vercel cron |
| `vercel.json` cron schedule | Required to activate Vercel cron | LOW | `{"crons": [{"path": "/api/cron/check-fax-status", "schedule": "*/15 * * * *"}]}` |

#### Differentiators (Above Minimum)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Evidence file attached alongside complaint PDF (FAX-07) | Strengthens complaint; agency sees supporting documentation | LOW | Pass second `file` parameter to Phaxio API when `evidenceFileUrl` is set; Phaxio sends all files in one transmission |
| `callback_url` per-request (not just global webhook) | Ensures this specific fax's events route correctly | LOW | Pass `callback_url: "https://www.easyfilercomplaint.com/api/webhooks/phaxio"` in each send request |
| Webhook signature verification | Security — prevents spoofed delivery confirmations | LOW | Phaxio signs requests with HMAC; verify against `PHAXIO_WEBHOOK_TOKEN` env var |
| Filing status `failed` + receipt email on fax failure (PIPE-05) | User is never left in the dark | LOW | On `failure` status: set Filing.status=failed; still send receipt email noting "fax delivery pending manual retry" |
| Phaxio test mode for development | Lets pipeline be validated before live fax charges | LOW | Use Phaxio test API key in non-production environments; test faxes do not consume credits |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time fax status streaming to frontend | Modern UX feel | Fax delivery takes 1–5 minutes; WebSocket complexity not worth it at this volume | Success page shows "Filing submitted — you'll receive a confirmation email when delivery is confirmed." Static message. |
| Fax retry loop in the pipeline | Resilience | Synchronous retries in a Stripe webhook handler will hit Next.js timeout limits (10s default for API routes) | Phaxio retries up to 16 times automatically with backoff; if all fail, webhook sets status=failed; manual retry is v2 |
| Multiple fax recipients per filing | More coverage | Phaxio charges per recipient; v1 is CA AG only; multi-agency is v2 | Agency directory is structured to support multiple agencies later without code change |
| Batching mode (`batch=true`) | Cost optimization for high volume | Not relevant at v1 volume; adds latency (batch delay window) | Send immediately; batching is a v2 optimization if filing volume warrants it |

---

### Domain 3: Filing Receipt Email (EMAIL-01 through EMAIL-06)

#### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Sent from branded sender address | "From: noreply@easyfilercomplaint.com" is required for trust | LOW | Resend requires domain verification; domain must be verified in Resend dashboard before go-live |
| Subject line with receipt ID | User must be able to find this email in search | LOW | "Your EasyFilerComplaint Filing Receipt — EFC-20260401-XXXXX" |
| Filing summary in email body | User needs to confirm what was filed without opening the PDF | LOW | Include: filingReceiptId, businessName, websiteUrl, agency, dateFiled, amountPaid |
| Complaint PDF attached as named file | User needs the filing document for their records | MEDIUM | `EFC_Filing_{filingReceiptId}.pdf`; pass as base64-encoded content to Resend `attachments` array |
| Plain-text fallback version | Email clients that strip HTML must still be readable | LOW | Resend supports both `html` and `text` body fields; always populate both |
| Support contact or reply-to | User has questions about their filing | LOW | Include "Questions? Contact support@easyfilercomplaint.com" — no phone, no attorney references |
| Clear EFC-is-not-a-law-firm disclaimer | Legal positioning | LOW | One-line footer: "EasyFilerComplaint.com is a consumer filing service, not a law firm." |
| `receiptEmailSentAt` timestamp stored in Filing | Audit trail; confirms email was sent | LOW | Update after successful Resend API call |

#### Differentiators (Above Minimum)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| PDF as direct attachment (not link-only) | User can file the PDF in their records app immediately without clicking through | LOW | Resend supports `content` (base64) or `path` (URL); base64 from pdf-lib bytes is simpler when PDF is already in memory during pipeline execution; switch to Vercel Blob URL path after PDF is stored |
| Human-readable filing date in body | "Filed on April 1, 2026" is more trustworthy than a Unix timestamp | LOW | Format `paidAt` date in email body |
| Fax delivery status note | Sets expectation ("Your complaint was transmitted via fax and typically reaches the agency within 1 business day") | LOW | Helps prevent user anxiety; does not require real-time status |
| Account creation CTA in email | Drives guest-to-account conversion post-filing | LOW | "Create an account to view and manage your filing history at easyfilercomplaint.com/account" |

#### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| HTML-heavy branded email template with images | Polish | Images increase spam score; some email clients block external images; adds build complexity | Clean HTML with inline CSS, no external image URLs; use text-based structure |
| CC: to filer's state representatives | "More pressure on the business" | Outside EFC scope; unsolicited CC to elected officials creates legal and reputational risk | Not an EFC feature; EFC files to the designated agency only |
| Send email before fax is confirmed | Impatient users want immediate confirmation | Email would say "fax pending" which erodes trust if fax later fails | Send email after fax send is attempted (not after confirmed delivery); include "transmission initiated" language. Receipt email and fax send are both triggered from the pipeline — do not wait for fax delivery webhook to send email. |
| Attach evidence file to email as well | Completeness | Evidence file is already attached to the fax; double-attaching increases email size unnecessarily; may trip spam filters | Email body notes "Your supporting evidence was attached to the fax transmission." |
| Multiple emails (one per status transition) | Status transparency | Users will unsubscribe from a filing service that sends 4+ emails per filing | One receipt email on pipeline completion; webhook can update a status page if needed |

---

## Feature Dependencies

```
Stripe webhook (payment confirmed)
    └──triggers──> PIPE-01: executeFilingPipeline()
                       ├──step 1──> PDF-01: generateComplaintPdf()
                       │                └──requires──> Filing model fields (all wizard data)
                       │                └──requires──> complaintType template text
                       │                └──produces──> PDF bytes
                       ├──step 2──> PDF-04: storeComplaintPdf() → Vercel Blob
                       │                └──updates──> Filing.complaintPdfUrl
                       ├──step 3──> FAX-01: sendFax() → Phaxio API
                       │                └──requires──> agency-directory.ts (FAX-02)
                       │                └──requires──> complaintPdfUrl (from step 2)
                       │                └──optionally attaches──> evidenceFileUrl (FAX-07)
                       │                └──updates──> Filing.faxId, faxStatus
                       └──step 4──> EMAIL-01: sendFilingReceiptEmail() → Resend
                                        └──requires──> complaintPdfUrl (from step 2)
                                        └──requires──> filingReceiptId (from PAY-04, already set)
                                        └──updates──> Filing.receiptEmailSentAt

FAX-04: Phaxio webhook
    └──updates──> Filing.faxStatus, faxCompletedAt, Filing.status (filed / failed)

FAX-05: Vercel cron (fallback)
    └──polls──> Phaxio API for faxes in inprogress/queued state
    └──updates──> same fields as FAX-04
```

### Dependency Notes

- **PDF generation requires all wizard data to be present on the Filing record.** The pipeline cannot start if the Filing record is incomplete. The Stripe webhook handler already loads the Filing before triggering the pipeline — ensure all fields are eagerly loaded.
- **Vercel Blob storage (step 2) is a hard prerequisite for both fax send and email attachment.** The pipeline must persist the PDF to a URL before calling Phaxio (which accepts a URL via `content_url` or file upload) and before Resend can attach it. If `BLOB_READ_WRITE_TOKEN` is not set, the fallback must be a DB binary field — not skipping storage.
- **`filingReceiptId` is set by the Stripe webhook (PAY-04), not by the pipeline.** The pipeline can safely read it from the Filing record at pipeline start.
- **Phaxio webhook and Vercel cron are parallel status update paths**, not sequential. Both write to the same Filing fields; use an idempotent upsert to avoid race conditions.
- **Receipt email (step 4) does NOT wait for fax delivery confirmation.** It is sent immediately after fax send attempt. The email states "fax transmission initiated" not "fax delivered."

---

## MVP Definition

### Launch With (v1 — this milestone)

- [x] PDF-01 through PDF-06: generateComplaintPdf() with all required letter sections, complaintType templates, Vercel Blob storage — **why essential: no filing without a document**
- [x] FAX-01 through FAX-07: sendFax() with agency directory, Phaxio webhook handler, Vercel cron fallback — **why essential: EFC's core value is government agency delivery**
- [x] PIPE-01 through PIPE-05: executeFilingPipeline() orchestrating the above in sequence with lifecycle state management — **why essential: atomicity of the filing action**
- [x] EMAIL-01 through EMAIL-06: sendFilingReceiptEmail() with PDF attachment via Resend — **why essential: user's only proof of filing**

### Add After Validation (v1.x)

- [ ] Evidence file upload (WIZ-03, FAX-07): Triggered when filing volume shows users have evidence to submit
- [ ] Guest-to-account conversion (AUTH-01 through AUTH-07): Add once filings are live and users want history
- [ ] Fax retry admin UI (OPS-02): Add once any real failure rate is observed

### Future Consideration (v2+)

- [ ] Additional agencies (AGCY-01 through AGCY-03): Defer until CA AG integration is proven end-to-end
- [ ] Real-time fax status page: Defer — static success page with email confirmation is sufficient at v1 volume

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| generateComplaintPdf() with all letter sections | HIGH | MEDIUM | P1 |
| complaintType-specific body copy (3 templates) | HIGH | LOW | P1 |
| Vercel Blob PDF storage | HIGH | LOW | P1 |
| sendFax() via Phaxio API | HIGH | LOW | P1 |
| Agency directory (ca_ag fax number) | HIGH | LOW | P1 |
| Phaxio webhook handler (delivery status) | HIGH | LOW | P1 |
| executeFilingPipeline() orchestrator | HIGH | MEDIUM | P1 |
| sendFilingReceiptEmail() with PDF attachment | HIGH | LOW | P1 |
| Vercel cron fallback (fax status polling) | MEDIUM | LOW | P1 (required by FAX-05/FAX-06) |
| Evidence file attached to fax (FAX-07) | MEDIUM | LOW | P2 (requires WIZ-03 first) |
| Phaxio webhook signature verification | MEDIUM | LOW | P1 (security) |
| Account creation CTA in receipt email | LOW | LOW | P2 |
| Fax failure → receipt email with failure note | HIGH | LOW | P1 (PIPE-05) |

**Priority key:** P1 = must have for this milestone; P2 = add in adjacent phase; P3 = future

---

## Competitor Feature Analysis

| Feature | DoNotPay / similar | Manual filing | EFC Approach |
|---------|-------------------|---------------|--------------|
| Complaint PDF generation | Attorney-reviewed templates | Consumer writes letter | Templated by complaint type; factual, not legal advice |
| Government delivery | Mailed or emailed | Consumer mails/faxes | Automated Phaxio fax — same business day |
| Filing receipt | None / dashboard only | Consumer keeps own copy | Email with PDF attachment immediately after filing |
| Pricing | Subscription | Free (but hours of consumer time) | $1.99 flat, under 5 minutes |
| Evidence attachment | Manual | Manual | Automatic when file uploaded in wizard |

---

## Critical Implementation Notes

### Complaint PDF Letter Sections (PDF-02)

Based on analysis of CA AG and CPPA complaint form structure and standard government correspondence conventions, the formal letter must include these sections in order:

1. **EFC Header** — "EasyFilerComplaint.com — Consumer Filing Service" (no logo; text only for fax compatibility)
2. **Date** — Full date format: "April 1, 2026"
3. **Recipient Block** — Agency name, unit, mailing address
4. **Filer Block** — "From: [filerName], [filerAddress], [filerEmail], [filerPhone]"
5. **Subject Line** — "Re: Consumer Privacy Complaint Against [businessName] ([websiteUrl])"
6. **Salutation** — "Dear Attorney General:"
7. **Opening Paragraph** — Purpose statement: "I am writing to file a formal complaint against [businessName]..."
8. **Statement of Facts** — Specific incident: date, website visited, what occurred
9. **Legal Basis** — Statute violated (keyed by complaintType); cite specific CCPA section
10. **Relief Requested** — Standard enforcement request
11. **Attestation** — Declaration under penalty of perjury
12. **Signature Block** — Filer name, date
13. **Footer** — EFC service disclaimer + filing receipt ID

### Phaxio Fax Delivery Status Values

Official Phaxio status values (HIGH confidence — from official docs):
- `queued` — in queue, will execute soon
- `pendingbatch` — awaiting batch window close (not used at v1 — do not use batch mode)
- `inprogress` — actively transmitting
- `success` — delivered successfully
- `failure` — failed; check `error_code`
- `partialsuccess` — partial delivery (multi-recipient only; not applicable for single CA AG recipient)

Map these to Filing.faxStatus field. The `fax_completed` webhook event fires for both `success` and `failure` outcomes.

### Resend Attachment Method for Pipeline Use

The pipeline generates PDF bytes in memory (pdf-lib returns `Uint8Array`). The recommended attachment pattern:

1. Convert `Uint8Array` → `Buffer` → `.toString('base64')`
2. Pass to Resend `attachments: [{ filename: 'EFC_Filing_{id}.pdf', content: base64String }]`
3. Alternatively, after Vercel Blob storage, use `path: complaintPdfUrl` to avoid holding bytes in memory

Use the `path` (URL) method when `complaintPdfUrl` is available — it avoids a second base64 encode and reduces pipeline memory footprint. Total email size including attachment must stay under 40MB (Resend limit); a single-page complaint PDF will be well under 200KB.

### Phaxio → Sinch Migration Note

Phaxio v2.1 is the current stable API for EFC's purposes. Sinch acquired Phaxio and v3 (Sinch Fax API) is available, but v2.1 credentials still work as of 2026. Sinch Fax API v3 uses camelCase fields and OAuth 2.0 — not backwards compatible. For v1: use Phaxio v2.1 API directly. Monitor for forced migration timeline.

---

## Sources

- [Phaxio API v2.1 Webhooks — official docs](https://www.phaxio.com/docs/api/v2.1/intro/webhooks)
- [Phaxio Send Fax Webhooks — official docs](https://www.phaxio.com/docs/api/v2.1/faxes/send_webhooks)
- [Phaxio Create and Send Fax — official docs](https://www.phaxio.com/docs/api/v2.1/faxes/create_and_send_fax)
- [Phaxio Status Values — official docs](https://www.phaxio.com/docs/statuses)
- [Phaxio Sending Faxes Guide](https://www.phaxio.com/blog/guide/sending-faxes-an-intro-to-our-fax-api-part-i)
- [Migrating from Phaxio v2.1 to Sinch Fax API](https://developers.sinch.com/docs/fax/v2-v3migration)
- [Resend Email Attachments — official docs](https://resend.com/docs/dashboard/emails/attachments)
- [Postmark Receipt and Invoice Email Best Practices](https://postmarkapp.com/guides/receipt-and-invoice-email-best-practices)
- [CPPA Consumer Complaint Form (paper)](https://cppa.ca.gov/pdf/paper-complaint.pdf)
- [CA AG CCPA Complaint Page](https://oag.ca.gov/privacy/ccpa)
- [FTC Sample Customer Complaint Letter](https://consumer.ftc.gov/articles/sample-customer-complaint-letter)
- [JusticeDirect Formal Complaint Letter Guide](https://justicedirect.com/post/formal-complaint-letter)
- [EmailVendorSelection Transactional Email Attachments Guide](https://www.emailvendorselection.com/email-attachments-transactional-email/)

---

*Feature research for: EasyFilerComplaint — v1.1 Live Filing Pipeline*
*Researched: 2026-04-01*
