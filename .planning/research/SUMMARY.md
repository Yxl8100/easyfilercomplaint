# Project Research Summary

**Project:** EasyFilerComplaint — v1.1 Live Filing Pipeline
**Domain:** Consumer complaint filing pipeline — PDF generation, fax delivery, transactional email
**Researched:** 2026-04-01
**Confidence:** HIGH

## Executive Summary

EasyFilerComplaint v1.1 is a server-side filing pipeline that converts a paid consumer complaint into a formal government letter PDF, faxes it to the California Attorney General via Phaxio, and delivers a receipt email with the PDF attached via Resend — all triggered from a Stripe webhook. The existing stack (Next.js 14, Prisma, Neon, Stripe, Vercel) is fully validated. The three new capability areas (pdf-lib PDF generation, Phaxio fax delivery, Resend receipt email) require no new package installs: all three libraries are already present in `package.json`. The pipeline is a four-step linear orchestrator (`generateComplaintPdf → storeToBlob → sendFax → sendFilingReceiptEmail`) with explicit Filing status transitions at each step for auditability and recovery.

The recommended implementation approach is: build and test each step in isolation before wiring them into `filing-pipeline.ts`, then integrate into the Stripe webhook. This order prevents coupling and allows each component (PDF generator, fax sender, email sender) to be independently verified. The formal complaint PDF must use embedded fonts via `@pdf-lib/fontkit` — not Standard Fonts — to guarantee consistent rendering on government fax machines. The Phaxio fax call must use `axios` or `node-fetch` rather than native `fetch`, due to a confirmed Node.js 18–23.6 multipart CRLF bug that causes `422` errors.

The single highest risk to the pipeline is the Stripe webhook timeout pattern: if the pipeline is awaited synchronously inside the webhook handler without configuring `maxDuration`, Vercel may terminate the function mid-execution, causing Stripe to retry and duplicate the pipeline run. The idempotency guard (check `filing.status !== 'paid'` before executing) prevents duplicate execution and must be the first line of the pipeline. A secondary risk is entity separation: the PDF and email must never reference affiliated entities (DPW, Pro Veritas, APFC) or use attorney-sounding language — an automated content scan in CI is the only reliable prevention.

## Key Findings

### Recommended Stack

All three new integrations are handled by packages already installed. No `npm install` is required before building. The pipeline data flow is: `pdf-lib.save()` returns `Uint8Array` → `Buffer.from(bytes)` for Blob upload and Resend attachment → `new Blob([bytes])` for Phaxio FormData. The single `Uint8Array` from pdf-lib is the source of truth; convert to `Buffer` once at the pipeline level and pass downstream.

**Core technologies:**
- **pdf-lib@1.17.1**: PDF document generation — already installed, pure TS, runs in Node.js API routes; coordinate origin is bottom-left, Y decreases downward
- **Phaxio REST API v2**: Fax delivery to CA AG — raw `fetch` + `FormData` + HTTP Basic auth; NO official Node.js SDK needed or recommended (last SDK release was 2019)
- **resend@6.9.4**: Transactional email with PDF attachment — already installed; `attachments[].content` requires base64 string converted via `Buffer.from(pdfBytes).toString('base64')`
- **@vercel/blob**: PDF storage — provides public URL for fax `content_url` and email attachment `path`; `access: 'private'` required (PDFs contain PII); requires `BLOB_READ_WRITE_TOKEN`

**Three Phaxio credentials are required** (not two): `PHAXIO_API_KEY`, `PHAXIO_API_SECRET` (for sending), and `PHAXIO_CALLBACK_TOKEN` (a separate credential for webhook HMAC-SHA1 verification).

### Expected Features

The filing pipeline must deliver all features in the v1 MVP scope. No features should be deferred from this milestone — the pipeline is the core product value.

