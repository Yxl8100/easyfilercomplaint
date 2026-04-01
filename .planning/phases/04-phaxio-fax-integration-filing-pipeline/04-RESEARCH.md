# Phase 4: Phaxio Fax Integration + Filing Pipeline - Research

**Researched:** 2026-04-01
**Domain:** Phaxio REST API v2, Next.js route handlers, Vercel cron jobs, pipeline orchestration
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FAX-01 | sendFax() sends complaint PDF to agency fax number via Phaxio API | Phaxio v2 multipart POST with `to` + `file[]` params; axios replaces native fetch to avoid CRLF bug |
| FAX-02 | Agency directory maps agency codes to fax numbers (ca_ag only at launch) | Existing AGENCY_FAX_NUMBERS in phaxio.ts + config.ts live/test switching already present; needs a proper agency-directory.ts module |
| FAX-03 | Filing.faxId and faxStatus updated after fax send | Prisma update after Phaxio response; faxId stored as String? in schema |
| FAX-04 | Phaxio webhook at /api/webhooks/phaxio updates fax status on delivery | Multipart POST from Phaxio; parse body fields + verify HMAC-SHA1 before any DB write |
| FAX-05 | Cron job at /api/cron/check-fax-status polls Phaxio every 15 minutes as fallback | Vercel Pro: `*/15 * * * *`; Hobby: `0 */1 * * *` (once/hour is daily-once limit on Hobby — see pitfall) |
| FAX-06 | vercel.json includes cron schedule for fax status polling | `{ "crons": [{ "path": "/api/cron/check-fax-status", "schedule": "..." }] }` |
| FAX-07 | Evidence file attached to fax alongside complaint PDF (if uploaded) | Phaxio `file[]` array parameter — complaint first, evidence second; max 20 files / 20 MB total |
| FAX-08 | Phaxio fax calls use axios or node-fetch (not native fetch) | Node.js 18–23.6 undici multipart CRLF bug causes 422; fixed in undici 7.1.0 / Node 23.7+; use axios@1.x with form-data |
| FAX-09 | Phaxio webhook handler verifies HMAC-SHA1 signature using PHAXIO_CALLBACK_TOKEN | URL + sorted POST params + sorted file SHA1 digests → HMAC-SHA1 → compare X-Phaxio-Signature header |
| PIPE-01 | executeFilingPipeline() orchestrates: generate PDF → store → send fax → send email | Single async function; each step updates Filing.status; fax wrapped in isolated try/catch |
| PIPE-02 | Pipeline triggered directly from Stripe webhook on payment confirmation | Stripe webhook calls executeFilingPipeline(filingId) after setting status=paid |
| PIPE-03 | Pipeline updates Filing status through all lifecycle states | paid → generating → filing → filed (or failed); Prisma update at each stage |
| PIPE-04 | PDF generation failure sets status=failed and logs error | generateComplaintPdf() wrapped in try/catch; failure = set failed + return early |
| PIPE-05 | Fax failure sets status=failed but still sends receipt email noting the issue | fax step in isolated try/catch; email step runs in finally-like block regardless of fax outcome |
| PIPE-06 | Stripe webhook route exports maxDuration = 60; pipeline entry has idempotency guard (status !== 'paid' → skip) | `export const maxDuration = 60` at top of route.ts; guard reads current Filing.status before pipeline |
</phase_requirements>

---

## Summary

Phase 4 connects the existing Phase 3 PDF output to real-world fax delivery and wires the complete filing lifecycle orchestrator. Three subsystems must be built: (1) a robust `sendFax()` rewrite using axios+form-data to work around the Node.js 18–23.6 multipart CRLF bug, (2) a Phaxio delivery webhook handler with HMAC-SHA1 signature verification, and (3) an `executeFilingPipeline()` orchestrator invoked from the Stripe webhook.

