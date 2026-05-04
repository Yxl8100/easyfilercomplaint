# Phase 11: CPPA Paper Complaint PDF — Pattern Map

**Mapped:** 2026-05-03
**Files analyzed:** 3 new files
**Analogs found:** 3 / 3

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/cppa-pdf-generator.ts` | service | file-I/O + transform | `src/lib/generate-complaint-pdf.ts` | exact |
| `src/app/api/filings/[id]/cppa-pdf/route.ts` | route | request-response + file-I/O | `src/app/api/filings/[id]/pdf/route.ts` + `src/lib/store-complaint-pdf.ts` | role-match (access model differs: UUID-only vs session) |
| `src/lib/__tests__/cppa-pdf-generator.test.ts` | test | — | `src/lib/__tests__/generate-complaint-pdf.test.ts` | exact |
| `src/app/api/filings/[id]/cppa-pdf/route.test.ts` | test | — | `src/app/api/upload-evidence/route.test.ts` + `src/app/api/checkout/route.test.ts` | role-match |

---

## Pattern Assignments

### `src/lib/cppa-pdf-generator.ts` (service, file-I/O + transform)

**Analog:** `src/lib/generate-complaint-pdf.ts`

**Imports pattern** (lines 1–7):
```typescript
import fontkit from '@pdf-lib/fontkit'
import { readFileSync } from 'fs'
import { join } from 'path'
import { PDFDocument, PDFDict, PDFName, PDFString, PDFPage, PDFFont, rgb, RGB } from 'pdf-lib'
import { generateCPPAComplaint } from './cppa-complaint-generator'
import type { Filing } from '@prisma/client'
```

**Font loading pattern** (lines 121–122):
```typescript
const regularBytes = readFileSync(join(process.cwd(), 'src/assets/fonts/LiberationSerif-Regular.ttf'))
const boldBytes    = readFileSync(join(process.cwd(), 'src/assets/fonts/LiberationSerif-Bold.ttf'))
```

**Document creation + metadata pattern** (lines 125–144):
```typescript
const pdfDoc = await PDFDocument.create()
pdfDoc.registerFontkit(fontkit)

pdfDoc.setAuthor('EasyFilerComplaint')
pdfDoc.setCreator('EasyFilerComplaint')
pdfDoc.setProducer('EasyFilerComplaint')
pdfDoc.setTitle('Consumer Complaint Form')

// Section markers in Info dict — must be ASCII literal strings, not drawn text.
// Drawn text is encoded via custom font CMap and is not directly searchable.
const filingReceiptIdForMeta = filing.filingReceiptId ?? filing.id
const infoDict = pdfDoc.context.lookup(pdfDoc.context.trailerInfo.Info, PDFDict)
if (infoDict) {
  infoDict.set(PDFName.of('Subject'), PDFString.of('CONSUMER COMPLAINT FORM'))
  infoDict.set(PDFName.of('Keywords'), PDFString.of(
    `EasyFilerComplaint YOUR INFORMATION BUSINESS INFORMATION COMPLAINT RESOLUTION REQUESTED AFFIRMATION Filing ID: ${filingReceiptIdForMeta}`
  ))
}
```
For CPPA, update `Subject` to `'CPPA CONSUMER COMPLAINT FORM'` and `Keywords` to include all 10 section markers (`MAILING ADDRESS Q1 Q2 Q3 Q4 Q5 Q6 Q7 PERJURY ATTESTATION`).

**Page setup pattern** (lines 151–158):
```typescript
let page = pdfDoc.addPage([612, 792])
const { height } = page.getSize()
const margin = 72
const fontSize = 11
const lineHeight = 16
const maxWidth = 612 - 2 * margin
let y = height - margin
const black = rgb(0, 0, 0)
const gray  = rgb(0.5, 0.5, 0.5)
```

**`drawWrappedText` helper — copy verbatim** (lines 63–114):
```typescript
function drawWrappedText(
  text: string,
  opts: {
    page: PDFPage; x: number; y: number; font: PDFFont; size: number
    maxWidth: number; lineHeight: number; color: RGB
    pdfDoc: PDFDocument; margin: number; height: number
  }
): { y: number; page: PDFPage } {
  let { y, page } = opts
  const { x, font, size, maxWidth, lineHeight, color, pdfDoc, margin, height } = opts
  const paragraphs = text.split('\n')
  for (const para of paragraphs) {
    if (!para.trim()) { y -= lineHeight * 0.5; continue }
    const words = para.split(' ')
    let line = ''
    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(testLine, size) > maxWidth && line) {
        if (y < margin + lineHeight) { page = pdfDoc.addPage([612, 792]); y = height - margin }
        page.drawText(line, { x, y, font, size, color })
        y -= lineHeight; line = word
      } else { line = testLine }
    }
    if (line) {
      if (y < margin + lineHeight) { page = pdfDoc.addPage([612, 792]); y = height - margin }
      page.drawText(line, { x, y, font, size, color }); y -= lineHeight
    }
  }
  return { y, page }
}
```

**`drawLine` / `drawSectionHeader` / `drawLabelValue` helpers — copy verbatim** (lines 163–191):
```typescript
const drawLine = (text: string, f: PDFFont, size: number, color: RGB) => {
  if (y < margin + size + 4) { page = pdfDoc.addPage([612, 792]); y = height - margin }
  page.drawText(text, { x: margin, y, font: f, size, color })
  y -= size + 4
}