**Must have (table stakes — this milestone):**
- Formal government complaint letter PDF with 13 structured sections (header, date, recipient block, filer block, subject, salutation, opening, facts, legal basis, relief, attestation, signature, footer)
- Three complaint-type–specific body templates (privacy_tracking / accessibility / video_sharing) with accurate statute citations
- Vercel Blob storage of generated PDF with `access: 'private'`
- `sendFax()` to CA AG via Phaxio with agency directory for routing
- Phaxio webhook handler at `/api/webhooks/phaxio` for async delivery confirmation
- Vercel cron fallback at `/api/cron/check-fax-status` (every 15 minutes — requires Vercel Pro)
- `sendFilingReceiptEmail()` via Resend with PDF attached as named file (`EFC_Filing_{receiptId}.pdf`)
- Pipeline lifecycle: `paid → generating → filing → filed` (or `failed`) with `faxSentAt`, `faxCompletedAt`, `receiptEmailSentAt` timestamps

**Should have (differentiators above minimum):**
- Evidence file attached alongside complaint PDF in fax (FAX-07) — requires WIZ-03 evidence upload to be present first
- Phaxio webhook signature verification (HMAC-SHA1 with `PHAXIO_CALLBACK_TOKEN`) — security, not optional
- Fax failure receipt email with "transmission initiated" language (PIPE-05) — consumer must always receive a confirmation email
- `callback_url` per fax request to ensure correct webhook routing

**Defer (v1.x and v2+):**
- Real-time fax status streaming to frontend — static success page with email confirmation is sufficient
- Multiple agencies — defer until CA AG integration is proven end-to-end
- Fax retry admin UI (OPS-02) — add after observing real failure rates
- Guest-to-account conversion

**Anti-features to exclude:**
- Attorney-style demand language ("hereby notified", "failure to comply") — unauthorized practice of law risk
- Color formatting, images, QR codes in PDF — destroyed by fax transmission
- Evidence file attached to the receipt email — already on the fax; double-attach increases spam score

### Architecture Approach

The pipeline follows a linear orchestrator pattern: `filing-pipeline.ts` is the single entry point called from the Stripe webhook. It advances the Filing record through explicit status transitions at each step, catching errors per-step and deciding whether to continue or abort. The Phaxio webhook and Vercel cron are parallel status resolution paths that write to the same Filing fields — both must use idempotent upserts. The pipeline holds PDF bytes in memory from generation through email attachment, passing the same `Uint8Array` to both `storeToBlob()` and `sendFilingReceiptEmail()` to avoid a redundant Blob re-fetch.

**Major components:**

1. `src/lib/filing-pipeline.ts` (NEW) — PIPE-01 to PIPE-05: orchestrator with status transitions and error isolation
2. `src/lib/generate-complaint-pdf.ts` (NEW) — PDF-01 to PDF-06: 13-section formal letter generator using pdf-lib + fontkit
3. `src/lib/agency-directory.ts` (NEW) — FAX-02: maps agency codes to verified E.164 fax numbers; CA AG only at launch
4. `src/lib/send-filing-receipt-email.ts` (NEW) — EMAIL-01 to EMAIL-06: Resend email with base64 PDF attachment
5. `src/lib/phaxio.ts` (MODIFY) — FAX-07: add `file[]` multi-attachment support for evidence file
6. `app/api/webhooks/phaxio/route.ts` (NEW) — FAX-04: HMAC-SHA1 verified delivery status handler
7. `app/api/cron/check-fax-status/route.ts` (NEW) — FAX-05: 15-minute polling fallback with `CRON_SECRET` guard
8. `vercel.json` (NEW) — FAX-06: `*/15 * * * *` cron schedule (Vercel Pro required)

**Build order:** generate-complaint-pdf → agency-directory → blob storage → send-filing-receipt-email → filing-pipeline → Stripe webhook modification → phaxio webhook → vercel.json + cron handler.

### Critical Pitfalls

1. **Native `fetch` + `FormData` on Node.js 18–23.6 returns 422 from Phaxio** — Use `axios` or `node-fetch` for all Phaxio API calls; native fetch multipart CRLF is a confirmed Node.js bug affecting Vercel's Node 18/20 runtimes.