The codebase already has skeleton files for most of these (`src/lib/phaxio.ts`, `src/lib/submit-fax.ts`, `src/lib/send-receipt.ts`). The existing `phaxio.ts` uses native `fetch`, which is the exact pattern that triggers the CRLF bug — it must be replaced with axios. The existing `send-receipt.ts` uses the old pre-Phase-3 `SubmissionResult` interface and must be replaced by a new Phase 5 function; Phase 4 only needs to call a stub or pass-through.

The critical execution constraint is `maxDuration = 60` on the Stripe webhook route: PDF generation + Blob upload + Phaxio API call must complete within 60 seconds. On Vercel Hobby, the cron fallback is limited to once per day, not once per hour — the `0 */1 * * *` expression fails deployment validation.

**Primary recommendation:** Build in this order — agency-directory.ts → rewrite phaxio.ts (axios) → filing-pipeline.ts → modify Stripe webhook → add Phaxio webhook handler → add cron handler + vercel.json.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| axios | 1.14.0 | Phaxio multipart POST | Avoids Node.js 18–23.6 native fetch CRLF bug that causes 422 on Phaxio |
| form-data | 4.0.5 | Build multipart body for axios | Required companion for axios file uploads in Node.js server context |
| crypto (Node built-in) | built-in | HMAC-SHA1 for Phaxio webhook | `crypto.createHmac('sha1', token)` — no install needed |
| prisma @5.22.0 | 5.22.0 (already installed) | All Filing status updates | Already in use across all prior phases |
| next (14.2.35) | 14.2.35 (already installed) | Route handlers + cron endpoint | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vercel/blob | 2.3.2 (already installed) | Fetching stored PDF bytes for fax attachment | Evidence file download from Blob URL |
| resend | 6.9.4 (already installed) | Receipt email (Phase 5 stub) | Email send in pipeline — full wiring in Phase 5 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| axios + form-data | undici 7.1.0+ with native fetch | undici upgrade requires explicit package.json override and is less explicit than axios for file uploads |
| axios + form-data | node-fetch v3 + form-data | node-fetch v3 is ESM-only, harder in Next.js 14 CJS-compatible context |
| HMAC-SHA1 manual impl | phaxio/phaxio-node official library | Official library is outdated and adds dependency weight; manual crypto is 10 lines and well-documented |

**Installation (new packages only):**
```bash
npm install axios form-data
```

**Version verification:**
```
npm view axios version      → 1.14.0 (verified 2026-04-01)
npm view form-data version  → 4.0.5  (verified 2026-04-01)
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── agency-directory.ts        # NEW: agency code → fax number lookup
│   ├── phaxio.ts                  # REWRITE: sendFax/getFaxStatus with axios
│   ├── filing-pipeline.ts         # NEW: executeFilingPipeline() orchestrator
├── app/
│   └── api/
│       ├── webhooks/
│       │   ├── stripe/route.ts    # MODIFY: call executeFilingPipeline() + maxDuration
│       │   └── phaxio/route.ts    # NEW: Phaxio delivery webhook handler
│       └── cron/
│           └── check-fax-status/route.ts  # NEW: Vercel cron fallback poller
└── vercel.json                    # NEW/UPDATE: cron schedule definition
```

### Pattern 1: sendFax() with axios + form-data (FAX-01, FAX-07, FAX-08)
**What:** Replace native fetch with axios + form-data to send multipart POST to Phaxio v2.
**When to use:** Any fax send with one or two file attachments (complaint PDF + optional evidence).
**Example:**
```typescript
// Source: Phaxio API v2 docs + philna.sh multipart CRLF analysis
import axios from 'axios'
import FormData from 'form-data'

export async function sendFax(
  toNumber: string,
  files: Array<{ buffer: Buffer; filename: string; contentType: string }>
): Promise<PhaxioSendResult> {
  const form = new FormData()
  form.append('to', toNumber)
  for (const f of files) {
    form.append('file[]', f.buffer, { filename: f.filename, contentType: f.contentType })
  }

  const response = await axios.post('https://api.phaxio.com/v2/faxes', form, {
    auth: { username: process.env.PHAXIO_API_KEY!, password: process.env.PHAXIO_API_SECRET! },
    headers: form.getHeaders(),
  })
  return response.data
}
```

