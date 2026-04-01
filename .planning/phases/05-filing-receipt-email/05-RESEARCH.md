# Phase 5 Research: Filing Receipt Email

**Researched:** 2026-04-01
**Domain:** Resend SDK, Vercel Blob fetch, pipeline integration, prohibited-string testing
**Confidence:** HIGH

---

## Project Constraints (from CLAUDE.md)

No project-level CLAUDE.md exists. Global CLAUDE.md contains RTK token-saving shell aliases — no coding conventions, security requirements, or forbidden patterns that affect this phase.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EMAIL-01 | `sendFilingReceiptEmail()` sends confirmation email via Resend | Resend SDK v6.9.4 already installed; `resend.emails.send()` is the correct API |
| EMAIL-02 | Email sent from `noreply@easyfilercomplaint.com` | Resend `from` field; existing `send-receipt.ts` uses `filings@` — new function must use `noreply@` |
| EMAIL-03 | Email includes filing ID, business name, agency, date filed, amount paid | All fields available on `Filing` + `filerInfo` JSON; agency name via `getAgencyName()` from `agency-directory.ts` |
| EMAIL-04 | Complaint PDF attached as `EFC_Filing_{filingReceiptId}.pdf` | `pdfBytes` (Uint8Array) already in pipeline scope; Resend `Attachment.content` accepts `Buffer`; `Buffer.from(pdfBytes)` is the correct conversion |
| EMAIL-05 | Email contains no references to DPW, PV Law, APFC, lawsuits, or attorneys | HTML is plain string composed in TypeScript — a Vitest test reads the rendered HTML and asserts no prohibited matches |
| EMAIL-06 | `Filing.receiptEmailSentAt` updated after successful send | `prisma.filing.update({ data: { receiptEmailSentAt: new Date() } })` after `resend.emails.send()` resolves |
</phase_requirements>

---

## Technology Decision

**Use plain HTML string — do NOT install `react-email`.**

Reasons:
- `react-email` is not in `package.json` and is not needed for this email's content (static text + one attachment).
- The existing `send-receipt.ts` already uses plain `text:` with no HTML. Phase 5 can use `html:` for a minimal styled receipt without any extra dependency.
- Installing `react-email` would add ~10 packages and a JSX compilation path for no meaningful benefit on a single transactional email.
- Resend SDK v6.9.4 (`resend` is in `dependencies`) accepts `html: string` directly — no React rendering pipeline needed.

**Attachment strategy:** Pass `Buffer.from(pdfBytes)` as `content` in the `attachments` array. `pdfBytes` is already a `Uint8Array` held in the pipeline's local scope — no Blob fetch is needed when the function is called immediately after PDF generation.

---

## Key API Details

**Installed version:** `resend@6.9.4` (verified from `node_modules/resend/package.json`)

**`Attachment` interface** (from `node_modules/resend/dist/index.d.mts`, line 351):

```typescript
interface Attachment {
  content?: string | Buffer;   // binary content of the file
  filename?: string | false | undefined;
  path?: string;               // alternative: hosted URL
  contentType?: string;        // inferred from filename if omitted
  contentId?: string;          // for inline images only
}
```

**`resend.emails.send()` call shape:**

```typescript
await resend.emails.send({
  from: 'EasyFilerComplaint <noreply@easyfilercomplaint.com>',
  to: [consumerEmail],
  subject: `Your EasyFilerComplaint Filing Receipt — ${filingReceiptId}`,
  html: htmlBody,           // plain HTML string — no react-email required
  attachments: [
    {
      filename: `EFC_Filing_${filingReceiptId}.pdf`,
      content: Buffer.from(pdfBytes),
      contentType: 'application/pdf',
    },
  ],
})
```

**Confidence:** HIGH — types verified directly from installed package dist.

---

## Pipeline Integration Point

**File:** `src/lib/filing-pipeline.ts`, lines 101–107 (the email stub block):

```typescript
// Step 4: Send receipt email (Phase 5 stub — PIPE-05: runs regardless of fax outcome)
try {
  console.log(`[pipeline] Receipt email stub for ${filingId} (faxFailed=${faxFailed}) — Phase 5 will implement`)
  // Phase 5 will replace this with: await sendFilingReceiptEmail(filing, pdfBytes, faxFailed)
} catch (emailErr) {
  console.error(`[pipeline] Email failed for ${filingId}:`, emailErr)
  // Email failure is non-fatal — filing is already filed/failed from fax step
}
```

**Replacement:** Remove the `console.log` stub and replace with:

```typescript
await sendFilingReceiptEmail(filing, pdfBytes, faxFailed)
```

The surrounding `try/catch` already isolates email failure as non-fatal — preserve it.

**Import to add at top of `filing-pipeline.ts`:**

```typescript
import { sendFilingReceiptEmail } from '@/lib/email-receipt'
```

The new function lives in `src/lib/email-receipt.ts` (new file, distinct from the legacy `send-receipt.ts` which handles a different, older email flow).

---

## Filing Model Fields Available

From `prisma/schema.prisma` (verified):