2. **Stripe webhook timeout kills the pipeline mid-execution** — Set `export const maxDuration = 60` in the Stripe webhook route file; add an idempotency guard (`if filing.status !== 'paid' return`) as the absolute first line of `executeFilingPipeline()`.

3. **pdf-lib Standard Fonts are not embedded** — Use `@pdf-lib/fontkit` and embed a real font (Liberation Serif or Noto Serif) fetched from a URL at generation time; `StandardFonts.Helvetica` renders differently on every viewer and government fax print station.

4. **Fax failure silences receipt email (PIPE-05)** — Wrap the fax step in its own try/catch with a `faxFailed` flag; the email step must run unconditionally regardless of fax outcome. A consumer who paid $1.99 must always receive a confirmation.

5. **Phaxio webhook signature fails due to non-www URL** — Register the callback URL in the Phaxio dashboard as `https://www.easyfilercomplaint.com/api/webhooks/phaxio` (with `www.`). Vercel redirects non-www to www and strips the POST body, breaking both delivery and HMAC verification.

6. **Entity separation leak in PDF or email** — Add an automated assertion to generation tests that scans output bytes for prohibited strings: `['DPW', 'Pro Veritas', 'APFC', 'ComplianceSweep', 'IdentifiedVerified', 'attorney', 'law firm']`. This is a go/no-go requirement at every phase.

## Implications for Roadmap

Based on the combined research, the pipeline decomposes naturally into five implementation phases following the build order prescribed in ARCHITECTURE.md. Each phase delivers a testable artifact before the next phase begins.

### Phase 1: Complaint PDF Generation

**Rationale:** PDF generation has zero external dependencies (no API keys, no network calls). It can be built and fully tested with vitest before Blob, Phaxio, or Resend are touched. It is also the most structurally complex component — 13 letter sections, 3 complaint templates, fontkit setup — and bugs here propagate through every downstream step.
**Delivers:** `generateComplaintPdf(filing): Promise<Uint8Array>` producing a verified, font-embedded, entity-separation–clean complaint letter PDF
**Addresses:** PDF-01, PDF-02, PDF-03, PDF-04, PDF-05, PDF-06
**Avoids:** Pitfall 3 (Standard Fonts), Pitfall 10 (entity separation leak); font must be fetched from URL, not `fs.readFileSync`
**Research flag:** Skip deeper research — pdf-lib API signatures are fully documented in STACK.md with HIGH confidence

### Phase 2: Blob Storage + Pipeline Skeleton

**Rationale:** Blob storage is the prerequisite for both fax delivery (via `content_url`) and email attachment (via `path`). The pipeline skeleton (`filing-pipeline.ts`) with status transitions and error isolation should be wired here before any live API calls are added — this is the structural scaffold that subsequent phases fill in.
**Delivers:** `storeComplaintPdf()` persisting PDFs to Vercel Blob with `access: 'private'`; `filing-pipeline.ts` skeleton with status transitions `paid → generating → filing → filed/failed`
**Addresses:** PDF-04 (Blob storage), PIPE-01, PIPE-03, PIPE-04
**Avoids:** Pitfall 9 (missing `BLOB_READ_WRITE_TOKEN`); fail loudly in production if token absent; DB base64 fallback only for `NODE_ENV === 'development'`
**Research flag:** Skip deeper research — Vercel Blob `put()` documented in ARCHITECTURE.md with HIGH confidence

### Phase 3: Fax Delivery Integration

**Rationale:** Fax delivery is the highest-risk integration due to three independent pitfalls: the Node.js multipart bug, the Phaxio webhook URL mismatch, and the PIPE-05 email suppression risk. Implement `sendFax()`, the agency directory, and the Phaxio webhook handler together so end-to-end fax delivery can be verified before the email step is added.
**Delivers:** `sendFax()` calling Phaxio via `axios`/`node-fetch`; `agency-directory.ts` with verified CA AG fax number; `Filing.faxId`, `faxStatus`, `faxSentAt` updates; Phaxio webhook handler with HMAC-SHA1 verification
**Addresses:** FAX-01, FAX-02, FAX-03, FAX-04, FAX-07 (evidence multi-attach)
**Avoids:** Pitfall 4 (native fetch multipart), Pitfall 7 (webhook URL + signature), Pitfall 5 (Blob URL via `content_url` instead of piping bytes)
**Research flag:** NEEDS deeper validation — verify CA AG fax number against `oag.ca.gov` before go-live; test with Phaxio test API key first

