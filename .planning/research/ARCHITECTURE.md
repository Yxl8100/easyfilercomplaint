# Architecture Research

**Domain:** Complaint filing pipeline — PDF generation, fax delivery, receipt email
**Researched:** 2026-04-01
**Confidence:** HIGH (Vercel Blob, cron, Resend docs verified; Phaxio webhook algorithm verified from official docs)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    External Entry Points                          │
│  ┌──────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │ Stripe Webhook   │  │ Phaxio Webhook │  │  Vercel Cron     │  │
│  │ POST /api/       │  │ POST /api/     │  │  GET /api/cron/  │  │
│  │ webhooks/stripe  │  │ webhooks/      │  │  check-fax-      │  │
│  │ (already exists) │  │ phaxio (NEW)   │  │  status (NEW)    │  │
│  └────────┬─────────┘  └───────┬────────┘  └────────┬─────────┘  │
└───────────┼────────────────────┼─────────────────────┼────────────┘
            │                    │                     │
            ▼                    ▼                     ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Pipeline Orchestration Layer                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │         src/lib/filing-pipeline.ts (NEW — PIPE-01)         │  │
│  │  executeFilingPipeline(filingId)                           │  │
│  │  1. status → generating                                    │  │
│  │  2. generateComplaintPdf(filing)      → Uint8Array         │  │
│  │  3. storeToBlob(pdfBytes, filingId)   → url                │  │
│  │  4. sendFax(url, faxNumber)           → faxId              │  │
│  │  5. sendFilingReceiptEmail(filing)    → void               │  │
│  │  6. status → filed (or failed)                             │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
            │ calls
            ▼
┌──────────────────────────────────────────────────────────────────┐
│                         Service Layer                             │
│  ┌─────────────────────┐  ┌────────────────┐  ┌───────────────┐  │
│  │ generate-complaint- │  │ phaxio.ts      │  │ send-filing-  │  │
│  │ pdf.ts (NEW/REFAC.) │  │ (already       │  │ receipt-      │  │
│  │ generateComplaint-  │  │ exists — needs │  │ email.ts (NEW)│  │
│  │ Pdf(filing) →       │  │ evidence file  │  │ sendFiling-   │  │
│  │ Uint8Array          │  │ multi-attach)  │  │ ReceiptEmail()│  │
│  └──────────┬──────────┘  └───────┬────────┘  └───────┬───────┘  │
│             │                     │                   │           │
│  ┌──────────▼──────────┐  ┌───────▼────────┐          │           │
│  │ Vercel Blob         │  │ agency-        │          │           │
│  │ storeToBlob() (NEW) │  │ directory.ts   │          │           │
│  │ @vercel/blob put()  │  │ (NEW)          │          │           │
│  └──────────┬──────────┘  └────────────────┘          │           │
└─────────────┼──────────────────────────────────────────┼──────────┘
              │                                          │
              ▼                                          ▼
┌──────────────────────────┐              ┌──────────────────────────┐
│  Vercel Blob Store       │              │  Resend API              │
│  complaints/{filingId}/  │              │  (email + PDF attachment)│
│  {receiptId}.pdf         │              └──────────────────────────┘
└──────────────────────────┘
              │
              ▼ (url passed to sendFax)
┌──────────────────────────┐
│  Phaxio API              │
│  POST /v2/faxes          │
│  multipart/form-data     │
│  with PDF buffer         │
└──────────────────────────┘
              │ (async callback)
              ▼