### Pattern 2: Phaxio Webhook HMAC-SHA1 Verification (FAX-09)
**What:** Reconstruct the signature from URL + sorted POST params + sorted file SHA1 digests, then compare to `X-Phaxio-Signature` header.
**When to use:** Every incoming POST to `/api/webhooks/phaxio` — verify BEFORE reading any DB.
**Example:**
```typescript
// Source: https://www.phaxio.com/docs/security/callbacks
import crypto from 'crypto'

function verifyPhaxioSignature(
  callbackUrl: string,
  postBody: Record<string, string>,
  callbackToken: string,
  incomingSignature: string
): boolean {
  let toSign = callbackUrl

  // Sort POST params by name, concatenate name+value
  const sortedKeys = Object.keys(postBody).sort()
  for (const key of sortedKeys) {
    toSign += key + postBody[key]
  }
  // Note: file SHA1 digests would be appended here if Phaxio posts files
  // Delivery callbacks post metadata fields only, not file bodies

  const computed = crypto.createHmac('sha1', callbackToken).update(toSign).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(incomingSignature))
}
```

### Pattern 3: executeFilingPipeline() Orchestrator (PIPE-01 through PIPE-06)
**What:** Sequential pipeline with status transitions; fax failure isolated from email step.
**When to use:** Called from Stripe webhook after `status=paid` is confirmed.
**Example:**
```typescript
// Source: REQUIREMENTS.md PIPE-01–06 + STATE.md decisions
export async function executeFilingPipeline(filingId: string): Promise<void> {
  // Idempotency guard (PIPE-06)
  const filing = await prisma.filing.findUnique({ where: { id: filingId } })
  if (!filing || filing.status !== 'paid') return

  try {
    // Step 1: Generate PDF (PIPE-03, PIPE-04)
    await prisma.filing.update({ where: { id: filingId }, data: { status: 'generating' } })
    const pdfBytes = await generateComplaintPdf(filing, filerInfo)
    const pdfUrl = await storeComplaintPdf(filingId, filing.filingReceiptId!, pdfBytes)

    // Step 2: Send fax (PIPE-05 — isolated try/catch)
    await prisma.filing.update({ where: { id: filingId }, data: { status: 'filing' } })
    let faxFailed = false
    try {
      const faxResult = await sendFax(agencyFaxNumber, [{ buffer: Buffer.from(pdfBytes), filename: 'complaint.pdf', contentType: 'application/pdf' }])
      await prisma.filing.update({ where: { id: filingId }, data: { faxId: String(faxResult.data?.id), faxStatus: 'queued', faxSentAt: new Date(), status: 'filed' } })
    } catch (faxErr) {
      faxFailed = true
      await prisma.filing.update({ where: { id: filingId }, data: { status: 'failed', faxStatus: 'failed' } })
    }

    // Step 3: Send receipt email (PIPE-05 — runs regardless of fax outcome)
    // Phase 5 will implement sendFilingReceiptEmail(); Phase 4 stubs this
    await sendFilingReceiptEmailStub(filing, faxFailed)

  } catch (err) {
    // PDF generation failure (PIPE-04)
    await prisma.filing.update({ where: { id: filingId }, data: { status: 'failed' } })
    throw err
  }
}
```

### Pattern 4: Stripe Webhook maxDuration Export (PIPE-06)
**What:** Export `maxDuration = 60` as a module-level constant in the route file.
**When to use:** Any Vercel route handler that runs long-running work.
```typescript
// At the top of src/app/api/webhooks/stripe/route.ts — outside any function
export const maxDuration = 60
```