### Phase 4: Pipeline Orchestrator + Cron Fallback

**Rationale:** With PDF generation, Blob storage, and fax delivery proven independently, wire the full `executeFilingPipeline()` into the Stripe webhook with correct error isolation (especially PIPE-05: fax failure must not suppress email). Add Vercel cron fallback as the last safety net once the webhook-based happy path is working.
**Delivers:** `executeFilingPipeline()` fully wired into Stripe webhook; `maxDuration = 60` on webhook route; idempotency guard; Vercel cron at `*/15 * * * *`; `vercel.json`
**Addresses:** PIPE-01, PIPE-02, PIPE-03, PIPE-04, PIPE-05, FAX-05, FAX-06
**Avoids:** Pitfall 1 (Stripe webhook timeout), Pitfall 6 (fax failure silences email), Anti-Pattern 4 (15-min cron requires Vercel Pro)
**Research flag:** Skip deeper research — pipeline pattern fully specified in ARCHITECTURE.md; cron behavior documented with HIGH confidence

### Phase 5: Receipt Email

**Rationale:** Email is the last step in the pipeline and has the clearest inputs (filing record + pdfBytes already in memory). The primary risk is the base64 conversion for Resend attachment and entity separation in the email template.
**Delivers:** `sendFilingReceiptEmail()` sending branded email from `noreply@easyfilercomplaint.com` with PDF attached; `Filing.receiptEmailSentAt` updated; entity separation scan extended to email HTML
**Addresses:** EMAIL-01, EMAIL-02, EMAIL-03, EMAIL-04, EMAIL-05, EMAIL-06
**Avoids:** Pitfall 8 (Resend Uint8Array not base64), Pitfall 10 (entity separation in email template)
**Research flag:** Skip deeper research — Resend attachment pattern fully documented in STACK.md and ARCHITECTURE.md with HIGH confidence

### Phase Ordering Rationale

- PDF generation must come before everything because it is the only step with no external dependencies and the most internal complexity
- Blob storage must come before fax delivery (Phaxio `content_url` needs a real URL) and before email attachment (Resend `path` needs a real URL)
- Fax delivery should be isolated and verified before pipeline wiring to catch the Node.js multipart bug and webhook URL issues in isolation
- Pipeline orchestration and cron come after all three service steps are proven, not before
- Email is last because it depends on the pipeline having `pdfBytes` in scope and `complaintPdfUrl` on the Filing record

### Research Flags

Needs validation during planning/execution:
- **Phase 3 (Fax):** CA AG fax number must be verified against `oag.ca.gov` before go-live — do not trust any number in existing stubs without verification; Phaxio test mode must be used in development
- **Phase 3 (Fax):** Confirm `axios` or `node-fetch` is available in `package.json` (or install) — needed to avoid native fetch multipart bug

Phases with standard patterns (research already sufficient):
- **Phase 1 (PDF):** pdf-lib API signatures fully documented at HIGH confidence; fontkit pattern is well-established
- **Phase 2 (Blob):** Vercel Blob `put()` documented at HIGH confidence; fallback pattern explicit
- **Phase 4 (Pipeline):** Pattern is fully specified in ARCHITECTURE.md; no novel integrations
- **Phase 5 (Email):** Resend attachment pattern documented at HIGH confidence; only risk is base64 conversion (one line)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All three integrations verified against official docs; API method signatures confirmed; no novel packages required |
| Features | MEDIUM-HIGH | PDF letter structure inferred from CA AG form analysis (MEDIUM); Phaxio and Resend feature sets verified from official docs (HIGH) |
| Architecture | HIGH | Vercel Blob, Vercel cron, Phaxio webhook algorithm verified from official Vercel and Phaxio docs; pipeline pattern is standard Next.js serverless pattern |
| Pitfalls | HIGH | All 10 pitfalls verified against official docs or primary sources; Node.js multipart bug confirmed via Phil Nash (2025) + Phaxio docs |

