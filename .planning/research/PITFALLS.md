# Pitfalls Research

**Domain:** Multi-step filing pipeline — PDF generation, fax delivery, email with attachment (Next.js 14 / Vercel / pdf-lib / Phaxio / Resend)
**Researched:** 2026-04-01
**Confidence:** HIGH (all findings verified against official docs or primary sources)

---

## Critical Pitfalls

### Pitfall 1: Stripe Webhook Kills the Pipeline Mid-Execution

**What goes wrong:**
The Stripe webhook handler calls `executeFilingPipeline()` and awaits it before returning 200. The pipeline (PDF → Blob upload → Phaxio fax → Resend email) takes 3–15 seconds. Stripe expects a 200 within ~5 seconds; if the function exceeds its timeout, Stripe marks the webhook as failed and retries — potentially running the pipeline multiple times for the same payment. Alternatively, on Vercel the function terminates after the response, cutting off any unawaited async work done after `return new Response(...)`.

**Why it happens:**
Stripe's documentation was written for always-on servers where you can respond first and keep processing. On Vercel serverless, the execution context is frozen immediately after the response is sent. Developers either block on the pipeline (causing timeout retries) or fire-and-forget after responding (causing silent truncation).

**How to avoid:**
Return 200 to Stripe as quickly as possible (after signature verification and idempotency check), then run the pipeline synchronously within the same function invocation — but configure `maxDuration` in `next.config.js` to allow enough time. The Vercel default is 300s which is sufficient, but the default for Hobby is also 300s. The key pattern:

```typescript
// Verify signature → check idempotency → return 200 → then pipeline runs
// WRONG: fire-and-forget after response (truncated on Vercel)
// RIGHT: await pipeline before responding, configure maxDuration = 60
```

Set `export const maxDuration = 60` in the route file for the webhook handler. For PIPE-02, the webhook handler must complete the pipeline before returning, relying on Vercel's 300s limit for synchronous execution.

**Warning signs:**
- Stripe dashboard shows the same `checkout.session.completed` event delivered multiple times
- Filing records are created more than once for the same `stripeSessionId`
- Pipeline runs but receipt email is never sent (function terminated mid-flight)

**Phase to address:** Phase 3 (Fax Delivery + Pipeline Orchestrator — PIPE-01, PIPE-02, PIPE-03)

---

### Pitfall 2: pdf-lib Cannot Read Font Files From the Filesystem on Vercel

**What goes wrong:**
`fs.readFileSync('./public/fonts/Inter.ttf')` works locally but throws `ENOENT` in production because Vercel's Node File Trace bundling does not automatically include font files referenced by string path at runtime unless they are explicitly declared via `outputFileTracingIncludes` in `next.config.js`.

**Why it happens:**
Vercel bundles only files it can statically trace as imports. String-based `fs.readFile` paths with runtime-computed variables are not traced. The `/tmp` directory is writable but empty; `process.cwd()` is the Lambda task root, not `public/`.

**How to avoid:**
Two safe patterns:

1. Fetch fonts from a URL at generation time (fetch the font from Vercel Blob or a CDN, convert to `ArrayBuffer`, pass to `pdfDoc.embedFont()`). This is the most reliable approach.
2. Use `outputFileTracingIncludes` in `next.config.js` to force-include the font file, then use `process.cwd()` (not `__dirname`) to construct the path.

For this project, since fonts need to match the formal document aesthetic (Fraunces / Inter), option 1 (fetch from Blob) is recommended because it works in all environments without configuration.

**Warning signs:**
- PDF generation works in `next dev` but throws `ENOENT` or generates a PDF with no text after deployment
- Error logs show `Error: ENOENT: no such file or directory` inside the PDF generation function

**Phase to address:** Phase 3 (Complaint PDF Generation — PDF-01, PDF-02, PDF-03)

---

### Pitfall 3: pdf-lib Standard Fonts Are Not Actually Embedded

**What goes wrong:**
Using `StandardFonts.Helvetica` or `StandardFonts.TimesRoman` from pdf-lib produces a PDF where those fonts are referenced but not embedded. Different PDF viewers substitute different fonts — Helvetica becomes ArialMT on Windows, CourierStd on some Linux viewers. For a formal government complaint letter, inconsistent rendering undermines the document's professional appearance and could affect legibility at the government fax receiver.

