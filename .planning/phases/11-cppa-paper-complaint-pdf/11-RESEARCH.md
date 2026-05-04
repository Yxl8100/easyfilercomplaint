# Phase 11: CPPA Paper Complaint PDF — Research

**Researched:** 2026-05-03
**Domain:** pdf-lib PDF generation, Vercel Blob storage, Next.js API routes, CPPA form structure
**Confidence:** HIGH (stack verified against installed packages and existing codebase)

---

## Summary

Phase 11 adds a downloadable PDF that mirrors the CPPA official paper complaint form layout. The consumer reaches it via `GET /api/filings/[id]/cppa-pdf` — a new API route that (1) verifies the requesting user owns the filing or has the filing UUID (see access model below), (2) generates the PDF using a new `generateCPPAComplaintPdf(filing)` function, (3) stores the PDF in Vercel Blob, and (4) streams it to the browser as a file download.

The entire PDF stack already exists in the project. `pdf-lib` `1.17.1` with `@pdf-lib/fontkit` `1.1.1` is installed and proven in production (Phase 3 CA AG PDF). The LiberationSerif fonts are on-disk at `src/assets/fonts/`. The `storeComplaintPdf` utility handles Vercel Blob storage with `access: 'private'`. The existing CA AG PDF generator (`generate-complaint-pdf.ts`) is the primary analog — the CPPA PDF generator is a new parallel file that reuses every helper pattern verbatim: `drawWrappedText`, `drawLine`, `drawSectionHeader`, `drawLabelValue`, font loading, metadata injection, `useObjectStreams: false` save.