### Pattern 5: Vercel Cron with CRON_SECRET Guard (FAX-05, FAX-06)
**What:** vercel.json cron definition + route handler that verifies Bearer token.
**Example vercel.json:**
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
**Route handler guard:**
```typescript
// Source: Vercel cron docs + codingcat.dev guide
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  // ... poll Phaxio for in-progress filings
}
```

### Anti-Patterns to Avoid
- **Using native fetch for Phaxio multipart:** Triggers 422 on Node.js 18–23.6 due to missing trailing CRLF. Always use axios + form-data.
- **Running the full pipeline inside the Stripe webhook without idempotency guard:** Stripe retries webhooks up to 5× — if the guard is omitted, the pipeline runs multiple times per payment.
- **Calling `executeFilingPipeline()` and awaiting it synchronously inside the webhook then returning 200 after:** The pipeline must complete within `maxDuration=60`. If it exceeds 60s, Vercel kills the function mid-flight. Keep pipeline steps tight; PDF generation and Blob upload are the expensive operations.
- **Using `*/15 * * * *` on Vercel Hobby:** Hobby accounts are limited to once-per-day cron jobs. Any expression running more than once per day fails deployment validation. Use `0 0 * * *` on Hobby or upgrade to Pro.
- **Parsing Phaxio webhook body with `request.json()`:** The callback is a multipart POST, not JSON. Parse with a form parser or use `request.formData()` (Next.js App Router supports it).
- **Performing DB writes before verifying Phaxio HMAC:** Always verify signature first, return 400 immediately on failure — do not touch Prisma.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HMAC-SHA1 implementation | Custom XOR/hash function | `crypto.createHmac('sha1', token)` (Node built-in) | Edge cases in constant-time comparison; use `crypto.timingSafeEqual` |
| Multipart form file upload | Manual boundary construction | `form-data` npm package | RFC 7578 boundary encoding, CRLF handling, content-disposition — all handled |
| Phaxio API auth | Custom auth header builder | axios `auth: { username, password }` option | Automatically base64-encodes and sets Authorization: Basic header |
| Fax status polling | Infinite loop or setInterval | Vercel cron job | No persistent runtime in serverless; cron is the correct primitive |
| Idempotency token generation | UUID or random string | Use existing Filing.status check: `status !== 'paid'` | Filing.status is already the idempotency primitive — no additional token needed |

**Key insight:** The HMAC verification algorithm is non-obvious (URL + sorted params + file SHA1 digests). Do not simplify it — all three components are required for security.

---

## Runtime State Inventory

> Included because Phase 4 adds fax delivery and modifies the Stripe webhook — runtime state must be accounted for.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Filing records with status='paid' already in Neon DB (created during Phase 2 testing) | Code will check status before running pipeline — safe; no migration needed |
| Live service config | Stripe webhook at /api/webhooks/stripe — URL registered in Stripe dashboard | No URL change; route is modified in-place — existing registration stays valid |
| OS-registered state | None — no OS-level task scheduler or pm2 processes | None |
| Secrets/env vars | PHAXIO_API_KEY, PHAXIO_API_SECRET, PHAXIO_CALLBACK_TOKEN not yet added; CRON_SECRET not yet added | Add all four to Vercel project env vars and local .env.local before testing |
| Build artifacts | No stale artifacts — phaxio.ts is being rewritten in-place | None — just save the file |

**Nothing found in category:** OS-registered state and build artifacts — verified by codebase inspection.

---

## Common Pitfalls

### Pitfall 1: Node.js Native Fetch Multipart CRLF Bug
**What goes wrong:** Phaxio returns HTTP 422 when the multipart body is missing the trailing CRLF.
**Why it happens:** Node.js 18–23.6 uses undici as the underlying fetch engine. Undici omitted the trailing CRLF from multipart bodies until undici 7.1.0 (Node 23.7+). Phaxio's server requires CRLF-terminated multipart bodies.
**How to avoid:** Use `axios` + `form-data` for ALL requests to Phaxio. The existing `phaxio.ts` uses `new FormData()` with native fetch — this is the exact pattern to replace.
**Warning signs:** HTTP 422 response from `https://api.phaxio.com/v2/faxes` with no other error detail.