| Field | Type | Notes |
|-------|------|-------|
| `id` | `String` | Internal UUID |
| `filingReceiptId` | `String?` | Format: `EFC-YYYYMMDD-XXXXX` — used in attachment filename and subject |
| `targetName` | `String` | The business name (EMAIL-03 "business name") |
| `category` | `String` | Complaint category; agency is always `ca_ag` at launch (hardcoded in pipeline) |
| `paymentAmount` | `Decimal?` | Amount paid — format as `$1.99` |
| `paidAt` | `DateTime?` | Date filed — format as `Month D, YYYY` |
| `complaintPdfUrl` | `String?` | Vercel Blob URL — only needed if fetching PDF separately; not needed when `pdfBytes` is passed directly |
| `receiptEmailSentAt` | `DateTime?` | Written by EMAIL-06 after successful Resend call |
| `filerInfo` | `Json?` | Contains `{ email, firstName, lastName, ... }` — consumer email lives here |

**Consumer email source:** `(filing.filerInfo as Record<string, string>).email` — same extraction pattern already used in `filing-pipeline.ts` lines 24–40.

**Agency name:** `getAgencyName('ca_ag')` from `src/lib/agency-directory.ts` returns `'California Attorney General'`. The pipeline hardcodes `ca_ag` (line 55), so the email function can hardcode or pass it as a parameter.

---

## PDF Attachment Strategy

**Preferred approach — use `pdfBytes` directly (no Blob fetch):**

The pipeline already holds `pdfBytes: Uint8Array` in scope (line 45). Pass it directly to `sendFilingReceiptEmail()`. This avoids a redundant network round-trip to Vercel Blob.

```typescript
// In filing-pipeline.ts — pass pdfBytes already in scope
await sendFilingReceiptEmail(filing, pdfBytes, faxFailed)

// In email-receipt.ts
export async function sendFilingReceiptEmail(
  filing: Filing,
  pdfBytes: Uint8Array,
  faxFailed: boolean
): Promise<void>
```

Inside the function:
```typescript
content: Buffer.from(pdfBytes),   // Uint8Array -> Buffer, accepted by Resend Attachment.content
```

**Fallback approach — fetch from `filing.complaintPdfUrl`:**

If `pdfBytes` is ever unavailable (e.g., called from a different context), fetch from Blob:

```typescript
const response = await fetch(filing.complaintPdfUrl!)
const arrayBuffer = await response.arrayBuffer()
const content = Buffer.from(arrayBuffer)
```

Note: `fetch()` is safe here — this is a GET request to Vercel's CDN, not a multipart POST. The axios-over-native-fetch restriction (FAX-08) only applies to multipart form uploads (the Phaxio fax send). Plain GET fetches are fine with native `fetch`.

**Preferred strategy wins** — pass `pdfBytes` from pipeline scope.

---

## Prohibited String Test Strategy

**Requirement (EMAIL-05):** Rendered email HTML must contain zero occurrences of: `DPW`, `PV Law`, `APFC`, `lawsuits`, `attorney` (case-insensitive).

**Pattern used by existing tests:** `src/lib/__tests__/phaxio.test.ts` uses `fs.readFileSync` to read source and assert `.not.toMatch(/\bfetch\b/)`. For email content, we test the runtime-rendered output, not source text.

**Test file:** `src/lib/__tests__/email-receipt.test.ts`

**Test approach:**

```typescript
import { describe, it, expect } from 'vitest'
import { buildReceiptEmailHtml } from '@/lib/email-receipt'

// Extract the HTML builder as a pure function (no Resend call, no Prisma)
// so it can be unit tested synchronously

describe('buildReceiptEmailHtml', () => {
  const html = buildReceiptEmailHtml({
    filingReceiptId: 'EFC-20260401-ABC12',
    targetName: 'Acme Corp',
    agencyName: 'California Attorney General',
    paidAt: new Date('2026-04-01'),
    paymentAmount: 1.99,
    faxFailed: false,
  })

  const PROHIBITED = ['DPW', 'PV Law', 'APFC', 'lawsuits', 'attorney']

  PROHIBITED.forEach((word) => {
    it(`HTML does not contain "${word}" (case-insensitive)`, () => {
      expect(html.toLowerCase()).not.toContain(word.toLowerCase())
    })
  })

  it('contains filing receipt ID', () => {
    expect(html).toContain('EFC-20260401-ABC12')
  })

  it('contains business name', () => {
    expect(html).toContain('Acme Corp')
  })

  it('contains agency name', () => {
    expect(html).toContain('California Attorney General')
  })
})
```

**Key design decision:** Export `buildReceiptEmailHtml()` as a pure function separate from `sendFilingReceiptEmail()`. This makes EMAIL-05 testing trivial — no Resend mock needed, no async, no Prisma. The test runs in < 1ms.

---

## Implementation Plan (Proposed)