┌──────────────────────────┐
│  POST /api/webhooks/     │
│  phaxio                  │
│  → updates Filing faxStatus│
└──────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Stripe webhook | Triggers pipeline after payment confirmation | `app/api/webhooks/stripe/route.ts` (modify) |
| `executeFilingPipeline` | Orchestrates PDF → Blob → Fax → Email in sequence | `src/lib/filing-pipeline.ts` (NEW) |
| `generateComplaintPdf` | Produces formal government-style complaint PDF bytes | `src/lib/generate-complaint-pdf.ts` (NEW — replaces pdf-filler.ts pattern) |
| `storeToBlob` | Stores PDF bytes in Vercel Blob, returns public URL | inside `filing-pipeline.ts` or `src/lib/blob-storage.ts` (NEW) |
| `sendFax` | Sends PDF to agency via Phaxio, accepts buffer | `src/lib/phaxio.ts` (already exists — verify evidence multi-attach) |
| Agency directory | Maps agency codes to verified fax numbers | `src/lib/agency-directory.ts` (NEW — replaces AGENCY_FAX_NUMBERS const) |
| Phaxio webhook | Receives delivery status callbacks, updates Filing | `app/api/webhooks/phaxio/route.ts` (NEW) |
| `sendFilingReceiptEmail` | Sends Resend email with PDF attachment | `src/lib/send-filing-receipt-email.ts` (NEW) |
| Cron poller | Fallback poll for stalled fax statuses | `app/api/cron/check-fax-status/route.ts` (NEW) |

## Recommended Project Structure

```
src/
├── lib/
│   ├── filing-pipeline.ts          # NEW — orchestrator (PIPE-01 to PIPE-05)
│   ├── generate-complaint-pdf.ts   # NEW — formal letter generator (PDF-01 to PDF-06)
│   ├── agency-directory.ts         # NEW — fax numbers + agency metadata (FAX-02)
│   ├── send-filing-receipt-email.ts # NEW — Resend email with attachment (EMAIL-01 to EMAIL-06)
│   ├── phaxio.ts                   # EXISTS — sendFax + getFaxStatus (verify FAX-07 multi-attach)
│   ├── filing-receipt-id.ts        # EXISTS — receipt ID generator
│   ├── prisma.ts                   # EXISTS
│   └── stripe.ts                   # EXISTS
└── app/
    └── api/
        ├── webhooks/
        │   ├── stripe/
        │   │   └── route.ts        # EXISTS — add executeFilingPipeline call after status=paid
        │   └── phaxio/
        │       └── route.ts        # NEW — fax delivery status handler (FAX-04)
        └── cron/
            └── check-fax-status/
                └── route.ts        # NEW — poll fax status fallback (FAX-05, FAX-06)

vercel.json                         # NEW — cron schedule entry (FAX-06)
```

### Structure Rationale

- **`filing-pipeline.ts` at lib root:** The pipeline is called from the Stripe webhook route handler; it must be importable from both `app/api/webhooks/stripe/route.ts` and future callers (admin retry). Keeping it as a plain async function in `src/lib/` avoids coupling it to the HTTP layer.
- **`agency-directory.ts` separate from `phaxio.ts`:** The fax numbers are business configuration data, not Phaxio API concerns. Separation allows future multi-agency expansion without touching the API client.
- **`send-filing-receipt-email.ts` as standalone lib:** Email is a distinct capability from the fax service. Keeping them separate means each can be tested and updated independently.
- **Phaxio webhook as new file:** Webhook handler lives in `app/api/webhooks/phaxio/` to mirror the Stripe webhook pattern already in the codebase.
- **Cron under `app/api/cron/`:** Follows Vercel's documented convention. The `check-fax-status` subfolder names the intent clearly and allows adding other crons later.

## Architectural Patterns

### Pattern 1: Linear Pipeline with Status Checkpoints

**What:** The orchestrator advances the Filing record through explicit status transitions at each step. Each step reads the current Filing from the DB to get fresh data (e.g., the PDF URL needed for fax).
**When to use:** Any multi-step workflow where partial failure must be recoverable and auditable.
**Trade-offs:** Adds DB round-trips between steps; acceptable at this volume. Provides clear debugging signal from `status` field alone.