### Pitfall 2: Vercel Hobby Cron Frequency Limit
**What goes wrong:** Deployment fails with "Hobby accounts are limited to daily cron jobs" if the cron expression runs more than once per day.
**Why it happens:** Hobby plan hard-caps at once/day. `0 */1 * * *` (hourly) fails. Only expressions matching "at most once per 24 hours" are allowed.
**How to avoid:** If on Hobby, use `0 0 * * *` (daily at midnight UTC). The ROADMAP notes `0 */1 * * *` as the Hobby fallback but that is WRONG — hourly runs more than once per day. The correct Hobby schedule is `0 0 * * *`.
**Warning signs:** `vercel deploy` output contains "Hobby accounts are limited to daily cron jobs" error.

### Pitfall 3: Phaxio Webhook Body is Multipart, Not JSON
**What goes wrong:** `request.json()` throws or returns empty because the Phaxio callback is a multipart POST, not `application/json`.
**Why it happens:** Phaxio sends webhook callbacks as `multipart/form-data` containing the Fax Object fields as form parts.
**How to avoid:** Parse with `request.formData()` in Next.js App Router. Convert `FormData` entries to a plain object for the HMAC verification step (which needs sorted string key-value pairs).
**Warning signs:** All webhook fields are `undefined` after body parse; HMAC verification always fails.

### Pitfall 4: HMAC Signature Verification — Missing File SHA1 Component
**What goes wrong:** HMAC verification always fails even with correct token.
**Why it happens:** The full algorithm is: URL + sorted POST params + sorted file SHA1 digests (if any files were included in the callback). Delivery callbacks typically do NOT include file parts, but if the webhook includes file attachments the file SHA1 step is mandatory.
**How to avoid:** Implement the full three-step algorithm. For delivery callbacks that include no file parts, the third step is a no-op — still implement it for correctness.
**Warning signs:** `X-Phaxio-Signature` header present but computed HMAC never matches.

### Pitfall 5: Pipeline Timeout — maxDuration=60 Not Enough
**What goes wrong:** Vercel kills the Stripe webhook function mid-pipeline because PDF generation + Blob upload + Phaxio API call exceed 60 seconds.
**Why it happens:** Default maxDuration on Vercel Hobby is 10 seconds; maxDuration=60 raises it but is still the Hobby ceiling. Pro raises ceiling to 300s.
**How to avoid:** Keep PDF generation synchronous but efficient (pdf-lib is in-process). Blob upload and Phaxio API are the I/O operations — ensure Phaxio does not exceed 30s response time. If latency is an issue, consider returning 200 from the webhook quickly and using a background job pattern (deferred to v2).
**Warning signs:** Stripe shows webhook delivery as `timeout` in dashboard; Filing.status stuck at `generating` or `filing` with no further updates.

### Pitfall 6: Idempotency Guard Uses Wrong Field
**What goes wrong:** Pipeline runs twice per payment because the guard checks `paymentStatus` instead of `status`.
**Why it happens:** The existing Stripe webhook already has an idempotency check on `status === 'paid'`, but after the pipeline runs, `status` transitions to `filing` or `filed`. A Stripe retry then sees `status !== 'paid'` and the guard correctly blocks — but only if the guard is re-checked AFTER the DB update.
**How to avoid:** In `executeFilingPipeline()`, re-fetch the Filing from DB at the start and check `status === 'paid'`. If status is anything else, return early. The Stripe webhook idempotency guard is a first line of defense; the pipeline guard is the second line.

---

## Code Examples