1. **Create `src/lib/email-receipt.ts`**
   - Export `buildReceiptEmailHtml(params)` — pure function, returns HTML string
   - Export `sendFilingReceiptEmail(filing, pdfBytes, faxFailed)` — calls Resend, then writes `receiptEmailSentAt`
   - Initialize `new Resend(process.env.RESEND_API_KEY)` at module level (same pattern as `send-receipt.ts`)
   - From address: `EasyFilerComplaint <noreply@easyfilercomplaint.com>`
   - Attachment filename: `` `EFC_Filing_${filing.filingReceiptId}.pdf` ``
   - Content: `Buffer.from(pdfBytes)`
   - After successful send: `prisma.filing.update({ where: { id: filing.id }, data: { receiptEmailSentAt: new Date() } })`

2. **Update `src/lib/filing-pipeline.ts`**
   - Import `sendFilingReceiptEmail` from `@/lib/email-receipt`
   - Replace stub `console.log` with `await sendFilingReceiptEmail(filing, pdfBytes, faxFailed)`
   - Keep existing non-fatal `try/catch` wrapper

3. **Create `src/lib/__tests__/email-receipt.test.ts`**
   - Test `buildReceiptEmailHtml()` for: prohibited strings absent (5 words), receipt ID present, business name present, agency name present
   - Test `sendFilingReceiptEmail()` with mocked Resend and Prisma: assert `resend.emails.send` called with correct `from`, `to`, `subject`, `attachments[0].filename`, and that `receiptEmailSentAt` is written after success
   - Test: if `filingReceiptId` is null/undefined, function throws or skips gracefully

4. **Update `src/lib/__tests__/filing-pipeline.test.ts`**
   - Add `vi.mock('@/lib/email-receipt', ...)` to mock list
   - Add test asserting `sendFilingReceiptEmail` is called after fax success and after fax failure (PIPE-05)
   - Replace existing Test 5 stub-log assertion with `sendFilingReceiptEmail` call assertion

---

## Risks / Gotchas

**1. `filingReceiptId` may be null**
`Filing.filingReceiptId` is `String?` (nullable). If it is null when the email step runs (e.g., the PAY-04 Stripe webhook failed to generate it), the attachment filename and subject line will break. Guard: throw early if `!filing.filingReceiptId`.

**2. Consumer email extracted from `filerInfo` JSON, not a top-level field**
`Filing` has no `consumerEmail` column. Email comes from `(filing.filerInfo as Record<string, string>).email`. If `filerInfo` is null or `email` is empty, the send will fail with Resend's validation error. Guard: throw early if email is missing.

**3. `from` address differs from existing `send-receipt.ts`**
The legacy `send-receipt.ts` uses `filings@easyfilercomplaint.com`. EMAIL-02 requires `noreply@easyfilercomplaint.com`. Both must be verified senders in Resend. Verify the domain covers both subaddresses (domain-level verification covers all `@easyfilercomplaint.com` addresses).

**4. `pdfBytes` scope dependency**
`sendFilingReceiptEmail` receives `pdfBytes: Uint8Array` from the pipeline. If the attachment is > 40 MB, Resend will reject it. Complaint PDFs generated by `pdf-lib` are typically 50–200 KB — no risk in practice, but worth noting the limit.

**5. `receiptEmailSentAt` written even if Resend returns no error but email is not delivered**
Resend's `send()` resolves successfully when the email is accepted into their queue, not when it lands in the inbox. This is the correct behavior for `receiptEmailSentAt` — it records "we attempted and Resend accepted," not "consumer confirmed receipt."

**6. Existing pipeline test (Test 5) checks for stub log string**
`filing-pipeline.test.ts` Test 5 currently asserts `log.includes('Receipt email stub')`. After Phase 5 replaces the stub with the real call, that assertion will break. The test must be updated to mock `sendFilingReceiptEmail` and assert it was called.

**7. `react-email` is NOT needed**
Do not install it. The requirement is for correct transactional email content, not a design-system email. Plain HTML string is sufficient and keeps the dependency tree clean.

---

## Sources

### Primary (HIGH confidence)
- `node_modules/resend/dist/index.d.mts` — `Attachment` interface, `CreateEmailOptions`, `resend.emails.send()` signature verified directly from installed package
- `node_modules/resend/package.json` — version 6.9.4 confirmed
- `prisma/schema.prisma` — Filing model fields verified
- `src/lib/filing-pipeline.ts` — stub location and `pdfBytes` scope confirmed
- `src/lib/send-receipt.ts` — existing Resend initialization pattern confirmed
- `src/lib/agency-directory.ts` — `getAgencyName()` availability confirmed
- `src/lib/__tests__/filing-pipeline.test.ts` — Test 5 stub assertion identified (breaking change risk)

### Secondary (MEDIUM confidence)
- `package.json` — `react-email` absence confirmed; `resend` in production dependencies confirmed

---

## Metadata

**Confidence breakdown:**
- Resend attachment API: HIGH — verified from installed package types, not training data
- Pipeline integration: HIGH — stub location read directly from source
- PDF attachment strategy: HIGH — `Buffer.from(Uint8Array)` is standard Node.js API
- Prohibited string test: HIGH — pattern follows existing project test conventions
- Consumer email extraction: HIGH — pattern already used in pipeline lines 24–40

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (Resend SDK stable; check if version bumped before implementation)