**Overall confidence:** HIGH

### Gaps to Address

- **CA AG fax number verification:** The number `+19163235341` is in the existing `phaxio.ts` stub. It must be verified against the live `oag.ca.gov` CCPA complaint page before go-live. This is a data validation step, not a code step.
- **`@pdf-lib/fontkit` installation:** PITFALLS.md recommends fontkit for font embedding but it is not confirmed as installed. Verify `package.json` before Phase 1 begins. If absent, install `@pdf-lib/fontkit`.
- **`axios` or `node-fetch` availability:** PITFALLS.md identifies native `fetch` + `FormData` as broken for Phaxio on Node 18–23.6. Verify which package to use before Phase 3 begins.
- **Vercel plan tier:** Vercel cron at `*/15 * * * *` requires a Pro plan. Confirm account tier before adding `vercel.json`. On Hobby, use `0 */1 * * *` (hourly) as a temporary fallback.
- **Phaxio v2.1 → Sinch migration timeline:** Phaxio v2.1 credentials still work as of 2026 but Sinch Fax API v3 (OAuth 2.0, camelCase fields) is available. No forced migration date confirmed. Monitor Phaxio/Sinch communications for deprecation notices.
- **Resend domain verification:** `easyfilercomplaint.com` must be verified in the Resend dashboard before any email sends. Confirm this is already done from v1.0 work.

## Sources

### Primary (HIGH confidence)
- [pdf-lib PDFDocument API docs](https://pdf-lib.js.org/docs/api/classes/pdfdocument) — method signatures, StandardFonts enum, save() return type
- [pdf-lib PDFPage API docs](https://pdf-lib.js.org/docs/api/classes/pdfpage) — drawText, drawLine, getSize
- [Phaxio v2 Create and Send Fax](https://www.phaxio.com/docs/api/v2/faxes/create_and_send_fax) — endpoint, FormData fields, auth
- [Phaxio Status Codes](https://www.phaxio.com/docs/statuses) — complete status enum
- [Phaxio Callback Verification](https://www.phaxio.com/docs/security/callbacks) — HMAC-SHA1 algorithm
- [Resend Attachments docs](https://resend.com/docs/dashboard/emails/attachments) — Attachment interface
- [Vercel Blob SDK — put() reference](https://vercel.com/docs/vercel-blob/using-blob-sdk) — put() shape, access modes
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs) — schedule format, plan limits
- [Vercel Managing Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs) — CRON_SECRET, Hobby plan restrictions

### Secondary (MEDIUM confidence)
- [Phaxio v2.1 Send Webhooks](https://www.phaxio.com/docs/api/v2.1/faxes/send_webhooks) — webhook event_type fields (page partially rendered)
- [CPPA Consumer Complaint Form (paper)](https://cppa.ca.gov/pdf/paper-complaint.pdf) — complaint letter section structure
- [CA AG CCPA Complaint Page](https://oag.ca.gov/privacy/ccpa) — agency recipient block, fax number

### Tertiary (MEDIUM confidence — community, cross-referenced)
- [Phil Nash — Troubles with multipart form-data and fetch in Node.js (2025)](https://philna.sh/blog/2025/01/14/troubles-with-multipart-form-data-fetch-node-js/) — Node.js 18–23.6 multipart CRLF bug
- [pdf-lib GitHub Issue #468](https://github.com/Hopding/pdf-lib/issues/468) — Standard Fonts not embedded confirmation
- [Resend base64 attachment (nesin.io)](https://nesin.io/blog/send-email-attachment-resend) — base64 conversion pattern (cross-referenced with resend@6.9.4 SDK)

---
*Research completed: 2026-04-01*
*Ready for roadmap: yes*
