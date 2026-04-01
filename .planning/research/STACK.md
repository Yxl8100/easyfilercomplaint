# Stack Research

**Domain:** Consumer complaint filing pipeline — PDF generation, fax delivery, transactional email
**Researched:** 2026-04-01
**Confidence:** HIGH (pdf-lib and Resend verified via official docs + existing code; Phaxio verified via official API docs)

---

## Scope

This research covers ONLY the three new capability areas for Milestone v1.1. The existing
stack (Next.js 14, Prisma, Neon, Stripe, Vercel) is already validated and is not re-examined.

---

## Recommended Stack

### Core Technologies (New Capabilities Only)

| Technology | Version (installed) | Purpose | Why Recommended |
|------------|---------------------|---------|-----------------|
| pdf-lib | 1.17.1 | Programmatic PDF document generation | Already installed; pure JS/TS, no native deps, runs in Node.js and Edge; StandardFonts built-in (no font file required); outputs `Uint8Array` directly, compatible with Vercel Blob `put()` |
| Phaxio REST API | v2 | Send fax to CA AG | No Node.js SDK needed — raw `fetch` + `FormData` + HTTP Basic auth is the standard pattern; test mode with test API key simulates fax without cost |
| resend | 6.9.4 | Transactional email with PDF attachment | Already installed; `Attachment.content` accepts `string \| Buffer`; base64-encoded `Uint8Array` → `Buffer.from(pdf).toString('base64')` is the pattern; 40MB attachment limit covers complaint PDFs |

### No New Packages Required

All three integrations are handled by packages already in `package.json`:
- `pdf-lib@1.17.1` — installed
- `resend@6.9.4` — installed
- Phaxio — no SDK; raw `fetch` (built into Node 18+ / Next.js runtime)

---

## API Method Signatures

### pdf-lib

**Create document:**
```typescript
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const pdfDoc = await PDFDocument.create()
```

**Embed fonts (must await each):**
```typescript
const font     = await pdfDoc.embedFont(StandardFonts.TimesRoman)
const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
```
`embedFont(font: StandardFonts | string | Uint8Array | ArrayBuffer, options?: EmbedFontOptions): Promise<PDFFont>`

Available `StandardFonts` values: `Helvetica`, `HelveticaBold`, `TimesRoman`, `TimesRomanBold`, `Courier`, `CourierBold` (and oblique variants).

**Add page:**
```typescript
const page = pdfDoc.addPage([612, 792])   // US Letter: 8.5" × 11" at 72 DPI
const { width, height } = page.getSize()
```
`addPage(page?: PDFPage | [number, number]): PDFPage`

**Draw text:**
```typescript
page.drawText(text, {
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color: Color,       // use rgb(r, g, b) — values 0.0–1.0
  lineHeight?: number,
  maxWidth?: number,
  opacity?: number,
})
```
`drawText(text: string, options: PDFPageDrawTextOptions): void`

**Draw line (separator):**
```typescript
page.drawLine({
  start: { x: number, y: number },
  end:   { x: number, y: number },
  thickness: number,
  color: Color,
})
```

**Measure text width (for manual word-wrap):**
```typescript
const w = font.widthOfTextAtSize(text, fontSize)  // returns number (points)
```

**Save to bytes:**
```typescript
const pdfBytes: Uint8Array = await pdfDoc.save()
```
`save(options?: SaveOptions): Promise<Uint8Array>`

**Coordinate system:** Origin (0, 0) is bottom-left. Y decreases as you move down the page. Start text at `y = height - topMargin` and decrement by `fontSize + leading` per line.

---

### Phaxio REST API v2

**Endpoint:** `POST https://api.phaxio.com/v2/faxes`

**Authentication:** HTTP Basic Auth — `Authorization: Basic base64(API_KEY:API_SECRET)`

```typescript
const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
```

**Send fax with one file attachment:**
```typescript
const formData = new FormData()
formData.append('to', '+19163235341')                           // E.164 format
formData.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), 'complaint.pdf')

const response = await fetch('https://api.phaxio.com/v2/faxes', {
  method: 'POST',
  headers: { Authorization: authHeader },
  body: formData,
})
const result = await response.json()
```

**Send fax with multiple file attachments (FAX-07: evidence file):**
Use `file[]` key for each file (up to 20 files per fax):
```typescript
formData.append('file[]', new Blob([pdfBytes], { type: 'application/pdf' }), 'complaint.pdf')
formData.append('file[]', new Blob([evidenceBytes], { type: 'application/pdf' }), 'evidence.pdf')
```
Note: The existing `phaxio.ts` stub uses the single `file` key. For FAX-07, switch to `file[]` for both files.

**Success response:**
```json
{
  "success": true,
  "message": "Retrieved fax",
  "data": { "id": 1234567 }
}
```

**Error response:**
```json
{
  "success": false,
  "message": "Error description"
}
```

**GET fax status:** `GET https://api.phaxio.com/v2/faxes/{faxId}`