const drawSectionHeader = (title: string) => {
  y -= 8
  if (y < margin + fontSize + 4) { page = pdfDoc.addPage([612, 792]); y = height - margin }
  page.drawText(title, { x: margin, y, font: boldFont, size: 11, color: black })
  y -= 11 + 6
  page.drawLine({ start: { x: margin, y }, end: { x: 612 - margin, y }, thickness: 0.5, color: gray })
  y -= 10
}

const drawLabelValue = (label: string, value: string | null | undefined) => {
  if (!value?.trim()) return  // omit empty fields — never write 'N/A'
  drawLine(`${label}: ${value}`, font, fontSize, black)
}
```

**Footer pattern** (lines 297–306):
```typescript
const filingReceiptId = filing.filingReceiptId ?? filing.id
const footerText = `EasyFilerComplaint . easyfilercomplaint.com . Filing ID: ${filingReceiptId}`
const lastPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1]
lastPage.drawText(footerText, { x: margin, y: margin / 2, font, size: 8, color: gray })
```

**Save pattern — MUST use `useObjectStreams: false`** (line 310):
```typescript
return pdfDoc.save({ useObjectStreams: false })
```

**CPPA-specific additions (no analog — new patterns from RESEARCH.md):**

Checkbox rendering for Q1 (each `item` in `cppa.q1CheckboxInstructions`):
```typescript
page.drawRectangle({
  x: margin, y: y - 1, width: 9, height: 9,
  borderWidth: 0.75, borderColor: black, color: rgb(1, 1, 1),
})
page.drawText(item, { x: margin + 14, y, font, size: fontSize, color: black })
y -= lineHeight
```

Perjury attestation + blank signature line (Q10):
```typescript
page.drawLine({
  start: { x: margin, y: signatureY },
  end:   { x: margin + 250, y: signatureY },
  thickness: 0.75, color: black,
})
page.drawText('Signature', { x: margin, y: signatureY - 12, font, size: 9, color: gray })
page.drawText('Date',      { x: margin + 260, y: signatureY - 12, font, size: 9, color: gray })
```

**filerInfo access pattern — critical** (from `cppa-complaint-generator.ts` line 128):
```typescript
// filerInfo is a JSON column — NEVER access filing.firstName directly
const fi = (filing.filerInfo as Record<string, string> | null) ?? {}
// then: fi.firstName, fi.email, fi.phone, etc.
```

---

### `src/app/api/filings/[id]/cppa-pdf/route.ts` (route, request-response + file-I/O)

**Primary analog:** `src/app/api/filings/[id]/pdf/route.ts`
**Secondary analog:** `src/lib/store-complaint-pdf.ts` (for the blob write pattern)

**Note on access model divergence:** The existing `pdf/route.ts` uses session auth (`await auth()`) and serves a pre-stored blob URL. The CPPA route must differ in two ways: (1) UUID-only access (no session check, per D-04/D-05), and (2) generates PDF on demand + stores + streams bytes directly (not fetching from a pre-existing blob URL).

**Imports pattern:**
```typescript
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { generateCPPAComplaintPdf } from '@/lib/cppa-pdf-generator'
import { put } from '@vercel/blob'
```

**Route handler skeleton** (analog: `pdf/route.ts` lines 5–40 + `store-complaint-pdf.ts` lines 13–37):
```typescript
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // 1. Fetch filing
  const filing = await prisma.filing.findUnique({
    where: { id: params.id },
  })

  // 2. 404 guard (UUID obscurity = access control — no session check per D-04/D-05)
  if (!filing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // 3. Generate PDF on demand
  const pdfBytes = await generateCPPAComplaintPdf(filing)

  // 4. Store in Vercel Blob (separate path from CA AG PDF — avoids Pitfall 3)
  //    Blob path: complaints/cppa/{filingId}/CPPA_{receiptId}.pdf
  //    Do NOT call storeComplaintPdf() — that writes to Filing.complaintPdfUrl
  //    and uses the AG PDF blob path.
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const receiptId = filing.filingReceiptId ?? filing.id
    await put(
      `complaints/cppa/${filing.id}/CPPA_${receiptId}.pdf`,
      Buffer.from(pdfBytes),
      { access: 'private', contentType: 'application/pdf', addRandomSuffix: false, allowOverwrite: true }
    )
  }

  // 5. Return as download (attachment, not inline — consumer must print and mail)
  return new NextResponse(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="CPPA_Complaint_${filing.filingReceiptId || filing.id}.pdf"`,
    },
  })
}
```

**Blob storage pattern** (from `store-complaint-pdf.ts` lines 18–30):
```typescript
// Pattern for BLOB_READ_WRITE_TOKEN guard + put() call — always guard before put()
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.warn('[pdf] BLOB_READ_WRITE_TOKEN not set -- skipping blob storage')
  return null
}
const blob = await put(blobPath, Buffer.from(pdfBytes), {
  access: 'private',
  contentType: 'application/pdf',
  addRandomSuffix: false,
  allowOverwrite: true,
})
```

---

### `src/lib/__tests__/cppa-pdf-generator.test.ts` (test, unit)

**Analog:** `src/lib/__tests__/generate-complaint-pdf.test.ts`

**Top-level mocks + imports** (lines 1–19):
```typescript
import { describe, it, expect, vi } from 'vitest'
import { inflateSync } from 'zlib'
import { generateCPPAComplaintPdf } from '../cppa-pdf-generator'
import type { Filing } from '@prisma/client'

// No mocks needed for this test — generateCPPAComplaintPdf has no external I/O side effects.
// (fs.readFileSync and pdf-lib are real in tests; fonts are on disk at src/assets/fonts/)
```

**`extractPdfText` helper — copy verbatim** (lines 26–99 of `generate-complaint-pdf.test.ts`):
This function decompresses FlateDecode streams, decodes hex strings, and concatenates the Info dictionary header. It is the only way to assert on PDF content. Copy it verbatim — do not reimplement.

**Mock Filing fixture pattern** (lines 102–141 of `generate-complaint-pdf.test.ts`):
The fixture must include every Prisma Filing field. CPPA-specific additions: `filerInfo` must be a nested object with `firstName`, `lastName`, `email`, `phone`, `address`, `city`, `state`, `zip`. `categoryFields` must include `visitMonth` and `visitYear`.
```typescript
const mockFiling = {
  id: 'test-cppa-pdf-id',
  userId: null,
  category: 'privacy_tracking',
  targetName: 'Test Corp',
  targetUrl: 'https://testcorp.com',
  targetAddress: null, targetCity: null, targetState: null, targetZip: null,
  targetPhone: null, targetEmail: null, incidentDate: null,
  description: 'Test description',
  amountPaid: null, paymentMethod: null,
  priorContact: false, priorContactDetails: null,
  categoryFields: { visitMonth: '3', visitYear: '2026' },
  generatedText: null, invoiceId: null, stripeSessionId: null,
  stripePaymentId: null, paymentStatus: 'paid', paymentAmount: null, paidAt: null,
  faxId: null, faxStatus: null, faxSentAt: null, faxCompletedAt: null, faxPages: null,
  filingReceiptId: 'EFC-20260315-CPPDF',
  evidenceFileUrl: null, evidenceFileName: null, complaintPdfUrl: null,
  receiptEmailSentAt: null, status: 'paid' as const,
  filerInfo: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com',
               phone: '555-0100', address: '123 Oak Ave',
               city: 'Sacramento', state: 'CA', zip: '95814' },
  createdAt: new Date(), updatedAt: new Date(),
} as unknown as Filing
```

**Prohibited strings list — matches existing PROHIBITED constant** (lines 180–192):
```typescript
const PROHIBITED = [
  'DPW', 'PV Law', 'Pro Veritas', 'APFC', 'ComplianceSweep',
  'IV', 'IdentifiedVerified', 'lawsuits', 'attorneys', 'attorney', 'law firm',
]
```

**Prohibited string assertion pattern — use word-boundary for "IV"** (lines 345–357):
```typescript
for (const prohibited of PROHIBITED) {
  if (prohibited === 'IV') {
    expect(text).not.toMatch(/\bIV\b/)  // word-boundary avoids font CMap false positives
  } else {
    expect(text).not.toContain(prohibited)
  }
}
```

---

### `src/app/api/filings/[id]/cppa-pdf/route.test.ts` (test, unit)

**Primary analog:** `src/app/api/upload-evidence/route.test.ts`
**Secondary analog:** `src/app/api/checkout/route.test.ts`

**Mock setup pattern** (analog: `upload-evidence/route.test.ts` lines 1–15):
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: { filing: { findUnique: vi.fn() } },
}))