### Phaxio fax send with evidence attachment
```typescript
// Source: Phaxio API v2 docs (phaxio.com/docs/api/v2/faxes/create_and_send_fax)
// Uses file[] array syntax for multiple attachments
const form = new FormData()
form.append('to', '+19163235341')
form.append('file[]', pdfBuffer, { filename: 'complaint.pdf', contentType: 'application/pdf' })
if (evidenceBuffer) {
  form.append('file[]', evidenceBuffer, { filename: evidenceFileName, contentType: evidenceMimeType })
}
const response = await axios.post('https://api.phaxio.com/v2/faxes', form, {
  auth: { username: apiKey, password: apiSecret },
  headers: form.getHeaders(),
})
// response.data: { success: boolean, message: string, data: { id: number } }
```

### Phaxio HMAC-SHA1 signature verification
```typescript
// Source: https://www.phaxio.com/docs/security/callbacks
import crypto from 'crypto'

function verifyPhaxioSignature(
  callbackUrl: string,
  postFields: Record<string, string>,
  callbackToken: string,
  receivedSig: string
): boolean {
  let payload = callbackUrl
  const keys = Object.keys(postFields).sort()
  for (const k of keys) payload += k + postFields[k]
  // If webhook includes file parts, append fieldName+sha1(fileBytes) here (sorted by fieldname)
  const computed = crypto.createHmac('sha1', callbackToken).update(payload).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(receivedSig, 'hex'))
  } catch {
    return false  // length mismatch → invalid signature
  }
}
```

### Vercel cron route handler with CRON_SECRET guard
```typescript
// Source: Vercel cron docs (vercel.com/docs/cron-jobs/manage-cron-jobs)
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Query for filings with faxStatus in ['queued', 'pendingbatch', 'inprogress']
  // For each, call getFaxStatus(faxId) and update Filing accordingly
  return NextResponse.json({ ok: true })
}
```

### Phaxio fax status values (for Filing.faxStatus mapping)
```typescript
// Source: https://www.phaxio.com/docs/statuses
// Terminal states: success, failure, partialsuccess
// In-progress states: queued, pendingbatch, inprogress
// Recipient-level: ringing, callactive, willretry
const TERMINAL_FAX_STATUSES = ['success', 'failure', 'partialsuccess'] as const
const isTerminal = (status: string) => TERMINAL_FAX_STATUSES.includes(status as typeof TERMINAL_FAX_STATUSES[number])
```