**Example:**
```typescript
// src/lib/filing-pipeline.ts
export async function executeFilingPipeline(filingId: string): Promise<void> {
  // Step 1: Advance to generating — idempotency guard
  const filing = await prisma.filing.findUniqueOrThrow({ where: { id: filingId } })
  if (filing.status !== 'paid') return  // already processed or not ready

  await prisma.filing.update({ where: { id: filingId }, data: { status: 'generating' } })

  // Step 2: Generate PDF
  let pdfBytes: Uint8Array
  try {
    pdfBytes = await generateComplaintPdf(filing)
  } catch (err) {
    await prisma.filing.update({ where: { id: filingId }, data: { status: 'failed' } })
    // PIPE-04: log and return — do not send email on PDF failure
    console.error('[pipeline] PDF generation failed', filingId, err)
    return
  }

  // Step 3: Store to Blob (or DB fallback per PDF-04)
  const pdfUrl = await storeComplaintPdf(pdfBytes, filingId, filing.filingReceiptId!)
  await prisma.filing.update({ where: { id: filingId }, data: { complaintPdfUrl: pdfUrl } })

  // Step 4: Send fax — advance to filing
  await prisma.filing.update({ where: { id: filingId }, data: { status: 'filing' } })
  let faxId: string | undefined
  try {
    const faxResult = await sendFaxToCaAg(pdfBytes, filing)
    faxId = faxResult.faxId
    await prisma.filing.update({
      where: { id: filingId },
      data: { faxId, faxStatus: 'queued', faxSentAt: new Date() },
    })
  } catch (err) {
    // PIPE-05: fax failure sets failed but still sends receipt email
    await prisma.filing.update({ where: { id: filingId }, data: { status: 'failed' } })
    console.error('[pipeline] Fax send failed', filingId, err)
    // fall through to email step intentionally
  }

  // Step 5: Send receipt email — runs even if fax failed (PIPE-05)
  try {
    await sendFilingReceiptEmail(filing, pdfUrl)
    await prisma.filing.update({
      where: { id: filingId },
      data: { receiptEmailSentAt: new Date() },
    })
  } catch (err) {
    console.error('[pipeline] Receipt email failed', filingId, err)
    // do not rethrow — pipeline is considered complete
  }

  // Mark filed only if fax succeeded
  if (faxId) {
    await prisma.filing.update({ where: { id: filingId }, data: { status: 'filed' } })
  }
}
```

### Pattern 2: Vercel Blob Server-Side Put

**What:** Use `@vercel/blob`'s `put()` from within a Next.js Route Handler or server-side function, passing PDF bytes as an `ArrayBuffer`. The token is auto-resolved from `BLOB_READ_WRITE_TOKEN` when deployed on Vercel.
**When to use:** Any server-to-Vercel-Blob upload where file size is under 4.5 MB. PDF complaints are well under this limit.
**Trade-offs:** `BLOB_READ_WRITE_TOKEN` must be provisioned from Vercel dashboard; local dev requires `vercel env pull`. Without the token, fall back to storing base64 in DB (PDF-04).

**Example:**
```typescript
import { put } from '@vercel/blob'

export async function storeComplaintPdf(
  pdfBytes: Uint8Array,
  filingId: string,
  receiptId: string
): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    // PDF-04 fallback: store base64 in Filing.complaintPdfUrl as data URI
    const b64 = Buffer.from(pdfBytes).toString('base64')
    return `data:application/pdf;base64,${b64}`
  }

  const pathname = `complaints/${filingId}/${receiptId}.pdf`
  const blob = await put(pathname, pdfBytes, {
    access: 'private',           // PDFs contain PII — never public
    contentType: 'application/pdf',
    addRandomSuffix: false,      // receipt ID already unique
  })

  return blob.url  // https://*.private.blob.vercel-storage.com/complaints/{id}/{receiptId}.pdf
}
```

**Install:** `npm install @vercel/blob`

**The `put()` return shape:**
```typescript
{
  pathname: string
  contentType: string
  contentDisposition: string
  url: string           // use this for fax download + email attachment
  downloadUrl: string
  etag: string
}
```