vi.mock('@vercel/blob', () => ({
  put: vi.fn().mockResolvedValue({ url: 'https://blob.vercel-storage.com/complaints/cppa/test-id/CPPA_EFC-TEST.pdf' }),
}))

vi.mock('@/lib/cppa-pdf-generator', () => ({
  generateCPPAComplaintPdf: vi.fn().mockResolvedValue(new Uint8Array([37, 80, 68, 70])),  // '%PDF'
}))
```

**Dynamic import pattern** (analog: `upload-evidence/route.test.ts` line 26):
```typescript
// Import route handler dynamically (after vi.mock calls are in place)
const { GET } = await import('./route')
```

**BLOB_READ_WRITE_TOKEN env guard in tests** (analog: `upload-evidence/route.test.ts` lines 17–21):
```typescript
beforeEach(() => {
  vi.resetAllMocks()
  process.env.BLOB_READ_WRITE_TOKEN = 'test-token'
})
```

**Request construction for GET route:**
```typescript
// GET routes pass params as second argument; no request body needed
const mockFiling = { id: 'test-id', filingReceiptId: 'EFC-TEST', ...otherFields }
// Call directly: GET(new Request('http://localhost/api/filings/test-id/cppa-pdf'), { params: { id: 'test-id' } })
```

---

## Shared Patterns

### Info Dictionary Section Markers
**Source:** `src/lib/generate-complaint-pdf.ts` lines 136–144
**Apply to:** `cppa-pdf-generator.ts`

Section markers MUST be stored in the PDF Info dictionary as `PDFString` literal ASCII values, not as drawn text. Drawn text is encoded via the custom font's CMap and is not directly byte-searchable. This is what makes `extractPdfText` assertions work in tests.

```typescript
const infoDict = pdfDoc.context.lookup(pdfDoc.context.trailerInfo.Info, PDFDict)
if (infoDict) {
  infoDict.set(PDFName.of('Subject'),  PDFString.of('CPPA CONSUMER COMPLAINT FORM'))
  infoDict.set(PDFName.of('Keywords'), PDFString.of(
    `EasyFilerComplaint CPPA COMPLAINT MAILING ADDRESS Q1 Q2 Q3 Q4 Q5 Q6 Q7 PERJURY ATTESTATION Filing ID: ${filingId}`
  ))
}
```

### Blob Guard (BLOB_READ_WRITE_TOKEN)
**Source:** `src/lib/store-complaint-pdf.ts` lines 18–20
**Apply to:** `cppa-pdf/route.ts` blob storage block

Always guard `put()` calls with a `process.env.BLOB_READ_WRITE_TOKEN` check. The route must still return PDF bytes even when the token is absent (development / CI environment).

```typescript
if (process.env.BLOB_READ_WRITE_TOKEN) {
  await put(blobPath, Buffer.from(pdfBytes), { access: 'private', ... })
}
// Return PDF regardless of blob storage success/skip
```

### filerInfo JSON Access
**Source:** `src/lib/cppa-complaint-generator.ts` line 128
**Apply to:** `cppa-pdf-generator.ts` (Q7 section), any direct access to filer personal info

```typescript
const fi = (filing.filerInfo as Record<string, string> | null) ?? {}
// Never: filing.firstName — that field is on the User model, not Filing
```

### `useObjectStreams: false` Save
**Source:** `src/lib/generate-complaint-pdf.ts` line 310
**Apply to:** `cppa-pdf-generator.ts` final save call

Must always be set. Without it, the Info dictionary (section markers, filing ID) is compressed and invisible to `extractPdfText` and raw PDF compliance checks.

```typescript
return pdfDoc.save({ useObjectStreams: false })
```

### `extractPdfText` Test Helper
**Source:** `src/lib/__tests__/generate-complaint-pdf.test.ts` lines 26–99
**Apply to:** `cppa-pdf-generator.test.ts`

Copy the entire function verbatim. It handles FlateDecode decompression and PDF hex string decoding. It is the project-standard way to assert text content in PDF unit tests.

---

## No Analog Found

All new files have close analogs. No greenfield patterns required.

| File | Role | Reason No Analog Needed |
|---|---|---|
| — | — | All patterns satisfied by existing codebase analogs |

The only truly new code in this phase is: (1) the CPPA form section layout (10 blocks mapped from 7 questions), (2) checkbox rectangle rendering for Q1, and (3) the perjury attestation + blank signature line. All three patterns are fully specified in RESEARCH.md Pattern 2, Pattern 5, and Pattern 6 respectively and require no codebase analog.

---

## Metadata

**Analog search scope:** `src/lib/`, `src/app/api/`, `src/lib/__tests__/`, `src/app/api/**/*.test.ts`
**Files scanned:** 8 (generate-complaint-pdf.ts, cppa-complaint-generator.ts, store-complaint-pdf.ts, pdf/route.ts, upload-evidence/route.test.ts, checkout/route.test.ts, generate-complaint-pdf.test.ts, cppa-complaint-generator.test.ts)
**Pattern extraction date:** 2026-05-03