**Fax status values (complete enum):**
| Status | Meaning |
|--------|---------|
| `queued` | Waiting in server queue |
| `pendingbatch` | Open to additional files (batching mode) |
| `inprogress` | Actively communicating with fax machine |
| `ringing` | Line ringing (recipient-level) |
| `callactive` | Transmitting (recipient-level) |
| `willretry` | Last attempt failed; will retry |
| `success` | Delivered |
| `failure` | Failed; check `error_type`, `error_id`, `error_message` |
| `partialsuccess` | Some recipients received, some did not |

**Fax object fields (webhook payload + GET response):**
```typescript
interface PhaxioFaxObject {
  id: number
  direction: 'sent' | 'received'
  status: 'queued' | 'pendingbatch' | 'inprogress' | 'success' | 'failure' | 'partialsuccess'
  is_test: boolean
  num_pages: number
  cost: number            // cents
  created_at: string      // RFC 3339
  completed_at: string | null
  caller_id: string
  error_type?: string
  error_id?: number
  error_message?: string
  tags: Record<string, string>
  recipients: Array<{
    phone_number: string
    status: string
    retry_count: number
    completed_at: string | null
    bitrate: number | null
    resolution: number | null
    error_type?: string
    error_id?: number
    error_message?: string
  }>
}
```

**Webhook payload:**
```typescript
// POST to /api/webhooks/phaxio
{
  fax: PhaxioFaxObject
  event_type: 'fax_completed' | 'transmitting_page' | 'retry_scheduled'
}
```

**Webhook signature verification (X-Phaxio-Signature header):**
Uses HMAC-SHA1 with your account's **Callback Token** (different from API key/secret):
1. Start with full callback URL string
2. Sort all POST parameters alphabetically by name, concatenate `name + value` to URL
3. Sort file parts alphabetically, concatenate `partName + SHA1(fileContents)` 
4. Sign result string with HMAC-SHA1 using Callback Token as key
5. Compare to `X-Phaxio-Signature` header

```typescript
import { createHmac } from 'crypto'
// callbackToken = process.env.PHAXIO_CALLBACK_TOKEN
const sig = createHmac('sha1', callbackToken).update(signatureString).digest('hex')
```

**Operational limits:**
- Max request size: 20 MB
- Max pages: 200
- Max files per fax: 20
- Max recipients per fax: 15

**Test mode:** Use test API key. Faxes are simulated (never sent), free, unlimited. Test key still returns a real fax ID for status polling tests.

---

### Resend SDK v6

**Instantiation:**
```typescript
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)
```

**Send email with PDF attachment:**
```typescript
const { data, error } = await resend.emails.send({
  from:    'EasyFilerComplaint <noreply@easyfilercomplaint.com>',
  to:      ['consumer@example.com'],
  subject: 'Your Filing Receipt — EFC-20260401-12345',
  text:    '...',        // plain text body (required if no html/react)
  // html: '...',        // optional; use text for receipt emails
  attachments: [
    {
      filename: 'EFC_Filing_EFC-20260401-12345.pdf',
      content:  Buffer.from(pdfBytes).toString('base64'),
      // contentType: 'application/pdf',  // optional; inferred from filename
    }
  ],
})
if (error) throw new Error(error.message)
console.log('Sent:', data?.id)
```

**Attachment interface:**
```typescript
interface Attachment {
  content?:     string | Buffer    // base64 string OR Buffer (both accepted)
  filename?:    string | false | undefined
  path?:        string             // remote URL alternative to content
  contentType?: string             // MIME type (optional, inferred from filename)
  contentId?:   string             // CID for inline embedding (max 128 chars)
}
```

**Converting `Uint8Array` to base64 (pdf-lib output):**
```typescript
// pdf-lib returns Uint8Array; Resend accepts string | Buffer
const base64Pdf = Buffer.from(pdfBytes).toString('base64')
```

**`resend.emails.send()` return type:**
```typescript
// Returns { data: { id: string } | null, error: ErrorResponse | null }
const { data, error } = await resend.emails.send({ ... })
```

**Constraints:**
- Max email size including attachments: 40 MB (after base64 encoding)
- Attachments are **incompatible** with the batch send endpoint (`resend.batch.send`)
- `from` address domain must be verified in Resend dashboard

---

## Environment Variables Required

| Variable | Purpose | Where to Set |
|----------|---------|--------------|
| `PHAXIO_API_KEY` | Phaxio API key (test or live) | Vercel env vars |
| `PHAXIO_API_SECRET` | Phaxio API secret | Vercel env vars |
| `PHAXIO_CALLBACK_TOKEN` | For webhook signature verification | Vercel env vars |
| `RESEND_API_KEY` | Resend API key (re_...) | Already present (stub exists) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage for PDF | Vercel env vars |
| `EFC_LIVE_SUBMIT` | `"true"` enables real fax/email sends | Vercel env vars |