**Why it happens:**
The 14 standard PDF fonts predate the embedding requirement. pdf-lib ships only font metrics for them, not the actual font binary. pdf-lib explicitly never embeds them — they rely on the viewer's local copy.

**How to avoid:**
Embed a real font via `@pdf-lib/fontkit`. Register fontkit with `pdfDoc.registerFontkit(fontkit)` before calling `embedFont()`. Use a web-safe, freely-licensed font (e.g., Liberation Serif, Noto Serif) fetched as an `ArrayBuffer`. This guarantees identical rendering everywhere, including government fax machines that print PDFs.

**Warning signs:**
- PDF looks correct in Chrome but different in Acrobat Reader
- Font in the generated PDF shown as "referenced" not "embedded" in PDF metadata viewers
- No `fontkit` in `package.json`

**Phase to address:** Phase 3 (Complaint PDF Generation — PDF-01, PDF-02)

---

### Pitfall 4: Phaxio Basic Auth with Native fetch + FormData Fails on Node.js 18–23.6

**What goes wrong:**
Using the native `fetch` API with `FormData` and `Authorization: Basic ...` to call the Phaxio API returns a `422 Invalid multipart formatting` error. This is a confirmed bug in Node.js versions 18.0.0–23.6.0 where undici (Node's fetch implementation) omits the required trailing CRLF from the multipart body boundary.

**Why it happens:**
RFC 7578 does not mandate the trailing CRLF, but Phaxio's API (like many servers) validates multipart boundaries expecting it — following curl's convention. Node's undici implementation was non-conformant until version 7.1.0 (shipped in Node 23.7.0).

**How to avoid:**
Use the `node-fetch` package or the `axios` library for the Phaxio API call, both of which include the trailing CRLF. Alternatively, use `npm install undici@latest` to override the Node.js built-in. Do NOT use native `fetch` with `FormData` for Phaxio calls on current Vercel runtimes (Node 18.x or 20.x).

Phaxio Basic auth format: `Authorization: Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`. The key and secret are both required — omitting either returns 401.

**Warning signs:**
- Phaxio returns HTTP 422 with body `{"success": false, "message": "Invalid multipart formatting"}`
- Fax call works via curl but fails from the Next.js API route
- Node version is 18.x or 20.x (Vercel default)

**Phase to address:** Phase 4 (Fax Delivery — FAX-01, FAX-02, FAX-03)

---

### Pitfall 5: Vercel Function Payload Limit Blocks Phaxio File Upload

**What goes wrong:**
The filing pipeline calls the Phaxio API from inside a Vercel function and must send the complaint PDF as a `multipart/form-data` file. The Phaxio API limits individual requests to 20 MB. However, Vercel's internal request/response payload limit is 4.5 MB. If the pipeline fetches the PDF from Vercel Blob and re-streams it outbound within the same function, the intermediate buffer may exceed the inbound 4.5 MB constraint if the function is also receiving a large webhook payload.

The actual complaint PDF for this project is a single-page letter (~50–150 KB), so the 4.5 MB limit is not the immediate risk. The risk is if evidence files (WIZ-03, FAX-07, max 5 MB) are piped through the function rather than streamed directly.

**Why it happens:**
Developers fetch Blob content into memory (as `Buffer`) and then post it to Phaxio. For larger evidence files, the in-memory buffer can approach or exceed limits. The Vercel function is both receiving the pipeline trigger and sending out to Phaxio, creating a payload double-dip.

**How to avoid:**
Pass the Blob URL to Phaxio using the `content_url` parameter instead of uploading the file bytes directly. Phaxio will fetch it themselves. For the complaint PDF, use `content_url: complaintPdfUrl` (from PDF-05). Only use direct file upload when a content URL is not usable.

**Warning signs:**
- Phaxio call succeeds in local dev (where files are small/local) but fails in production with large evidence files
- Vercel logs show `413 FUNCTION_PAYLOAD_TOO_LARGE` for the fax dispatch route

**Phase to address:** Phase 4 (Fax Delivery — FAX-01, FAX-07)

---

### Pitfall 6: Fax Failure Silences the Receipt Email (PIPE-05 Violation)

**What goes wrong:**
The pipeline is written as a linear `await` chain: generate PDF → upload to Blob → send fax → send email. If `sendFax()` throws, the `catch` block sets `status = 'failed'` and returns early — never reaching `sendFilingReceiptEmail()`. The consumer paid $1.99 and receives no confirmation email, no receipt, and no explanation. This is both a customer experience failure and a potential chargeback trigger.

**Why it happens:**
Developers naturally write pipelines as sequential try/catch with early returns on failure. PIPE-05 requires a deliberate break from this pattern: fax failure is not a terminal condition for the email step.

**How to avoid:**
Structure the pipeline so the email step is always attempted, regardless of fax outcome. Use a try/catch around the fax step that captures the error and sets a `faxFailed` flag, then continues to the email step, passing the flag so the email template can include "we encountered an issue with your fax — we will retry shortly."

```typescript
let faxResult: FaxResult | null = null;
let faxError: Error | null = null;
try {
  faxResult = await sendFax(...);
} catch (err) {
  faxError = err as Error;
  await prisma.filing.update({ where: { id }, data: { status: 'failed', faxStatus: 'failed' } });
}
// Always send email, with or without fax success
await sendFilingReceiptEmail({ ..., faxFailed: faxError !== null });
```

**Warning signs:**
- `status = 'failed'` filings have no `receiptEmailSentAt` value
- Consumer reports no confirmation email after payment
- Pipeline function exits after fax error without entering the email block

**Phase to address:** Phase 4 (Pipeline Orchestrator — PIPE-04, PIPE-05)

---

### Pitfall 7: Phaxio Webhook Signature Verification Requires Raw Body + Exact URL Match

**What goes wrong:**
The Phaxio webhook handler parses the body as JSON or uses `req.body` from Next.js middleware, losing the raw bytes needed for HMAC-SHA1 verification. Additionally, Phaxio's signature algorithm requires the exact callback URL string (including trailing slash if any) that was registered — if the webhook was registered with `https://www.easyfilercomplaint.com/api/webhooks/phaxio` but the function receives `https://easyfilercomplaint.com/api/webhooks/phaxio` (missing `www.`), the signature will never match.

**Why it happens:**
Next.js App Router route handlers auto-parse JSON bodies when `Content-Type: application/json`. Phaxio sends `application/x-www-form-urlencoded` POST data, but developers still read it with the wrong method. The URL mismatch issue is specific to this project's `www.` requirement (noted in PROJECT.md).

**How to avoid:**
Read the raw body with `await request.text()` and manually parse the form fields with `new URLSearchParams(body)`. Reconstruct the signature per Phaxio's algorithm (sort POST params alphabetically, concatenate name+value to URL, HMAC-SHA1 with callback token). Register the webhook URL in Phaxio dashboard as `https://www.easyfilercomplaint.com/api/webhooks/phaxio` (with `www.`) and use that exact string in the signature verification.

**Warning signs:**
- Phaxio webhook returns 200 but fax status is never updated in the database
- Logs show `Signature mismatch` errors or the webhook handler silently returns early
- Fax status remains `pending` indefinitely even after confirmed delivery

**Phase to address:** Phase 4 (Fax Delivery — FAX-04)

---

### Pitfall 8: Resend Attachment Requires Base64 String, Not Buffer or Uint8Array

**What goes wrong:**
pdf-lib's `pdfDoc.save()` returns a `Uint8Array`. Passing it directly to Resend's `attachments[].content` field either silently sends a corrupted file or throws a type error. The Resend SDK requires a base64-encoded string for the `content` field, not a Buffer or Uint8Array.

**Why it happens:**
Developers assume Node.js Buffer/Uint8Array is interchangeable with base64. Resend's TypeScript types may accept `string | Buffer` but the API transport layer encodes it differently. The silent corruption case (Buffer treated as string) is the most dangerous because the email sends successfully but the attachment is unreadable.

**How to avoid:**
Always convert the pdf-lib output explicitly:
```typescript
const pdfBytes = await pdfDoc.save(); // Uint8Array
const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
// Pass pdfBase64 to Resend attachments[].content
```

**Warning signs:**
- Email delivers successfully but the PDF attachment cannot be opened
- Attachment file size in email client is wrong (much smaller than expected)
- No error thrown but PDF shows "file is damaged or cannot be repaired"

**Phase to address:** Phase 5 (Receipt Email — EMAIL-04)

---

### Pitfall 9: Vercel Blob Upload Requires BLOB_READ_WRITE_TOKEN in All Environments

**What goes wrong:**
`@vercel/blob`'s `put()` function reads `process.env.BLOB_READ_WRITE_TOKEN` automatically on Vercel. In local development, this environment variable must be added manually to `.env.local`. If it is missing, the call throws `BlobError: No token found`. Because PDF-04 includes a "DB fallback if BLOB_READ_WRITE_TOKEN not set", developers may write conditional logic that silently falls through to the fallback in production when the env var is missing — causing the PDF URL to never be stored.

**Why it happens:**
The Vercel dashboard auto-injects the token into Vercel deployments, but not local environments. The conditional fallback masks the missing-token error in development, leading to untested production paths.

**How to avoid:**
Fail loudly if `BLOB_READ_WRITE_TOKEN` is not set in production. Reserve the DB fallback strictly for local development with an explicit `NODE_ENV === 'development'` guard. Add `BLOB_READ_WRITE_TOKEN` to the project's required environment variable checklist.

**Warning signs:**
- `Filing.complaintPdfUrl` is null after a successful fax (Blob upload silently fell through to fallback)
- PDF download link on the success page returns 404
- No Blob objects appear in the Vercel dashboard for a project that processed filings

**Phase to address:** Phase 3 (Complaint PDF — PDF-04, PDF-05)

---

### Pitfall 10: Entity Separation Leak in PDF Content or Email Template

**What goes wrong:**
A reference to DPW, Pro Veritas Law, APFC, ComplianceSweep, or IdentifiedVerified appears in the generated complaint PDF body copy or the filing receipt email. This is not a runtime error — it is a silent compliance failure that could invalidate the consumer's complaint, expose EFC to regulatory liability, or breach entity separation requirements.

**Why it happens:**
Copy is drafted quickly under deadline, reusing boilerplate from related entities. The complaint body text (PDF-03) is driven by `complaintType` but a shared template or footer might carry prohibited language. The email template (EMAIL-05) might reference a parent brand in a "powered by" footer.

**How to avoid:**
Add an automated assertion to the PDF and email generation tests that scans the output for prohibited strings: `['DPW', 'Pro Veritas', 'APFC', 'ComplianceSweep', 'IdentifiedVerified', 'attorney', 'law firm', 'lawsuit']`. This assertion runs in CI and blocks deployment if any prohibited term is found. Entity separation is a go/no-go requirement (PDF-06, EMAIL-05).

**Warning signs:**
- PDF or email copy reuses text from any other entity's templates
- Any legal-sounding language that implies attorney-client relationship (`our attorneys`, `legal counsel`, `representation`)
- Footer contains a domain other than `easyfilercomplaint.com`

**Phase to address:** Phase 3 (PDF generation — PDF-06) and Phase 5 (Email — EMAIL-05); verify at every phase

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Inline pipeline in Stripe webhook handler | No extra abstraction layer | Hard to test, impossible to retry individual steps | Never — extract `executeFilingPipeline()` |
| Skip Phaxio webhook verification | Faster implementation | Any caller can fake fax status updates; fraudulent `filed` status possible | Never |
| Use standard PDF fonts (Helvetica) | No fontkit setup | Inconsistent rendering in government environments | Never for formal documents |
| Store PDF bytes in Postgres instead of Blob | No Blob token setup needed | Large BYTEA columns degrade query performance over time | OK for local dev only |
| Fire-and-forget email after fax | Simpler control flow | Email never sent if function terminates early | Never |
| Hard-code CA AG fax number in source | No config layer needed | Fax number changes require code deployment | Acceptable for v1 with a TODO |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Phaxio API auth | Using `fetch` with `FormData` on Node.js 18–23.6 | Use `axios` or `node-fetch`; native fetch multipart is broken |
| Phaxio API auth | Omitting API secret from Basic auth | Both `apiKey` and `apiSecret` required; format: `key:secret` base64 |
| Phaxio webhook | Reading body as JSON | Phaxio sends `application/x-www-form-urlencoded`; use `request.text()` + URLSearchParams |
| Phaxio webhook | Using non-www URL for callback | Vercel redirects non-www to www; signature computed against registered URL; always use `www.` |
| Resend | Passing `Uint8Array` directly as attachment content | Convert to base64 string: `Buffer.from(pdfBytes).toString('base64')` |
| Resend | Sending via batch endpoint with attachment | Batch endpoint does not support attachments; use standard send endpoint |
| pdf-lib | Reading font files with `fs.readFileSync` | Fetch fonts from URL or Blob; register fontkit before `embedFont()` |
| pdf-lib | Using `StandardFonts.Helvetica` | Embed a real font via fontkit for consistent rendering |
| Vercel Blob | Missing `BLOB_READ_WRITE_TOKEN` in `.env.local` | Add to local env; fail loudly in production if missing |
| Stripe webhook | Using `req.json()` before signature verification | Use `await request.text()` to preserve raw body for `constructEvent()` |
| Stripe webhook | Awaiting pipeline before returning 200 | Configure `maxDuration`; return 200 only after verifying signature, check idempotency, then run pipeline |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetching font bytes on every PDF generation | PDF generation takes 500ms–2s extra; cold start amplification | Upload font to Vercel Blob at deploy time; cache in module scope if warm | Every invocation; worse at cold start |
| Loading full evidence file into memory before sending to Phaxio | Memory spike; possible 413 on large files | Use Phaxio `content_url` parameter with Blob URL | Files > ~2 MB |
| Generating PDF inside the Stripe webhook synchronously | Webhook timeout → Stripe retries → duplicate pipeline runs | Set `maxDuration = 60` in route file; check idempotency by `stripeSessionId` before running | Whenever PDF + fax + email exceeds 5s |
| Prisma cold-start connection overhead | First webhook after idle period times out | Use Prisma Accelerate or connection pooling; consider `connection_limit=1` in DATABASE_URL | First request after ~5 min idle |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Skip Phaxio webhook signature verification | Attacker fakes fax delivery status; filings falsely marked `filed` | Always verify `X-Phaxio-Signature` HMAC-SHA1 |
| Expose Phaxio API key/secret in client-side code | Full account compromise; fraudulent fax charges | Keys must only be used server-side in environment variables |
| Return 400 with full Phaxio callback token in error message | Token exposure enables signature forgery | Return generic error; never log the callback token value |
| CA AG fax number in public source code | Not a security risk but creates audit trail confusion | Keep in `agency-directory.ts` but note it is public data; verify against oag.ca.gov before go-live |
| Entity separation breach in PDF/email | Regulatory liability; could link EFC to affiliated entities publicly | Automated content scan in CI pipeline |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Fax failure with no consumer notification | Consumer doesn't know filing status; calls support or disputes charge | PIPE-05: always send receipt email with fax status; include retry timeline |
| Success page shows before pipeline completes | Consumer sees "Filed!" but PDF/fax not yet generated | Mark status `generating` during pipeline; success page polls or shows "processing" state until `filed` |
| Receipt email PDF attachment corrupted | Consumer cannot open the only evidence of their filing | Verify attachment opens in tests before shipping; use base64 conversion |
| No receipt ID visible until email arrives | Consumer anxiety post-payment | Show `filingReceiptId` on the success page immediately (PAY-07) |

---

## "Looks Done But Isn't" Checklist

- [ ] **Phaxio fax send:** Tested with the actual test fax number (+14158001000) in Phaxio test mode — verify the response includes a real `faxId` and `faxStatus = 'queued'`
- [ ] **PDF font embedding:** Open the generated PDF in Acrobat Reader (not just Chrome) and confirm fonts are shown as "embedded" in Document Properties
- [ ] **Resend attachment:** Download the PDF attachment from a real delivered email — do not just verify the API call succeeded
- [ ] **Phaxio webhook:** Trigger a test delivery event from the Phaxio dashboard and confirm `Filing.faxStatus` updates in the database
- [ ] **Entity separation:** Run the prohibited-string scan against the PDF bytes and the email HTML before marking any phase complete
- [ ] **Idempotency:** Replay the same Stripe `checkout.session.completed` event twice and confirm only one `Filing` is updated and only one email is sent
- [ ] **PIPE-05:** Manually throw inside `sendFax()` and confirm the receipt email is still sent with a fax-failure note
- [ ] **CA AG fax number:** Verified against `oag.ca.gov` — not a placeholder

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Duplicate pipeline run from Stripe retry | LOW | Idempotency check on `stripeSessionId` prevents duplicate execution; idempotency key is already in schema |
| Fax failure (filing stuck in `failed`) | LOW | FAX-05 cron re-polls; OPS-02 (v2) manual retry; for v1, manual Phaxio dashboard retry |
| PDF generation failure | MEDIUM | Re-trigger pipeline via admin endpoint; need PIPE-04 to set recoverable vs. unrecoverable state |
| Resend email bounce | LOW | Resend dashboard shows delivery status; resend manually from dashboard; log `receiptEmailSentAt = null` filings |
| Font ENOENT on Vercel | HIGH | Requires code change + deploy; use URL-based font loading to prevent entirely |
| Entity separation breach discovered post-launch | HIGH | Immediate deploy with corrected copy; potentially regenerate any affected PDFs |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Stripe webhook timeout / pipeline async | Phase 3 (Pipeline) — PIPE-01, PIPE-02 | Replay Stripe webhook event; confirm no duplicate runs |
| pdf-lib font file ENOENT on Vercel | Phase 3 (PDF) — PDF-01 | Deploy and generate; check Vercel function logs |
| Standard fonts not embedded | Phase 3 (PDF) — PDF-01, PDF-02 | Open PDF in Acrobat; check Document Properties > Fonts |
| Phaxio native fetch FormData bug | Phase 4 (Fax) — FAX-01 | Send test fax; confirm no 422 error |
| Vercel payload limit for Phaxio file upload | Phase 4 (Fax) — FAX-01, FAX-07 | Test with 5 MB evidence file; use `content_url` |
| Fax failure silences email (PIPE-05) | Phase 4 (Pipeline) — PIPE-05 | Inject fax failure in test; confirm email still sends |
| Phaxio webhook signature + URL mismatch | Phase 4 (Fax) — FAX-04 | Fire test webhook from Phaxio dashboard; check DB update |
| Resend Uint8Array not base64 | Phase 5 (Email) — EMAIL-04 | Send real email; download and open PDF attachment |
| Vercel Blob missing token | Phase 3 (PDF) — PDF-04 | Verify env var exists in Vercel project settings pre-deploy |
| Entity separation leak | Phase 3 (PDF) — PDF-06 and Phase 5 (Email) — EMAIL-05 | Automated string scan in CI; manual review before go-live |

---

## Sources

- Vercel Functions Limits (official): https://vercel.com/docs/functions/limitations
- Vercel: "What can I do about functions timing out?": https://vercel.com/kb/guide/what-can-i-do-about-vercel-serverless-functions-timing-out
- Phil Nash — "Troubles with multipart form-data and fetch in Node.js" (2025): https://philna.sh/blog/2025/01/14/troubles-with-multipart-form-data-fetch-node-js/
- Phaxio API — Create and Send a Fax: https://www.phaxio.com/docs/api/v2/faxes/create_and_send_fax
- Phaxio — Verifying Callback Requests: https://www.phaxio.com/docs/security/callbacks
- Resend — Attachments documentation: https://resend.com/docs/dashboard/emails/attachments
- pdf-lib GitHub — Standard Fonts are NOT actually embedded (Issue #468): https://github.com/Hopding/pdf-lib/issues/468
- pdf-lib GitHub — Cannot embed custom font from local file (Issue #372): https://github.com/Hopding/pdf-lib/issues/372
- Vercel KB — How can I use files in Vercel Functions?: https://vercel.com/kb/guide/how-can-i-use-files-in-serverless-functions
- Next.js/Stripe webhook body parsing (App Router): https://kitson-broadhurst.medium.com/next-js-app-router-stripe-webhook-signature-verification-ea9d59f3593f
- GitHub Discussion — Stripe Webhook return 200 AND run logic in Next.js: https://github.com/vercel/next.js/discussions/49282
- Vercel Blob — Server Uploads: https://vercel.com/docs/vercel-blob/server-upload

---
*Pitfalls research for: EasyFilerComplaint — PDF / Phaxio / Resend pipeline on Next.js 14 + Vercel*
*Researched: 2026-04-01*