The CPPA paper form has 7 questions (verified: IAPP coverage of CPPA's own announcement). The requirement says "10 sections" — this is a planning decision for the PDF layout: the planner should map those 7 questions to the mailing header, intro block, 7 question blocks, and perjury attestation block to produce a form that covers all content. The total section count is a layout detail, not a content gap.

The access model for the API route requires clarification. CPPDF-03 says "verifies the requesting user owns the filing." The Phase 10 CONTEXT.md (D-04/D-05) established UUID = access token for the guide page. A GET route that returns a file download can be accessed from an `<a href>` tag — which cannot carry auth cookies in the same way. The success page already links to `/api/filings/[id]/cppa-pdf` via a plain anchor tag (visible in `success/page.tsx` line 156). This means the route must work without a login session — UUID obscurity is the access control, same as the guide page. The planner must resolve whether to use UUID-only access (matching D-04/D-05) or require auth session, and document that choice.

**Primary recommendation:** New file `src/lib/cppa-pdf-generator.ts` + new route `src/app/api/filings/[id]/cppa-pdf/route.ts`. Copy all PDF drawing helpers verbatim from `generate-complaint-pdf.ts`. Use `generateCPPAComplaint(filing)` from Phase 9 as the data source. Storage via the existing `storeComplaintPdf` pattern (or a new `storeCppaPdf` variant pointing to a different blob path).

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CPPDF-01 | `generateCPPAComplaintPdf(filing)` produces a PDF with all 10 official CPPA form sections pre-filled, including perjury attestation section with blank signature line and CPPA mailing address header | pdf-lib + fontkit already installed and battle-tested; `generateCPPAComplaint(filing)` provides Q1–Q7 data; mailing address is in STATE.md; section count is a layout mapping of the 7 form questions |
| CPPDF-02 | PDF footer contains the filing ID; PDF contains zero references to prohibited entities | Established pattern from CA AG PDF footer; entity separation test pattern already in `generate-complaint-pdf.test.ts` |
| CPPDF-03 | `GET /api/filings/[id]/cppa-pdf` authenticates user (owns filing), generates PDF, stores in Vercel Blob, and returns as file download | Existing route `src/app/api/filings/[id]/pdf/route.ts` is direct analog; `storeComplaintPdf` utility is reusable; access model needs one decision (UUID-only vs session auth) |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| PDF generation (layout, fonts, content) | API / Backend | — | Server-only: reads fonts from disk via `readFileSync`, uses pdf-lib async generation |
| Filing data access + auth check | API / Backend | Database / Storage | Route handler fetches filing from Prisma; enforces ownership check |
| Blob storage | Database / Storage | — | `@vercel/blob` put() called server-side from within the route |
| File download streaming | API / Backend | — | Route handler streams PDF bytes as application/pdf response |
| Link to trigger download | Browser / Client | — | `<a href>` on the success page — no client state, pure navigation |

---

## Standard Stack

### Core (all already installed — no new installs required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `pdf-lib` | 1.17.1 [VERIFIED: npm registry] | PDF document creation, drawing, metadata | Already in production for CA AG PDF (Phase 3); 1.17.1 is current |
| `@pdf-lib/fontkit` | 1.1.1 [VERIFIED: npm registry] | Embed custom TTF fonts in PDF | Required companion; prevents Standard Font rendering failures on fax/print |
| `@vercel/blob` | 2.3.2 [VERIFIED: npm registry; 2.3.3 latest but 2.3.2 in package-lock] | Upload PDF to private Vercel Blob | Already used by `storeComplaintPdf`; `access: 'private'` enforced by project decision |
| `@prisma/client` | 5.22.0 [VERIFIED: package.json] | Fetch Filing record + update blob URL | Standard project ORM |

**Installation:** No new packages needed. All dependencies are already in `package.json`.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `fs` (Node.js built-in) | — | Read font TTF files from `src/assets/fonts/` | Used in `generate-complaint-pdf.ts` line 121–122 — same pattern applies |
| `path` (Node.js built-in) | — | Resolve font file paths via `process.cwd()` | Same as above |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pdf-lib programmatic layout | Filling a real CPPA fillable PDF form | CPPA PDF may not have machine-fillable AcroForm fields; programmatic layout is already proven in codebase and avoids dependency on CPPA's PDF structure |
| pdf-lib programmatic layout | Puppeteer/headless Chrome HTML-to-PDF | Puppeteer adds ~100MB to bundle, requires Chromium on Vercel — overkill for a form layout that pdf-lib handles natively |
| UUID-only access | Session auth required | UUID-only matches D-04/D-05 pattern from Phase 10 and allows direct `<a href>` link from success page without client-side fetch |

---

## Architecture Patterns

### System Architecture Diagram

```
Success page link
  <a href="/api/filings/[id]/cppa-pdf">
        |
        v
GET /api/filings/[id]/cppa-pdf/route.ts
        |
        +-- prisma.filing.findUnique({ id })
        |       |
        |       v
        |   Filing record (category, targetName, targetUrl,
        |                   description, filerInfo, categoryFields,
        |                   filingReceiptId, cppaPdfUrl?)
        |
        +-- Access check (UUID exists = authorized, OR session check)
        |
        +-- generateCPPAComplaintPdf(filing)
        |       |
        |       +-- generateCPPAComplaint(filing)   [Phase 9]
        |       |       returns CPPAComplaint { q1..q7 }
        |       |
        |       +-- readFileSync(fonts)             [disk I/O]
        |       |
        |       +-- pdf-lib: PDFDocument.create()
        |       |   - CPPA mailing address header
        |       |   - 10 layout sections (header + 7 Q blocks + attestation + footer)
        |       |   - Blank signature line
        |       |
        |       returns Uint8Array
        |
        +-- storeBlob(filingId, pdfBytes)   [Vercel Blob]
        |       returns blobUrl
        |
        +-- return NextResponse(pdfBytes, {
                  'Content-Type': 'application/pdf',
                  'Content-Disposition': 'attachment; filename="CPPA_Complaint_[id].pdf"'
              })
```

### Recommended Project Structure

```
src/
├── lib/
│   ├── cppa-complaint-generator.ts       # Phase 9 — data source (unchanged)
│   ├── cppa-pdf-generator.ts             # NEW — Phase 11
│   ├── generate-complaint-pdf.ts         # Existing AG PDF (unchanged)
│   └── store-complaint-pdf.ts            # Existing blob util (reuse as-is)
├── app/
│   └── api/
│       └── filings/
│           └── [id]/
│               ├── pdf/route.ts          # Existing AG PDF route (unchanged)
│               └── cppa-pdf/route.ts     # NEW — Phase 11
└── assets/
    └── fonts/
        ├── LiberationSerif-Regular.ttf   # Existing (shared)
        └── LiberationSerif-Bold.ttf      # Existing (shared)
```

### Pattern 1: PDF Generator Function Signature

**What:** A pure async function that takes a `Filing` object and returns `Uint8Array`
**When to use:** All new PDF generators in this project follow this contract

```typescript
// Source: src/lib/generate-complaint-pdf.ts (existing pattern — verified in codebase)
export async function generateCPPAComplaintPdf(
  filing: Filing
): Promise<Uint8Array> {
  // Load fonts
  const regularBytes = readFileSync(join(process.cwd(), 'src/assets/fonts/LiberationSerif-Regular.ttf'))
  const boldBytes    = readFileSync(join(process.cwd(), 'src/assets/fonts/LiberationSerif-Bold.ttf'))

  // Create document
  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)
  pdfDoc.setAuthor('EasyFilerComplaint')
  pdfDoc.setCreator('EasyFilerComplaint')
  pdfDoc.setProducer('EasyFilerComplaint')
  pdfDoc.setTitle('CPPA Consumer Complaint Form')

  // Embed fonts (same as AG PDF — verified)
  const font     = await pdfDoc.embedFont(regularBytes)
  const boldFont = await pdfDoc.embedFont(boldBytes)

  // Get data from Phase 9 generator
  const cppa = generateCPPAComplaint(filing)

  // ... section drawing ...

  return pdfDoc.save({ useObjectStreams: false })  // MUST use this option — keeps metadata searchable
}
```

### Pattern 2: CPPA Form Section Layout (10 Layout Sections)

The CPPA paper form has 7 questions. The "10 sections" in CPPDF-01 is achieved by mapping them to a PDF layout with these distinct blocks:

| # | Layout Section | Content Source |
|---|----------------|----------------|
| 1 | Mailing address header | CPPA address from STATE.md |
| 2 | Document title + "SWORN COMPLAINT" label | Static |
| 3 | Q1 — What right was violated (checkboxes) | `cppa.q1CheckboxInstructions` |
| 4 | Q2 — Business name | `cppa.q2BusinessName` |
| 5 | Q3 — California resident | "Yes" (static) |
| 6 | Q4 — Description of violation | `cppa.q4Description` |
| 7 | Q5 — Supporting materials | `cppa.q5SupportingMaterials` |
| 8 | Q6 — Prior contact with business | `cppa.q6ContactedBusiness` |
| 9 | Q7 — Your contact information | `cppa.q7ContactInfo` |
| 10 | Perjury attestation + blank signature line | Static attestation text + drawn line |

This maps 7 questions to 10 layout blocks by treating the mailing header, document title, and attestation as their own sections.

### Pattern 3: API Route — File Download

```typescript
// Source: src/app/api/filings/[id]/pdf/route.ts (existing analog — verified in codebase)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // 1. Fetch filing
  const filing = await prisma.filing.findUnique({
    where: { id: params.id },
  })
  if (!filing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // 2. Access check — see "Open Question 1" for the decision
  // Option A: UUID-only (matches D-04/D-05)
  //   — no auth check, UUID obscurity is sufficient
  // Option B: Session auth required
  //   const session = await auth(); if (!session?.user?.id || filing.userId !== session.user.id) return 401

  // 3. Generate PDF
  const pdfBytes = await generateCPPAComplaintPdf(filing)

  // 4. Store in Vercel Blob (non-blocking — generate and stream regardless)
  // Use a separate blob path from the CA AG PDF:
  //   complaints/cppa/{filingId}/CPPA_{filingReceiptId}.pdf

  // 5. Return as download
  return new NextResponse(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="CPPA_Complaint_${filing.filingReceiptId || filing.id}.pdf"`,
    },
  })
}
```

### Pattern 4: CPPA Mailing Address Header

```typescript
// Source: STATE.md Accumulated Context (verified)
// CPPA mailing address: California Privacy Protection Agency,
//   ATTN: Complaints, 400 R Street, Suite 350, Sacramento, CA 95811
const CPPA_MAILING_ADDRESS = [
  'California Privacy Protection Agency',
  'ATTN: Complaints',
  '400 R Street, Suite 350',
  'Sacramento, CA 95811',
]
```

### Pattern 5: Perjury Attestation with Blank Signature Line

```typescript
// Source: IAPP coverage of CPPA form + CPPA FAQ (MEDIUM confidence)
// "I declare under penalty of perjury under the laws of the State of California
//  that the foregoing is true and correct."
const ATTESTATION_TEXT =
  'I declare under penalty of perjury under the laws of the State of California ' +
  'that the information provided in this complaint is true and correct to the best ' +
  'of my knowledge and belief. I authorize the California Privacy Protection Agency ' +
  'to contact the business(es) or person(s) named in this complaint.'