### Pattern 3: Phaxio Webhook with HMAC-SHA1 Verification

**What:** Phaxio POSTs `multipart/form-data` to `/api/webhooks/phaxio` with fax status. Verification uses HMAC-SHA1: reconstruct a string from the callback URL + sorted POST params + sorted file SHA1s, sign with the Phaxio callback token, compare to `X-Phaxio-Signature` header.
**When to use:** All Phaxio webhook handlers — verification is required for production security.
**Trade-offs:** The `rawBody` must be consumed before parsing. In Next.js 14 App Router, use `request.formData()` to get the parsed fields, then reconstruct the verification string from the extracted values.

**Phaxio sends (on fax completion):**

| POST Field | Value |
|------------|-------|
| `event_type` | `"fax_completed"` |
| `fax[id]` | numeric fax ID |
| `fax[status]` | `"success"` / `"failure"` / `"partialsuccess"` |
| `fax[num_pages]` | integer |
| `fax[completed_at]` | ISO timestamp |

**Verification algorithm (HMAC-SHA1):**
1. Start with the full callback URL (including `https://www.` prefix — do NOT use non-www)
2. Sort all POST parameters by name, append `name + value` with no delimiter
3. Sort file parts by name, append `name + SHA1(fileContents)` for each
4. Sign the result with HMAC-SHA1 using the Phaxio callback token as key
5. Compare hex digest to `X-Phaxio-Signature` header

```typescript
import crypto from 'crypto'

function verifyPhaxioSignature(
  callbackUrl: string,
  params: Record<string, string>,
  callbackToken: string,
  signature: string
): boolean {
  let data = callbackUrl
  const sortedKeys = Object.keys(params).sort()
  for (const key of sortedKeys) {
    data += key + params[key]
  }
  const hmac = crypto.createHmac('sha1', callbackToken)
  hmac.update(data)
  const computed = hmac.digest('hex')
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature))
}
```

### Pattern 4: Vercel Cron with CRON_SECRET Guard

**What:** `vercel.json` declares the cron schedule; Vercel invokes `GET /api/cron/check-fax-status` automatically, sending `Authorization: Bearer {CRON_SECRET}`. The handler validates the header before processing.
**When to use:** Any recurring background task that must run on a schedule without an external scheduler.
**Trade-offs:** Critical — the 15-minute schedule (`*/15 * * * *`) requires a **Vercel Pro plan**. Hobby plan restricts cron jobs to once per day maximum; deploying a sub-daily cron on Hobby will fail at deploy time. Cron jobs do not follow redirects; the route must respond directly at the cron path.

**vercel.json:**
```json
{
  "crons": [
    {
      "path": "/api/cron/check-fax-status",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

**Route handler pattern:**
```typescript
// app/api/cron/check-fax-status/route.ts
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  // query filings with status='filing' and no faxCompletedAt
  // call getFaxStatus(faxId) for each
  // update Filing.faxStatus, faxCompletedAt, faxPages as appropriate
  return Response.json({ processed: n })
}
```

### Pattern 5: Resend PDF Attachment

**What:** Resend accepts attachments as `{ filename, content }` where `content` is a base64 string. Convert `Uint8Array` from pdf-lib to a Node.js `Buffer`, then call `.toString('base64')`.
**When to use:** Any Resend email that needs to include the generated PDF.
**Trade-offs:** PDF bytes flow through memory — acceptable for single-page complaint letters (~50-100 KB). For large evidence files, prefer an attachment URL instead of inline base64.

**Example:**
```typescript
const pdfBuffer = Buffer.from(pdfBytes)

await resend.emails.send({
  from: 'EasyFilerComplaint <noreply@easyfilercomplaint.com>',
  to: [filing.email],
  subject: `Filing Receipt — ${filing.filingReceiptId}`,
  html: receiptHtml,
  attachments: [
    {
      filename: `EFC_Filing_${filing.filingReceiptId}.pdf`,
      content: pdfBuffer.toString('base64'),
    },
  ],
})
```

## Data Flow

### Happy Path: Payment → Filed

```
Consumer pays $1.99
    ↓