### Filing status lifecycle mapping
```typescript
// States driven by PIPE-03:
// paid → generating (pipeline starts)
// generating → filing (PDF stored, fax send attempted)
// filing → filed (fax queued successfully)
// filing → failed (fax send threw an error)
// generating → failed (PDF generation threw)
// filed state is updated to 'success' equivalent via Phaxio webhook (FAX-04)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Native fetch multipart upload | axios + form-data for server-side multipart | Node.js 18 (2022) introduced the bug; undici 7.1.0 fixed it | Any existing phaxio.ts using `new FormData()` + fetch must be rewritten |
| Vercel 15-minute cron on all plans | 15-minute cron requires Pro; Hobby = once/day only | Vercel plan update (confirmed 2026) | Must choose correct schedule per Vercel tier |
| Per-route maxDuration via vercel.json only | `export const maxDuration = N` directly in route handler | Next.js 13.5+ | Direct export is the authoritative per-route override |

**Deprecated/outdated:**
- `phaxio/phaxio-node` official library: Last released 2019, targets Phaxio API v2.1 but is unmaintained. Manual axios calls against v2 are preferred.
- `node-phaxio` (chadsmith): Also outdated. Manual implementation is 30 lines and well-understood.

---

## Open Questions

1. **Vercel plan tier for this project**
   - What we know: `*/15 * * * *` requires Pro; Hobby is limited to once/day
   - What's unclear: Which Vercel plan is active on this project
   - Recommendation: Check Vercel dashboard before writing vercel.json. Plan generates the schedule string as a variable so it can be swapped without other code changes. STATE.md already calls this out.

2. **FilerInfo source in pipeline**
   - What we know: `generateComplaintPdf(filing, filerInfo)` requires a `FilerInfo` object (firstName, lastName, email, address, city, state, zip, phone). The Filing model stores these in the User relation, but Phase 4 pipeline receives only `filingId`.
   - What's unclear: Whether FilerInfo data is stored on the Filing record directly or must be joined from User (for guest filings, User does not exist).
   - Recommendation: The pipeline must either (a) join Filing → User to extract FilerInfo, or (b) require FilerInfo fields to be stored on Filing at wizard submission time. This needs a plan decision — see note below.

3. **CA AG fax number verification**
   - What we know: `+19163235341` is in phaxio.ts; STATE.md says "CA AG fax number is a placeholder — MUST verify against oag.ca.gov before go-live"
   - What's unclear: Whether the placeholder is correct or needs updating
   - Recommendation: Plan should include a task to verify against oag.ca.gov and update agency-directory.ts.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| axios | FAX-01, FAX-08 | Not yet installed | — | None — install required |
| form-data | FAX-01, FAX-08 | Not yet installed | — | None — install required |
| Node.js crypto | FAX-09 | Built-in | Node 20.x on Vercel | None needed |
| PHAXIO_API_KEY | FAX-01 | Not set locally | — | Phaxio test mode simulates sends for free |
| PHAXIO_API_SECRET | FAX-01 | Not set locally | — | Same — test key pair sufficient for dev |
| PHAXIO_CALLBACK_TOKEN | FAX-09 | Not set locally | — | Webhook verification skipped in test; block in prod |
| CRON_SECRET | FAX-05 | Not set locally | — | Endpoint is unauthenticated without it — must be set before deployment |
| Vercel Pro | FAX-05 (15-min cron) | Unknown | — | Hobby fallback: `0 0 * * *` (once/day) |

**Missing dependencies with no fallback:**
- axios + form-data: Must be installed before any fax code is written
- CRON_SECRET: Must be set in Vercel project env vars before deploying cron endpoint

**Missing dependencies with fallback:**
- Phaxio API keys: Use Phaxio test API key pair (free, unlimited) during development — simulates fax without sending
- Vercel Pro: Use `0 0 * * *` daily schedule on Hobby as documented fallback

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | vitest.config.ts (exists) |
| Quick run command | `npx vitest run src/lib/__tests__/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FAX-01 | sendFax() calls Phaxio with correct FormData params | unit | `npx vitest run src/lib/__tests__/phaxio.test.ts -t "sendFax"` | Wave 0 |
| FAX-02 | getAgencyFaxNumber('ca_ag') returns correct E.164 number | unit | `npx vitest run src/lib/__tests__/agency-directory.test.ts` | Wave 0 |
| FAX-03 | Filing.faxId and faxStatus set after sendFax() success | unit | `npx vitest run src/lib/__tests__/filing-pipeline.test.ts -t "faxId"` | Wave 0 |
| FAX-04 | Phaxio webhook updates Filing.faxStatus on delivery | unit | `npx vitest run src/lib/__tests__/phaxio-webhook.test.ts` | Wave 0 |
| FAX-05 | Cron handler queries in-progress filings and polls status | unit | `npx vitest run src/lib/__tests__/cron-check-fax.test.ts` | Wave 0 |
| FAX-08 | sendFax() uses axios (not fetch) — verified by mock inspection | unit | `npx vitest run src/lib/__tests__/phaxio.test.ts -t "uses axios"` | Wave 0 |
| FAX-09 | verifyPhaxioSignature() correctly computes HMAC-SHA1 | unit | `npx vitest run src/lib/__tests__/phaxio-webhook.test.ts -t "HMAC"` | Wave 0 |
| PIPE-01 | executeFilingPipeline() calls generate → store → fax → email in order | unit | `npx vitest run src/lib/__tests__/filing-pipeline.test.ts -t "pipeline order"` | Wave 0 |
| PIPE-03 | Filing.status transitions: paid→generating→filing→filed | unit | `npx vitest run src/lib/__tests__/filing-pipeline.test.ts -t "status"` | Wave 0 |
| PIPE-04 | PDF failure → status=failed, pipeline halts | unit | `npx vitest run src/lib/__tests__/filing-pipeline.test.ts -t "pdf failure"` | Wave 0 |
| PIPE-05 | Fax failure → status=failed but email step still runs | unit | `npx vitest run src/lib/__tests__/filing-pipeline.test.ts -t "fax failure"` | Wave 0 |
| PIPE-06 | Idempotency guard: status≠paid → pipeline skips | unit | `npx vitest run src/lib/__tests__/filing-pipeline.test.ts -t "idempotency"` | Wave 0 |
| FAX-06 | vercel.json has valid cron schedule entry | manual | Visual inspection of vercel.json + vercel CLI validation | n/a |
| FAX-07 | Evidence file appended as second file[] when evidenceFileUrl is set | unit | `npx vitest run src/lib/__tests__/filing-pipeline.test.ts -t "evidence"` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/__tests__/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/phaxio.test.ts` — covers FAX-01, FAX-08 (mock axios, assert FormData fields)
- [ ] `src/lib/__tests__/agency-directory.test.ts` — covers FAX-02
- [ ] `src/lib/__tests__/phaxio-webhook.test.ts` — covers FAX-04, FAX-09 (HMAC-SHA1 test vectors)
- [ ] `src/lib/__tests__/filing-pipeline.test.ts` — covers FAX-03, FAX-07, PIPE-01, PIPE-03, PIPE-04, PIPE-05, PIPE-06
- [ ] `src/lib/__tests__/cron-check-fax.test.ts` — covers FAX-05

*(All test files are new — existing infrastructure (vitest.config.ts, globals:true, @/ alias) covers setup needs)*

---

## Sources

### Primary (HIGH confidence)
- Phaxio API v2 docs (phaxio.com/docs/api/v2/faxes/create_and_send_fax) — multipart POST params, file[] syntax, response format
- Phaxio security/callbacks docs (phaxio.com/docs/security/callbacks) — full HMAC-SHA1 verification algorithm with Node.js example
- Phaxio statuses docs (phaxio.com/docs/statuses) — all fax status values
- Vercel cron docs (vercel.com/docs/cron-jobs) — cron expression format, how Vercel invokes endpoints
- Vercel cron usage+pricing docs (vercel.com/docs/cron-jobs/usage-and-pricing) — Hobby once/day limit, Pro once/minute
- Node.js `crypto` module — built-in, no docs needed; `createHmac` + `timingSafeEqual` are stable APIs

### Secondary (MEDIUM confidence)
- philna.sh blog (2025-01-14): Node.js 18–23.6 multipart CRLF bug analysis — confirmed by undici changelog
- Vercel cron CRON_SECRET docs + codingcat.dev guide — Bearer token authorization pattern for cron endpoints
- Vercel maxDuration export pattern — confirmed by vercel.com/docs/functions/configuring-functions/duration

### Tertiary (LOW confidence)
- npm view axios/form-data/node-fetch versions (verified 2026-04-01 via npm registry) — current stable versions

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Phaxio v2 API directly verified via official docs; axios/form-data CRLF workaround verified via bug report + undici changelog
- Architecture: HIGH — Existing codebase (phaxio.ts, stripe webhook, Prisma schema) directly inspected; patterns derived from current code structure
- Pitfalls: HIGH — CRLF bug and Hobby cron limit both verified against official sources; HMAC algorithm verified against Phaxio's own documentation

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (Phaxio API stable; Vercel plan limits unlikely to change)

---

## Project Constraints (from CLAUDE.md — global user instructions)

- Use `rtk` prefix for all shell commands (RTK token optimizer)
- No project-level CLAUDE.md exists — global RTK instructions apply only to developer workflow, not to code patterns