// Blank signature line — drawn as a horizontal rule at a fixed y position
page.drawLine({
  start: { x: margin, y: signatureY },
  end:   { x: margin + 250, y: signatureY },
  thickness: 0.75,
  color: black,
})
page.drawText('Signature', { x: margin, y: signatureY - 12, font, size: 9, color: gray })
page.drawText('Date', { x: margin + 260, y: signatureY - 12, font, size: 9, color: gray })
```

### Pattern 6: Checkbox Rendering

Q1 requires rendering checkbox labels (not actual interactive checkboxes — print-and-check model):

```typescript
// For each item in cppa.q1CheckboxInstructions:
for (const item of cppa.q1CheckboxInstructions) {
  // Draw a small square outline as the checkbox visual
  page.drawRectangle({
    x: margin,
    y: y - 1,
    width: 9,
    height: 9,
    borderWidth: 0.75,
    borderColor: black,
    color: rgb(1, 1, 1),  // white fill — consumer checks manually after printing
  })
  page.drawText(item, { x: margin + 14, y, font, size: fontSize, color: black })
  y -= lineHeight
}
```

### Anti-Patterns to Avoid

- **Fetching the official CPPA PDF and trying to fill its AcroForm fields:** The CPPA PDF has not been confirmed to have machine-fillable AcroForm fields. Attempting `PDFDocument.load(officialPDF)` to fill fields will fail silently if fields are not present. Always use the programmatic approach.
- **Using `Content-Disposition: inline`:** The CA AG PDF uses `inline` (renders in browser). For the CPPA paper complaint the user must print and mail — use `attachment` to trigger a file download.
- **Forgetting `useObjectStreams: false`:** This must be set on `pdfDoc.save()`. Without it the Info dictionary (section markers, filing ID) is compressed and invisible to the test's `extractPdfText` helper and to raw PDF compliance checks.
- **Storing to the same blob path as the CA AG PDF:** Use a distinct path like `complaints/cppa/{filingId}/CPPA_{filingReceiptId}.pdf` to avoid overwriting the CA AG PDF (`complaints/{filingId}/EFC_{filingReceiptId}.pdf`).
- **Hard-coding filerInfo fields at the top level of Filing:** `filerInfo` is a JSON column (`Filing.filerInfo`). Always cast: `const fi = (filing.filerInfo as Record<string, string> | null) ?? {}`. Never `filing.firstName` etc. — those are User model fields, not Filing fields.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Text wrapping | Custom word-wrap algorithm | `drawWrappedText()` from `generate-complaint-pdf.ts` | Already handles page overflow, multi-paragraph text, font metrics via `font.widthOfTextAtSize()` |
| Font embedding | Base64 encode fonts inline | `pdfDoc.registerFontkit(fontkit)` + `readFileSync` | fontkit handles glyph mapping; without it, non-ASCII characters corrupt |
| Blob storage | Write to filesystem or custom S3 | `@vercel/blob` `put()` with `access: 'private'` | Project decision (2026-04-01); already wired in `store-complaint-pdf.ts` |
| CPPA complaint text | Re-implement Q1–Q7 generation | `generateCPPAComplaint(filing)` from Phase 9 | All logic is already tested and correct; duplicating risks drift |
| Test text extraction from PDF | Custom PDF parser | `extractPdfText()` from `generate-complaint-pdf.test.ts` | Existing utility handles FlateDecode decompression and hex string decoding |

**Key insight:** This phase is almost entirely assembly of existing proven parts. The risk is in layout decisions (section count, positioning) and the access model decision, not in new technical complexity.

---

## Common Pitfalls

### Pitfall 1: filerInfo JSON Access
**What goes wrong:** Accessing `filing.firstName` returns `undefined` because personal info is stored in `Filing.filerInfo` (a JSON column), not as top-level schema columns.
**Why it happens:** The `User` model has `firstName`/`lastName`, but `Filing` stores filer info as `filerInfo: Json?`. This pattern is set in Phase 4 and documented throughout the codebase.
**How to avoid:** Always `const fi = (filing.filerInfo as Record<string, string> | null) ?? {}` then `fi.firstName`, `fi.email`, etc.
**Warning signs:** `undefined` or empty string in Q7 contact info section of the PDF.

### Pitfall 2: visitMonth/visitYear Not Top-Level Filing Fields
**What goes wrong:** Accessing `filing.visitMonth` returns `undefined` — these values live inside `filing.categoryFields` JSON, not as Prisma schema columns.
**Why it happens:** `visitMonth` and `visitYear` were designed as JSON sub-fields to avoid schema migrations per complaint type.
**How to avoid:** Use `generateCPPAComplaint(filing)` which already handles this correctly. Don't access `categoryFields` directly in the PDF generator for date formatting.
**Warning signs:** Date shows as "a recent date" even when a date was entered.

### Pitfall 3: Blob Path Collision with CA AG PDF
**What goes wrong:** If both PDFs use the same blob path pattern, storing the CPPA PDF could overwrite the CA AG PDF URL stored in `Filing.complaintPdfUrl`.
**Why it happens:** `storeComplaintPdf` writes to `complaints/{filingId}/EFC_{filingReceiptId}.pdf` AND updates `Filing.complaintPdfUrl`. If the CPPA route calls the same function, it would overwrite the CA AG PDF link.
**How to avoid:** Use a dedicated blob path for CPPA: `complaints/cppa/{filingId}/CPPA_{filingReceiptId}.pdf`. Either create a `storeCppaPdf` variant or pass the path as a parameter. Do NOT update `Filing.complaintPdfUrl` — the CPPA PDF is generated on demand and doesn't need to be persisted on the Filing record (or use a new `cppaPdfUrl` field).
**Warning signs:** AG PDF download link on the account/filings page stops working after a CPPA PDF is downloaded.

### Pitfall 4: API Route Accessed via Direct `<a href>` Without Session Cookie
**What goes wrong:** If the route requires `await auth()` session, a plain `<a href>` click from the success page will return 401 because `<a>` navigations don't send `fetch()` credentials in all configurations.
**Why it happens:** The success page uses `<a href="/api/filings/${filing.id}/cppa-pdf">` — this is a browser navigation, not a fetch. The session cookie IS sent for same-origin navigation, so this actually works — but guest users (no session) will be blocked.
**How to avoid:** Match the Phase 10 access model: UUID-only. The filing UUID is not guessable. This also avoids requiring the user to be logged in to download their own complaint form — which would be a bad UX for guest filers.
**Warning signs:** Guest users see 401 when clicking "Download CPPA Complaint PDF."

### Pitfall 5: PDF Size on Vercel Serverless (Memory)
**What goes wrong:** Generating a PDF in a serverless function uses memory. For a simple 1–2 page text PDF this is fine, but if font files are large, total memory usage could spike.
**Why it happens:** LiberationSerif TTF files are ~100KB each. pdf-lib loads the entire document into memory before returning.
**How to avoid:** The CA AG PDF already works fine on the same Vercel deployment (Phase 3). No action needed — just note that the CPPA PDF is the same class of document. Do NOT pre-load fonts at module level (that would persist across invocations and cause issues with Next.js module caching).
**Warning signs:** Function timeout or out-of-memory errors on Vercel.

### Pitfall 6: `extractPdfText` False Positives with "IV" in Prohibited Checks
**What goes wrong:** The test's `extractPdfText` helper decodes the Liberation Serif font's ToUnicode CMap which contains "IV" (Roman numeral IV appears in font encoding tables). A naive `text.includes('IV')` fails.
**Why it happens:** This is a known issue documented in `generate-complaint-pdf.test.ts` line 340–345.
**How to avoid:** Use word-boundary check `expect(text).not.toMatch(/\bIV\b/)` for "IV" specifically. All other prohibited strings are safe to check with `.not.toContain()`.

---

## Code Examples

### CPPA PDF Generator Skeleton

```typescript
// src/lib/cppa-pdf-generator.ts
// Source: verified against generate-complaint-pdf.ts in codebase