Stripe → POST /api/webhooks/stripe
    ↓ (signature verified)
Filing.status = 'paid', filingReceiptId assigned
    ↓ (direct call — no queue needed at this volume)
executeFilingPipeline(filingId)
    ↓
Filing.status = 'generating'
generateComplaintPdf(filing) → Uint8Array (pdf-lib)
    ↓
storeComplaintPdf() → Vercel Blob → url
Filing.complaintPdfUrl = url
    ↓
Filing.status = 'filing'
sendFax(pdfBytes, caAgFaxNumber) → Phaxio API → faxId
Filing.faxId = faxId, faxStatus = 'queued', faxSentAt = now
    ↓
sendFilingReceiptEmail(filing, pdfUrl) → Resend API → sent
Filing.receiptEmailSentAt = now
    ↓
Filing.status = 'filed'
```

### Fax Status Resolution (two paths)

```
Phaxio delivers fax
    ↓
Phaxio → POST /api/webhooks/phaxio (async, minutes later)
    ↓ (HMAC-SHA1 verified)
Filing.faxStatus = 'success' | 'failure'
Filing.faxCompletedAt = now
Filing.faxPages = n
    OR (fallback if webhook missed)
Vercel Cron → GET /api/cron/check-fax-status (every 15 min — Pro plan required)
    ↓
for each Filing where status='filing' AND faxCompletedAt IS NULL
    getFaxStatus(faxId) → Phaxio API
    update Filing.faxStatus, faxCompletedAt