Note: `PHAXIO_CALLBACK_TOKEN` is a **third** credential distinct from API_KEY and API_SECRET. It is found in the Phaxio dashboard under Callbacks Settings. The existing `phaxio.ts` stub does not include it — it must be added for webhook verification.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| pdf-lib (already installed) | PDFKit, jsPDF, Puppeteer | pdf-lib is already present; PDFKit requires streams; Puppeteer adds ~150MB binary; jsPDF is browser-first |
| Phaxio raw fetch | twilio-fax, efax, eFax API | Phaxio is explicitly chosen in PROJECT.md; direct API with no SDK is simpler (3 env vars, one file) |
| Resend SDK (already installed) | Nodemailer + SMTP, SendGrid | Already installed and domain-verified; SendGrid adds unnecessary complexity |
| `Uint8Array` → `Buffer.from().toString('base64')` for Resend | Pass `Uint8Array` directly | Resend `content` field types are `string | Buffer`; `Uint8Array` is not explicitly typed |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@phaxio/phaxio-node` npm package | Unmaintained; last release 2019; raw fetch is simpler | Raw `fetch` + `FormData` as in existing `phaxio.ts` stub |
| `pdfkit` | Not installed; pdf-lib already present and working | pdf-lib (existing `pdf-filler.ts` already uses it) |
| `puppeteer` / `playwright` for PDF | 150MB binary, cold-start penalty on Vercel, overkill for a letter layout | pdf-lib draws text directly — no HTML-to-PDF conversion needed |
| `nodemailer` | Adds SMTP config complexity; Resend SDK is simpler | Resend SDK |
| `@vercel/blob` (new install) | May already be installed or available as Vercel env | Check `package.json` before adding; use `put()` from `@vercel/blob` |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| pdf-lib@1.17.1 | Node 18+, Next.js 14 App Router | Works in both server components and API routes; no edge runtime support (uses Node.js APIs) |
| resend@6.9.4 | Node 18+, Next.js 14 API routes | Do not use in Edge runtime — requires Node.js globals |
| Phaxio fetch | Node 18+ native fetch | No polyfill needed; native `FormData` and `Blob` available in Node 18+ |

---

## Integration Points

**PDF → Blob → Fax → Email chain:**
```
pdf-lib.save()          → Uint8Array
  ↓
Buffer.from(bytes)      → Buffer  (for Vercel Blob + Resend)
  ↓
@vercel/blob put()      → { url }   (store complaint PDF)
  ↓
Phaxio FormData         ← new Blob([bytes])  (send fax)
  ↓
Resend attachment       ← Buffer.from(bytes).toString('base64')
```

The `Uint8Array` from pdf-lib is the single source; convert to `Buffer` once at the pipeline level and pass downstream.

**Existing stubs to complete (not replace):**
- `src/lib/pdf-filler.ts` — `buildComplaintPdf()` logic is already correct; needs `generateComplaintPdf()` export matching PDF-01–06 requirements
- `src/lib/phaxio.ts` — `sendFax()` uses single `file` key; update to `file[]` for multi-attachment (FAX-07)
- `src/lib/send-receipt.ts` — add `attachments` field to `resend.emails.send()` call; change `from` to `noreply@easyfilercomplaint.com` per EMAIL-02

---

## Sources

- [pdf-lib PDFDocument API docs](https://pdf-lib.js.org/docs/api/classes/pdfdocument) — method signatures verified HIGH confidence
- [pdf-lib PDFPage API docs](https://pdf-lib.js.org/docs/api/classes/pdfpage) — drawText/drawLine/getSize verified HIGH confidence
- [pdf-lib npm package](https://www.npmjs.com/package/pdf-lib) — version 1.17.1 confirmed
- [Phaxio v2 Create and Send Fax](https://www.phaxio.com/docs/api/v2/faxes/create_and_send_fax) — endpoint, FormData, auth verified HIGH confidence
- [Phaxio v2 Authentication](https://www.phaxio.com/docs/api/v2/intro/authentication) — Basic auth + fallback query params verified HIGH confidence
- [Phaxio Status Codes](https://www.phaxio.com/docs/statuses) — complete status enum verified HIGH confidence
- [Phaxio Callback Verification](https://www.phaxio.com/docs/security/callbacks) — HMAC-SHA1 algorithm verified HIGH confidence
- [Phaxio v2.1 Send Webhooks](https://www.phaxio.com/docs/api/v2.1/faxes/send_webhooks) — webhook event_type fields verified MEDIUM confidence
- [Resend Attachments docs](https://resend.com/docs/dashboard/emails/attachments) — Attachment interface verified HIGH confidence
- [resend-node GitHub — CreateEmailOptions interface](https://github.com/resend/resend-node/blob/main/src/emails/interfaces/create-email-options.interface.ts) — full type definition verified HIGH confidence
- [resend npm](https://www.npmjs.com/package/resend) — version 6.9.4 confirmed (latest 6.10.0 also available)

---

*Stack research for: EasyFilerComplaint v1.1 — PDF generation, Phaxio fax, Resend receipt email*
*Researched: 2026-04-01*