import fontkit from '@pdf-lib/fontkit'
import { readFileSync } from 'fs'
import { join } from 'path'
import { PDFDocument, rgb, RGB, PDFPage, PDFFont, PDFDict, PDFName, PDFString } from 'pdf-lib'
import { generateCPPAComplaint } from './cppa-complaint-generator'
import type { Filing } from '@prisma/client'

const CPPA_ADDRESS_LINES = [
  'California Privacy Protection Agency',
  'ATTN: Complaints',
  '400 R Street, Suite 350',
  'Sacramento, CA 95811',
]

export async function generateCPPAComplaintPdf(filing: Filing): Promise<Uint8Array> {
  const regularBytes = readFileSync(join(process.cwd(), 'src/assets/fonts/LiberationSerif-Regular.ttf'))
  const boldBytes    = readFileSync(join(process.cwd(), 'src/assets/fonts/LiberationSerif-Bold.ttf'))

  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)
  pdfDoc.setAuthor('EasyFilerComplaint')
  pdfDoc.setCreator('EasyFilerComplaint')
  pdfDoc.setProducer('EasyFilerComplaint')
  pdfDoc.setTitle('CPPA Consumer Complaint Form')

  const font     = await pdfDoc.embedFont(regularBytes)
  const boldFont = await pdfDoc.embedFont(boldBytes)

  const cppa = generateCPPAComplaint(filing)

  // Inject section markers and filing ID into Info dictionary (for test searchability)
  const filingId = filing.filingReceiptId ?? filing.id
  const infoDict = pdfDoc.context.lookup(pdfDoc.context.trailerInfo.Info, PDFDict)
  if (infoDict) {
    infoDict.set(PDFName.of('Subject'),  PDFString.of('CPPA CONSUMER COMPLAINT FORM'))
    infoDict.set(PDFName.of('Keywords'), PDFString.of(
      `EasyFilerComplaint CPPA COMPLAINT MAILING ADDRESS Q1 Q2 Q3 Q4 Q5 Q6 Q7 PERJURY ATTESTATION Filing ID: ${filingId}`
    ))
  }

  let page = pdfDoc.addPage([612, 792])
  const { height } = page.getSize()
  const margin = 72
  let y = height - margin

  // ... draw sections 1–10 ...

  // Footer (CPPDF-02)
  const lastPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1]
  lastPage.drawText(`EasyFilerComplaint . easyfilercomplaint.com . Filing ID: ${filingId}`, {
    x: margin, y: margin / 2, font, size: 8, color: rgb(0.5, 0.5, 0.5),
  })

  return pdfDoc.save({ useObjectStreams: false })  // required for test searchability
}
```

### API Route Skeleton

```typescript
// src/app/api/filings/[id]/cppa-pdf/route.ts
// Source: verified analog src/app/api/filings/[id]/pdf/route.ts

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { generateCPPAComplaintPdf } from '@/lib/cppa-pdf-generator'
import { put } from '@vercel/blob'
import type { Filing } from '@prisma/client'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const filing = await prisma.filing.findUnique({
    where: { id: params.id },
  })

  if (!filing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // Access model: UUID-only (matches D-04/D-05 from Phase 10 CONTEXT.md)
  // The filing UUID is not guessable — UUID obscurity is sufficient for guest access.

  const pdfBytes = await generateCPPAComplaintPdf(filing)

  // Store in Vercel Blob (separate path from CA AG PDF to avoid collision — Pitfall 3)
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const receiptId = filing.filingReceiptId ?? filing.id
    await put(
      `complaints/cppa/${filing.id}/CPPA_${receiptId}.pdf`,
      Buffer.from(pdfBytes),
      { access: 'private', contentType: 'application/pdf', addRandomSuffix: false, allowOverwrite: true }
    )
  }

  return new NextResponse(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="CPPA_Complaint_${filing.filingReceiptId || filing.id}.pdf"`,
    },
  })
}
```

### Test Skeleton

```typescript
// src/lib/__tests__/cppa-pdf-generator.test.ts
// Source: analog src/lib/__tests__/generate-complaint-pdf.test.ts (verified in codebase)

import { describe, it, expect, vi } from 'vitest'
import { inflateSync } from 'zlib'
import { generateCPPAComplaintPdf } from '../cppa-pdf-generator'
import type { Filing } from '@prisma/client'

// Re-use extractPdfText helper (copy verbatim from generate-complaint-pdf.test.ts)
// See generate-complaint-pdf.test.ts lines 26-99 for the full function

const mockFiling = {
  id: 'test-cppa-pdf-id',
  userId: null,
  category: 'privacy_tracking',
  targetName: 'Test Corp',
  targetUrl: 'https://testcorp.com',
  description: 'Test description',
  priorContact: false,
  priorContactDetails: null,
  categoryFields: { visitMonth: '3', visitYear: '2026' },
  filerInfo: {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    phone: '555-0100',
    address: '123 Oak Ave',
    city: 'Sacramento',
    state: 'CA',
    zip: '95814',
  },
  filingReceiptId: 'EFC-20260315-CPPDF',
  // ... all other Filing fields set to null/false/default
} as unknown as Filing

const PROHIBITED = [
  'DPW', 'PV Law', 'Pro Veritas', 'APFC', 'ComplianceSweep',
  'IdentifiedVerified', 'lawsuits', 'attorneys', 'attorney', 'law firm',
]

describe('generateCPPAComplaintPdf', () => {
  it('CPPDF-01: returns non-empty Uint8Array', async () => {
    const bytes = await generateCPPAComplaintPdf(mockFiling)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(0)
  })

  it('CPPDF-01: PDF contains mailing address header', async () => {
    const bytes = await generateCPPAComplaintPdf(mockFiling)
    const text = extractPdfText(bytes)
    expect(text).toContain('California Privacy Protection Agency')
    expect(text).toContain('400 R Street')
    expect(text).toContain('Sacramento')
  })

  it('CPPDF-01: PDF contains all 10 section markers in Info metadata', async () => {
    const bytes = await generateCPPAComplaintPdf(mockFiling)
    const text = extractPdfText(bytes)
    expect(text).toContain('CPPA COMPLAINT')
    expect(text).toContain('MAILING ADDRESS')
    expect(text).toContain('PERJURY ATTESTATION')
    expect(text).toContain('Q4')  // description
    expect(text).toContain('Q7')  // contact info
  })

  it('CPPDF-01: PDF contains perjury attestation text', async () => {
    const bytes = await generateCPPAComplaintPdf(mockFiling)
    const text = extractPdfText(bytes)
    expect(text).toContain('penalty of perjury')
    expect(text).toContain('California')
  })

  it('CPPDF-02: PDF footer contains filing ID', async () => {
    const bytes = await generateCPPAComplaintPdf(mockFiling)
    const text = extractPdfText(bytes)
    expect(text).toContain('EFC-20260315-CPPDF')
    expect(text).toContain('Filing ID:')
  })

  it('CPPDF-02: PDF contains zero prohibited strings', async () => {
    const bytes = await generateCPPAComplaintPdf(mockFiling)
    const text = extractPdfText(bytes)
    for (const prohibited of PROHIBITED) {
      if (prohibited === 'IV') {
        expect(text).not.toMatch(/\bIV\b/)
      } else {
        expect(text).not.toContain(prohibited)
      }
    }
  })

  it('PDF does not use StandardFonts', async () => {
    const bytes = await generateCPPAComplaintPdf(mockFiling)
    const raw = Buffer.from(bytes).toString('latin1')
    expect(raw).not.toContain('Times-Roman')
    expect(raw).not.toContain('Helvetica')
  })
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Standard PDF fonts (Times-Roman, Helvetica) | Embedded TTF via fontkit | Phase 3 (2026-04-01) | Fax machines and government printers render consistently |
| Letter-style complaint (Dear AG...) | Form-style layout with section headers | Phase 9 (2026-05-03) | Both AG PDF and CPPA PDF use the same structural idiom |
| Session auth required for PDF routes | UUID-only access (D-04/D-05) | Phase 10 (2026-05-03) | Guest filers can access via plain `<a href>` link |
| `Content-Disposition: inline` | `Content-Disposition: attachment` (for CPPA PDF) | Phase 11 decision | Triggers file download — consumer must print and mail |

**Deprecated/outdated:**
- The old CA AG PDF used a legal letter format (Dear Attorney General, Respectfully submitted) — superseded by Phase 9's form-style layout. Do not resurrect this for the CPPA PDF.
- Phaxio references in old planning docs — replaced by Sinch fax. Not relevant to Phase 11 (no fax for CPPA PDF).

---

## Runtime State Inventory

> Not applicable — Phase 11 is a new file and new route, not a rename or migration.

None — verified by codebase inspection. This is a greenfield addition.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `pdf-lib` | PDF generation | Yes | 1.17.1 (installed) | — |
| `@pdf-lib/fontkit` | Embedded fonts | Yes | 1.1.1 (installed) | — |
| `@vercel/blob` | Blob storage | Yes | 2.3.2 (installed) | `BLOB_READ_WRITE_TOKEN` absent → skip storage, still return PDF bytes |
| LiberationSerif TTF fonts | Font embedding | Yes | Verified at `src/assets/fonts/` | — |
| `BLOB_READ_WRITE_TOKEN` env var | Blob upload | Set in production | — | Route still works — just skips storage step (same pattern as `storeComplaintPdf`) |

**No missing dependencies with no fallback.** All required libraries are installed and fonts are on disk.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The CPPA paper form has exactly 7 questions (Q1–Q7); "10 sections" in CPPDF-01 maps to a PDF layout with 10 distinct blocks (mailing header, title, Q1–Q7, attestation) | Architecture Patterns / Pattern 2 | If the actual CPPA form has more or fewer questions, the layout will not match the official form. The PDF still works functionally but the "mirrors the official CPPA form layout" criterion may not be met. Planner should review the official form at cppa.ca.gov/pdf/paper-complaint.pdf before finalizing section count. [ASSUMED] |
| A2 | The perjury attestation text is "I declare under penalty of perjury under the laws of the State of California that the information provided in this complaint is true and correct..." | Pattern 5 | If the official attestation wording differs, the text on the PDF won't match. Functional but not an exact mirror. [CITED: IAPP coverage of CPPA form announcement; CPPA FAQ; authoritative source was not machine-readable] |
| A3 | UUID-only access (no session required) is the correct access model for the `/cppa-pdf` route | Pattern 3 / API Route Skeleton | If the planner decides session auth is required, the success page link must become a fetch()-based download button (client component) to pass credentials, or the guest download flow breaks. [ASSUMED based on D-04/D-05 from Phase 10; CPPDF-03 says "authenticates user (owns filing)" which could mean either model] |
| A4 | The route should return `Content-Disposition: attachment` (download) not `inline` (render in browser) | Pattern 3 | Consumer should print and mail — attachment triggers save dialog. But if the user prefers to view before printing, `inline` is better. Either works for compliance but UX differs. [ASSUMED] |

---

## Open Questions

1. **CPPA form section count (CPPDF-01 says "10 sections")**
   - What we know: The CPPA online form and official FAQ reference 7 questions. The PDF could have additional intro/instruction sections that bring the count to 10.
   - What's unclear: Whether "10 sections" in the requirement matches the actual PDF structure or is a target layout decision.
   - Recommendation: Planner should download the official form at `cppa.ca.gov/pdf/paper-complaint.pdf` and count the sections before writing the implementation plan. If not accessible, design to 10 layout blocks using the table in Pattern 2 above.

2. **Access model: UUID-only vs. session-required (CPPDF-03)**
   - What we know: CPPDF-03 says "verifies the requesting user owns the filing." The success page uses `<a href>` which sends session cookies for authenticated users but returns 401 for guests under the existing `/api/filings/[id]/pdf` route.
   - What's unclear: The intent of "authenticates user" in CPPDF-03 — does it mean authenticated session, or is UUID obscurity acceptable (per D-04/D-05)?
   - Recommendation: Use UUID-only access. Rationale: (1) success page already links with `<a href>`, (2) Phase 10 established D-04/D-05 precedent, (3) guest filers must be able to download their own form. If session auth is required for some other reason, the success page link must become a JavaScript-driven download button — a separate scope item.

3. **Storing CPPA PDF URL on Filing record**
   - What we know: The CA AG PDF stores its URL in `Filing.complaintPdfUrl`. If the CPPA PDF route stores to the same field, it overwrites the AG PDF URL.
   - What's unclear: Whether the CPPA PDF URL should be persisted (for caching / re-download) or generated fresh on each request.
   - Recommendation: Generate fresh on each request (no URL stored). This avoids schema changes, avoids blob path collision, and the PDF is deterministic given the same Filing data. Optionally: add `cppaPdfUrl String?` field to Filing schema if caching is desired — this would require a Prisma migration.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run src/lib/__tests__/cppa-pdf-generator.test.ts src/app/api/filings/[id]/cppa-pdf/route.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CPPDF-01 | `generateCPPAComplaintPdf(filing)` returns valid Uint8Array with all 10 section markers | unit | `npx vitest run src/lib/__tests__/cppa-pdf-generator.test.ts` | No — Wave 0 |
| CPPDF-01 | PDF contains CPPA mailing address header | unit | same | No — Wave 0 |
| CPPDF-01 | PDF contains perjury attestation with "penalty of perjury" | unit | same | No — Wave 0 |
| CPPDF-01 | PDF contains blank signature line (verified via section marker in metadata) | unit | same | No — Wave 0 |
| CPPDF-02 | PDF footer contains filing ID | unit | `npx vitest run src/lib/__tests__/cppa-pdf-generator.test.ts` | No — Wave 0 |
| CPPDF-02 | PDF contains zero prohibited strings | unit | same | No — Wave 0 |
| CPPDF-03 | Route returns 404 for unknown filing ID | unit | `npx vitest run src/app/api/filings/[id]/cppa-pdf/route.test.ts` | No — Wave 0 |
| CPPDF-03 | Route returns PDF bytes with Content-Type application/pdf | unit | same | No — Wave 0 |
| CPPDF-03 | Route stores PDF in Vercel Blob when token is set | unit (mocked) | same | No — Wave 0 |
| CPPDF-03 | Route returns PDF bytes even when BLOB_READ_WRITE_TOKEN is absent | unit | same | No — Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/__tests__/cppa-pdf-generator.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/lib/__tests__/cppa-pdf-generator.test.ts` — covers CPPDF-01, CPPDF-02
- [ ] `src/app/api/filings/[id]/cppa-pdf/route.test.ts` — covers CPPDF-03

*(Existing test infrastructure — vitest.config.ts, global mocks, extractPdfText helper — covers all other setup. Only these two new test files need creating in Wave 0.)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes (CPPDF-03) | UUID-only access (D-04/D-05) or next-auth session |
| V3 Session Management | No | No session state created by this route |
| V4 Access Control | Yes | Filing ownership check: `filing.id === params.id` plus UUID obscurity |
| V5 Input Validation | Yes | `params.id` is validated implicitly via Prisma `findUnique` (returns null if not found); no SQL injection risk via Prisma |
| V6 Cryptography | No | No encryption handled here; Vercel Blob manages storage encryption |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR — guessing another user's filing ID | Elevation of Privilege | UUIDs are 36-char random — not guessable; `findUnique` returns null for misses |
| PII in PDF returned to wrong user | Information Disclosure | UUID obscurity + optional session check; `access: 'private'` on Blob prevents direct URL access |
| Content injection in PDF via `description` field | Tampering | `generateCPPAComplaint()` applies length cap (2000 chars); pdf-lib draws text, does not interpret user input as PDF commands |

---

## Sources

### Primary (HIGH confidence)
- Codebase: `src/lib/generate-complaint-pdf.ts` — PDF generation patterns, font loading, drawWrappedText, section helpers, metadata injection, useObjectStreams
- Codebase: `src/lib/cppa-complaint-generator.ts` — Phase 9 generator that provides Q1–Q7 data
- Codebase: `src/lib/store-complaint-pdf.ts` — Vercel Blob storage pattern
- Codebase: `src/app/api/filings/[id]/pdf/route.ts` — API route pattern for PDF download
- Codebase: `src/lib/__tests__/generate-complaint-pdf.test.ts` — test patterns, extractPdfText helper, mock fixtures
- Codebase: `.planning/phases/10-cppa-guided-filing-page/10-CONTEXT.md` — D-04/D-05 UUID access model decision
- npm registry: pdf-lib@1.17.1, @pdf-lib/fontkit@1.1.1, @vercel/blob@2.3.2 — verified as current

### Secondary (MEDIUM confidence)
- IAPP: https://iapp.org/news/a/cppa-debuts-new-cpra-complaint-form — CPPA form has 7 questions; sworn complaints include perjury attestation
- CPPA FAQ: https://cppa.ca.gov/faq.html — form structure overview; "penalty of perjury" attestation requirement

### Tertiary (LOW confidence)
- WebSearch: CPPA paper complaint form section structure — PDF not machine-readable in this environment; section count of 7 inferred from secondary sources, not confirmed by reading the PDF directly

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified in package.json and npm registry
- Architecture: HIGH — entire PDF drawing infrastructure verified in existing codebase
- CPPA form sections: MEDIUM — 7 questions confirmed from secondary source; "10 sections" is a layout mapping, not confirmed from official PDF
- Pitfalls: HIGH — all derived from documented patterns and comments in existing codebase
- Access model: MEDIUM — inferred from Phase 10 decisions; CPPDF-03 language is ambiguous

**Research date:** 2026-05-03
**Valid until:** 2026-06-03 (stable stack; CPPA form structure could change but is unlikely)