```

### Key Data Flows

1. **PDF bytes in memory only during pipeline:** `generateComplaintPdf()` returns `Uint8Array` held in memory, stored to Blob, then passed as Buffer to email. The bytes do not persist in DB (unless Blob token is absent — fallback is base64 in `complaintPdfUrl`).
2. **faxId is a Phaxio numeric ID stored as `Filing.faxId` (String? field in schema):** The existing schema has `faxId String?` — Phaxio returns a numeric ID. Store as `result.data.id.toString()` and parse back with `parseInt` when calling `getFaxStatus`.
3. **Email uses PDF URL or re-fetches bytes:** If `complaintPdfUrl` is a real Blob URL, fetch bytes from it for the email attachment. If it's a data URI (fallback), parse the base64 segment directly. The pipeline has the `Uint8Array` in memory — pass it through to `sendFilingReceiptEmail` rather than re-fetching from Blob.

## Integration Points

### New vs Modified Files

| File | New or Modified | Purpose |
|------|----------------|---------|
| `src/lib/filing-pipeline.ts` | NEW | PIPE-01 to PIPE-05: orchestrator |
| `src/lib/generate-complaint-pdf.ts` | NEW | PDF-01 to PDF-06: formal letter generator (replaces pdf-filler.ts usage in pipeline) |
| `src/lib/agency-directory.ts` | NEW | FAX-02: agency code → fax number + name |
| `src/lib/send-filing-receipt-email.ts` | NEW | EMAIL-01 to EMAIL-06: Resend with attachment |
| `src/lib/phaxio.ts` | MODIFY (minor) | FAX-07: add evidence file multi-attach support to `sendFax()` |
| `src/app/api/webhooks/stripe/route.ts` | MODIFY | PIPE-02: add `executeFilingPipeline(filingId)` call after `status='paid'` |
| `src/app/api/webhooks/phaxio/route.ts` | NEW | FAX-04: Phaxio delivery callback |
| `src/app/api/cron/check-fax-status/route.ts` | NEW | FAX-05: 15-minute polling fallback |
| `vercel.json` | NEW | FAX-06: cron schedule declaration |

### External Services

| Service | Integration Pattern | Auth | Notes |
|---------|---------------------|------|-------|
| Phaxio | REST API (FormData POST, Basic auth) | `PHAXIO_API_KEY:PHAXIO_API_SECRET` in Basic auth header | Already wired in `phaxio.ts`; verify CA AG fax number before go-live |
| Phaxio webhook | Incoming POST to `/api/webhooks/phaxio` | HMAC-SHA1 via `X-Phaxio-Signature` header | Must use `www.` URL — Vercel non-www redirect breaks signature |
| Vercel Blob | `put()` from `@vercel/blob` | `BLOB_READ_WRITE_TOKEN` (auto-resolved on Vercel) | Must be provisioned via Vercel Dashboard Storage tab |
| Resend | `resend.emails.send()` | `RESEND_API_KEY` | Domain `easyfilercomplaint.com` must be verified in Resend dashboard |
| Vercel Cron | HTTP GET from Vercel infrastructure | `CRON_SECRET` Bearer token | 15-min schedule requires Pro plan — Hobby plan: once/day only |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Stripe webhook → pipeline | Direct function call: `await executeFilingPipeline(filingId)` | No queue needed; Stripe webhook has 30s timeout — pipeline must complete or fire-and-forget with `void` |
| Pipeline → Prisma | Direct import from `@/lib/prisma` | Same pattern as existing routes |
| Pipeline → services | Direct function calls (no event bus) | Acceptable at this volume; refactor to queue if concurrency grows |
| Phaxio webhook → Prisma | Direct update via `prisma.filing.update` | Use `faxId` to look up Filing record |

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-500 filings/day | Direct pipeline call from Stripe webhook is fine. No queue needed. |
| 500-5k filings/day | Decouple pipeline from webhook: return 200 immediately, use a background job queue (e.g., Inngest, Trigger.dev) to run pipeline async. Vercel Function timeout becomes a concern at synchronous execution. |
| 5k+ filings/day | Dedicated worker service; Vercel Blob CDN URL for fax delivery instead of buffer; rate limit Phaxio calls |

**First bottleneck:** Vercel Function timeout. The Stripe webhook invokes the pipeline synchronously. If Phaxio is slow or Resend times out, the webhook function may exceed Vercel's function duration limit (10s on Hobby, 60s on Pro, 800s on Enterprise). At low volume this is fine. At scale, fire-and-forget (`void executeFilingPipeline(filingId)`) and rely on the cron poller for status updates.

**Second bottleneck:** Vercel Blob egress costs if evidence files grow large. Keep complaint PDFs under 2 MB; store evidence separately under `evidence/{filingId}/`.

## Anti-Patterns

### Anti-Pattern 1: Blocking Webhook Response on Full Pipeline

**What people do:** `await executeFilingPipeline(filingId)` inside the Stripe webhook handler before returning the 200 response.
**Why it's wrong:** If PDF generation or Phaxio takes longer than Stripe's 30-second webhook response window, Stripe retries the webhook. The pipeline may run twice for the same payment. The existing idempotency guard (`if status === 'paid' return`) prevents double-execution, but at scale this is fragile.
**Do this instead:** At low volume, `await` is fine (idempotency guard is sufficient). At higher volume, fire-and-forget with `void executeFilingPipeline(filingId)` — Stripe gets an immediate 200 and the pipeline runs in the background until the Vercel Function timeout.

### Anti-Pattern 2: Using Non-www URL as Phaxio Callback

**What people do:** Register `https://easyfilercomplaint.com/api/webhooks/phaxio` as the Phaxio callback URL in the Phaxio console.
**Why it's wrong:** Vercel redirects non-www to www, stripping the POST body. Phaxio receives a 301 redirect and does not follow it. Signature verification also fails because the URL used in HMAC signing must exactly match the registered callback URL.
**Do this instead:** Register `https://www.easyfilercomplaint.com/api/webhooks/phaxio` in the Phaxio console. Verify with `www.` prefix in both places.

### Anti-Pattern 3: Storing PDF as Public Blob

**What people do:** `put(pathname, pdfBytes, { access: 'public' })` for convenience so the URL is directly accessible.
**Why it's wrong:** Complaint PDFs contain consumer PII (name, address, phone) and complaint details. A public URL is guessable via pathname pattern. The consumer-facing download should go through an authenticated route.
**Do this instead:** `access: 'private'`. For the email attachment, pass the PDF bytes directly (already in memory). For the success page download link, serve via a signed URL or pipe through a route handler that verifies the filing belongs to the requesting user/session.

### Anti-Pattern 4: 15-Minute Cron on Hobby Plan

**What people do:** Add `*/15 * * * *` to `vercel.json` and deploy on the Vercel Hobby plan.
**Why it's wrong:** Hobby plan only allows cron jobs to run once per day. Vercel will reject the deployment with a cron configuration error.
**Do this instead:** Upgrade to Vercel Pro before adding the 15-minute cron, or use a daily schedule (`0 */1 * * *`) as a temporary fallback on Hobby. The Phaxio webhook (FAX-04) handles real-time status updates; the cron is only a fallback for missed webhooks.

### Anti-Pattern 5: Re-fetching PDF from Blob for Email Attachment

**What people do:** After storing to Blob, the pipeline discards the `Uint8Array` in memory and re-fetches the PDF bytes from the Blob URL to attach to the email.
**Why it's wrong:** An extra network round-trip adds latency and Blob egress cost; the bytes are already in memory.
**Do this instead:** Pass the `pdfBytes: Uint8Array` variable through from PDF generation to both `storeComplaintPdf()` and `sendFilingReceiptEmail()`. Only the URL (for fax) and the bytes (for email) are needed from different branches — both can use the same in-memory variable.

## Build Order Recommendation

The pipeline orchestrator (`filing-pipeline.ts`) must be written before the individual steps are wired together, but each step can be scaffolded as a stub first and filled in phase by phase. The correct dependency order is:

1. **`generate-complaint-pdf.ts`** — no dependencies on Blob/Phaxio/Resend; testable in isolation with vitest
2. **`agency-directory.ts`** — pure data, no dependencies
3. **Blob storage logic** (inside pipeline or as `blob-storage.ts`) — depends on `@vercel/blob` install
4. **`send-filing-receipt-email.ts`** — depends on pdf bytes shape, testable with a mock Buffer
5. **`filing-pipeline.ts`** — depends on all of the above; wire together with status transitions
6. **Stripe webhook modification** — add the pipeline call; everything it calls must exist
7. **`/api/webhooks/phaxio/route.ts`** — independent of pipeline; reads `faxId` from form body
8. **`vercel.json` + cron handler** — last because it is a fallback on top of the working pipeline

## Sources

- [Vercel Blob SDK — put() reference](https://vercel.com/docs/vercel-blob/using-blob-sdk) (HIGH confidence — official Vercel docs, verified 2026-04-01)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs) (HIGH confidence — official Vercel docs, verified 2026-04-01)
- [Vercel Managing Cron Jobs — CRON_SECRET + Hobby plan limits](https://vercel.com/docs/cron-jobs/manage-cron-jobs) (HIGH confidence — official Vercel docs, verified 2026-04-01)
- [Phaxio Webhook Signature Verification](https://www.phaxio.com/docs/security/callbacks) (HIGH confidence — official Phaxio docs, verified 2026-04-01)
- [Phaxio Send Fax Webhooks](https://www.phaxio.com/docs/api/v2.1/faxes/send_webhooks) (MEDIUM confidence — doc page partially rendered; status field shape confirmed from existing `phaxio.ts` in codebase)
- [Resend Attachments — base64 content](https://nesin.io/blog/send-email-attachment-resend) (MEDIUM confidence — community article; cross-referenced with existing `resend` v6.9.4 SDK in project)

---
*Architecture research for: EasyFilerComplaint filing pipeline (PDF, Phaxio fax, Resend email)*
*Researched: 2026-04-01*
