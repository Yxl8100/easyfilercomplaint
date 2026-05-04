# Phase 9: Complaint Narrative Engine + AG PDF + Success Page — Pattern Map

**Mapped:** 2026-05-03
**Files analyzed:** 6 (2 new, 4 modified)
**Analogs found:** 6 / 6

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/cppa-complaint-generator.ts` | service/utility | transform | `src/lib/complaint-generator.ts` | exact |
| `src/lib/__tests__/cppa-complaint-generator.test.ts` | test | — | `src/lib/__tests__/generate-complaint-pdf.test.ts` | exact |
| `src/lib/generate-complaint-pdf.ts` (modified) | service | file-I/O + transform | `src/lib/generate-complaint-pdf.ts` (self) | self |
| `src/lib/__tests__/generate-complaint-pdf.test.ts` (modified) | test | — | `src/lib/__tests__/generate-complaint-pdf.test.ts` (self) | self |
| `src/app/filing/[id]/success/page.tsx` (modified) | component | request-response | `src/app/filing/[id]/success/page.tsx` (self) | self |
| `src/app/filing/[id]/success/page.test.tsx` (modified) | test | — | `src/app/filing/[id]/success/page.test.tsx` (self) | self |

---

## Pattern Assignments

### `src/lib/cppa-complaint-generator.ts` (service/utility, transform)

**Analog:** `src/lib/complaint-generator.ts`

**Imports pattern** (`complaint-generator.ts` lines 1–2):
```typescript
import { FilingData } from './filing-state'
import { getTemplate } from './templates/index'
```

For the new file, replace with:
```typescript
import type { Filing } from '@prisma/client'
```
Only one import needed — `@prisma/client` provides the `Filing` type; no external dependencies.

**`buildVisitDate` pattern** (`complaint-generator.ts` lines 9–20 — port directly):
```typescript
function buildVisitDate(data: FilingData): string {
  const fields = data.categoryFields as Record<string, unknown>
  const month = data.visitMonth || (fields?.visitMonth as string | undefined)
  const year = data.visitYear || (fields?.visitYear as string | undefined)
  if (month && year) {
    const names = ['January','February','March','April','May','June','July','August','September','October','November','December']
    const idx = parseInt(month, 10) - 1
    return `${names[idx] ?? month} ${year}`
  }
  if (year) return year
  return 'a recent date'
}
```

In the new generator the signature becomes `buildVisitDate(categoryFields: Record<string, unknown>)` — reads only from the JSON object, not from `FilingData.visitMonth` top-level (those do not exist on `Filing`):
```typescript
function buildVisitDate(categoryFields: Record<string, unknown>): string {
  const month = categoryFields?.visitMonth as string | undefined
  const year  = categoryFields?.visitYear  as string | undefined
  if (month && year) {
    const idx = parseInt(month, 10) - 1
    return `${MONTH_NAMES[idx] ?? month} ${year}`
  }
  if (year) return year
  return 'a recent date'
}
```

**`__OMIT__` sentinel / filter pattern** (`complaint-generator.ts` lines 51–52, 116–118):
```typescript
.replace(/\{\{phone\}\}/g, data.phone?.trim() || '__OMIT__')
// ...
result = result.replace(/^[^\n]*__OMIT__[^\n]*(\n|$)/gm, '')
```

For Q7 contact info, use the filter-nulls-then-join pattern (same intent, no regex needed):
```typescript
const q7Lines = [
  `${fi.firstName ?? ''} ${fi.lastName ?? ''}`.trim(),
  fi.email ?? '',
  phone    || null,
  address  ? `${address}, ${fi.city}, ${fi.state} ${fi.zip}` : null,
].filter(Boolean).join('\n')
```

**Conditional block pattern** (`complaint-generator.ts` lines 95–100):
```typescript
result = result.replace(/\{\{#if priorContact\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, inner) => {
  if (data.priorContact) {
    return inner.replace(/\{\{priorContactDetails\}\}/g, data.priorContactDetails || '')
  }
  return ''
})
```

In the new generator, this maps to the plain TypeScript ternary used for the description narrative:
```typescript
const middle = userText
  ? ` ${userText}.`
  : ` The website placed tracking cookies on my device and transmitted my data to advertising networks.`
```

**`categoryFields` JSON access pattern** (`complaint-generator.ts` lines 10, 23):
```typescript
const fields = data.categoryFields as Record<string, unknown>
const trackingTypes = Array.isArray(fields?.trackingTypes)
  ? (fields.trackingTypes as string[]).join(', ')
  : ...
```

Port into the new generator as:
```typescript
const cf = (filing.categoryFields as Record<string, unknown>) ?? {}
```
Always guard with `?? {}` before indexing.

---

### `src/lib/__tests__/cppa-complaint-generator.test.ts` (test, new)

**Analog:** `src/lib/__tests__/generate-complaint-pdf.test.ts`

**Test file structure** (`generate-complaint-pdf.test.ts` lines 1–7):
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { inflateSync } from 'zlib'
import { generateComplaintPdf } from '../generate-complaint-pdf'
import { storeComplaintPdf } from '../store-complaint-pdf'
import type { Filing } from '@prisma/client'
```

For the new test file, replace with:
```typescript
import { describe, it, expect } from 'vitest'
import { generateCPPAComplaint } from '../cppa-complaint-generator'
import type { Filing } from '@prisma/client'
```
No `vi` needed — the generator is pure; no I/O to mock.

**Mock Filing fixture pattern** (`generate-complaint-pdf.test.ts` lines 102–141):
```typescript
const mockFiling = {
  id: 'test-filing-id',
  userId: null,
  category: 'data-privacy',
  targetName: 'Test Corp',
  targetUrl: 'https://testcorp.com',
  // ... all Filing model fields ...
  faxId: null,
  faxStatus: null,
  filingReceiptId: 'EFC-20260115-ABCDE',
  categoryFields: { trackingTypes: ['cookies', 'pixel trackers'] },
  // ...
} as unknown as Filing
```

The new test needs `categoryFields: { visitMonth: '3', visitYear: '2026' }` and `filerInfo` JSON on the fixture. Use the same `as unknown as Filing` cast. Create one base fixture plus per-test overrides with spread:
```typescript
const mockFilingAccessibility = {
  ...mockFiling,
  category: 'accessibility',
  categoryFields: { visitMonth: '3', visitYear: '2026' },
}
```

**Prohibited-string guard pattern** (`generate-complaint-pdf.test.ts` lines 173–186, 323–335):
```typescript
const PROHIBITED = ['§', 'Civil Code', 'Penal Code', '42 U.S.C.', 'Respectfully submitted', 'Dear Attorney General']

for (const prohibited of PROHIBITED) {
  expect(text).not.toContain(prohibited)
}
```

Apply this same pattern in the new test to check `q4Description` for statute-citation strings (CPTXT-02).

**`describe` / `it` naming convention** (`generate-complaint-pdf.test.ts` lines 278–336):
```typescript
describe('generateComplaintPdf', () => {
  it('PDF-01: returns a non-empty Uint8Array for a privacy_tracking (data-privacy) filing', async () => { ... })
  it('PDF-02: PDF bytes contain required section markers', async () => { ... })
})
```

Follow the same `REQ-ID: behavior description` naming in the new test:
```typescript
describe('generateCPPAComplaint', () => {
  it('CPTXT-01: returns all 7 fields, none null or undefined', () => { ... })
  it('CPTXT-02: q4Description contains no statute citations and is ≤2000 chars', () => { ... })
  it('CPTXT-03: visit date formatted as "Month YYYY" not "03/2026" or "N/A"', () => { ... })
})
```

---

### `src/lib/generate-complaint-pdf.ts` (modified — form-style restructure)

**Analog:** Self. All existing patterns are preserved; only the section layout block changes.

**Font loading pattern** (lines 121–122) — unchanged, copy verbatim:
```typescript
const regularBytes = readFileSync(join(process.cwd(), 'src/assets/fonts/LiberationSerif-Regular.ttf'))
const boldBytes    = readFileSync(join(process.cwd(), 'src/assets/fonts/LiberationSerif-Bold.ttf'))
```

**`drawLine` closure pattern** (lines 163–170) — unchanged, copy verbatim:
```typescript
const drawLine = (text: string, f: PDFFont, size: number, color: RGB) => {
  if (y < margin + size + 4) {
    page = pdfDoc.addPage([612, 792])
    y = height - margin
  }
  page.drawText(text, { x: margin, y, font: f, size, color })
  y -= size + 4
}
```

**New `drawSectionHeader` helper** — add alongside `drawLine`, after line 170:
```typescript
const drawSectionHeader = (title: string) => {
  y -= 8
  if (y < margin + fontSize + 4) {
    page = pdfDoc.addPage([612, 792])
    y = height - margin
  }
  page.drawText(title, { x: margin, y, font: boldFont, size: 11, color: black })
  y -= 11 + 6
  page.drawLine({
    start: { x: margin, y },
    end:   { x: 612 - margin, y },
    thickness: 0.5,
    color: gray,
  })
  y -= 10
}

const drawLabelValue = (label: string, value: string | null | undefined) => {
  if (!value?.trim()) return  // AGPDF-03: omit empty fields entirely — no "N/A"
  drawLine(`${label}: ${value}`, font, fontSize, black)
}
```

**`drawWrappedText` call pattern** (lines 237–250) — unchanged, reuse for COMPLAINT section body:
```typescript
const bodyResult = drawWrappedText(complaintText, {
  page, x: margin, y, font, size: fontSize,
  maxWidth, lineHeight, color: black, pdfDoc, margin, height,
})
page = bodyResult.page
y    = bodyResult.y
```

**PDF Info metadata pattern** (lines 138–143) — update Keywords to new section markers:
```typescript
if (infoDict) {
  infoDict.set(PDFName.of('Subject'),  PDFString.of('CONSUMER COMPLAINT FORM'))
  infoDict.set(PDFName.of('Keywords'), PDFString.of(
    `EasyFilerComplaint YOUR INFORMATION BUSINESS INFORMATION COMPLAINT AFFIRMATION Filing ID: ${filingReceiptIdForMeta}`
  ))
}
```
Remove the old `'Re: Respectfully submitted'` tokens from Keywords.

**`priorContact` conditional pattern** (lines 275–293) — unchanged in form-style, same guard:
```typescript
if (filing.priorContact) {
  const priorText = `I previously contacted ${filing.targetName} regarding this issue. ${filing.priorContactDetails || ''}`
  const priorResult = drawWrappedText(priorText, { page, x: margin, y, font, size: fontSize, maxWidth, lineHeight, color: black, pdfDoc, margin, height })
  page = priorResult.page
  y    = priorResult.y
  y -= 8
}
```

**Footer pattern** (lines 306–315) — unchanged, copy verbatim:
```typescript
const filingReceiptId = filing.filingReceiptId ?? filing.id
const footerText = `EasyFilerComplaint . easyfilercomplaint.com . Filing ID: ${filingReceiptId}`
const lastPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1]
lastPage.drawText(footerText, { x: margin, y: margin / 2, font, size: 8, color: gray })
return pdfDoc.save({ useObjectStreams: false })
```

**`toFilingData` function** (lines 32–60) — keep unchanged; still needed to marshal Filing → FilingData for the `filerInfo` extraction path. The new generator reads directly from `Filing` and its `filerInfo` JSON field.

**Import block** (lines 1–7): Add the new generator import:
```typescript
import { generateCPPAComplaint } from './cppa-complaint-generator'
```
Remove the `generateComplaintText` import once the body generation switches to `generateCPPAComplaint(filing).q4`.

---

### `src/lib/__tests__/generate-complaint-pdf.test.ts` (modified — update broken assertions)

**Analog:** Self. The fixture and helper infrastructure is unchanged; only specific `it` blocks are replaced.

**Assertions to REMOVE from `PDF-02` test** (lines 285–293):
```typescript
// DELETE these two lines:
expect(text).toContain('Re:')
expect(text).toContain('Respectfully submitted')
```

**Assertions to ADD to `PDF-02` test** (replace the removed lines):
```typescript
// New form-section header checks (AGPDF-01)
expect(text).toContain('YOUR INFORMATION')
expect(text).toContain('BUSINESS INFORMATION')
expect(text).toContain('COMPLAINT')
expect(text).toContain('RESOLUTION REQUESTED')
expect(text).toContain('AFFIRMATION')
// Statute-citation prohibition (AGPDF-02, Pitfall 3)
expect(text).not.toContain('§')
expect(text).not.toContain('Civil Code')
expect(text).not.toContain('Dear Attorney General')
// N/A prohibition (AGPDF-03)
expect(text).not.toContain('N/A')
```

**`PDF-03` tests to REMOVE or REPLACE** (lines 295–313):
The three `PDF-03` tests assert CCPA/Unruh/ADA/video statute references. These references come from `generateComplaintText()` which Phase 9 replaces. Remove the assertions that check for statute text. Replace `PDF-03 variant 1` with a check that the COMPLAINT section body matches the CPPA narrative format:
```typescript
it('PDF-03: AG PDF COMPLAINT section uses CPPA Q4 narrative (no statute citations)', async () => {
  const bytes = await generateComplaintPdf(mockFiling, mockFilerInfo)
  const text  = extractPdfText(bytes)
  expect(text).toContain('On or about')          // narrative opening
  expect(text).not.toContain('§')                // no statute citations
  expect(text).not.toContain('Civil Code')
})
```

**`mockFiling` fixture** (lines 102–141): Already contains `faxId: null` and `faxStatus: null` — no change needed. If `category: 'data-privacy'` is kept, note that CATEGORY_TO_TEMPLATE maps it to `'data-privacy'`; the new generator uses raw `filing.category` value `'data-privacy'` against `CATEGORY_TO_CPPA_CHECKBOXES`. Add a `privacy_tracking` fixture variant if needed for the checkbox map:
```typescript
const mockFilingPrivacyTracking = {
  ...mockFiling,
  category: 'privacy_tracking',
  categoryFields: { visitMonth: '3', visitYear: '2026' },
}
```

---

### `src/app/filing/[id]/success/page.tsx` (modified — 3-channel redesign)

**Analog:** Self. The shell (Masthead, Footer, Prisma findUnique, not-found guard) is preserved.

**Prisma select pattern** (lines 11–24) — extend with two new fields:
```typescript
const filing = await prisma.filing.findUnique({
  where: { id: params.id },
  select: {
    id:              true,
    filingReceiptId: true,
    targetName:      true,
    category:        true,
    status:          true,
    paymentAmount:   true,
    paidAt:          true,
    complaintPdfUrl: true,
    userId:          true,
    faxId:           true,   // NEW — SUCC-03
    faxStatus:       true,   // NEW — SUCC-03
  },
})
```

**Not-found guard pattern** (lines 27–39) — preserve verbatim:
```typescript
if (!filing) {
  return (
    <div className="min-h-screen bg-bg">
      <Masthead />
      <div className="max-w-3xl mx-auto px-6 py-12 text-center">
        <h1 className="font-serif text-3xl font-bold text-text mb-4">Filing Not Found</h1>
        <p className="font-body text-sm text-text-mid">
          This filing receipt may have expired. Start a new complaint from the home page.
        </p>
      </div>
      <Footer />
    </div>
  )
}
```

**ADA conditional variable** — add before the return JSX:
```typescript
const isADA = filing.category === 'accessibility'
// category value is 'accessibility' per categories.ts id
```

**Three-channel section pattern** (new JSX sections, using existing Tailwind class vocabulary from lines 57–98):
```tsx
{/* STEP 1: CPPA Online — hidden for ADA (ADA-01) */}
{!isADA && (
  <div className="bg-bg-alt border border-border rounded-[6px] p-6 mb-4">
    <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-text-light mb-3">
      ★ STEP 1 — Recommended
    </p>
    <h2 className="font-serif text-base font-bold text-text mb-2">File with CPPA Online</h2>
    <a
      href={`/filing/${filing.id}/cppa-guide`}
      className="inline-block font-mono text-[11px] tracking-[0.1em] uppercase bg-bg-dark text-white px-8 py-3.5 rounded-[6px] hover:bg-text-mid transition-colors"
    >
      File Now — Step-by-Step Guide →
    </a>
  </div>
)}

{/* STEP 2: CPPA Paper PDF — hidden for ADA (ADA-01) */}
{!isADA && (
  <div className="bg-bg-alt border border-border rounded-[6px] p-6 mb-4">
    <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-text-light mb-3">STEP 2</p>
    <h2 className="font-serif text-base font-bold text-text mb-2">Download Paper Complaint (Mail-In)</h2>
    <a
      href={`/api/filings/${filing.id}/cppa-pdf`}
      className="font-mono text-[9px] uppercase tracking-[0.1em] border border-border rounded-[6px] px-3 py-1 text-text-mid hover:text-text"
    >
      Download CPPA Complaint PDF ↓
    </a>
  </div>
)}

{/* STEP 3 (or STEP 1 for ADA): CA AG Auto-Filed */}
<div className="bg-bg-alt border border-border rounded-[6px] p-6 mb-4">
  <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-text-light mb-3">
    STEP {isADA ? '1' : '3'} — Auto-Filed
  </p>
  <h2 className="font-serif text-base font-bold text-text mb-2">Attorney General ✓</h2>
  {filing.faxId && (
    <p className="font-body text-sm text-text-mid">Fax ID: {filing.faxId}</p>
  )}
  <p className="font-body text-sm text-text-mid">
    Status: {filing.faxStatus ?? 'Pending'}
  </p>
  {filing.complaintPdfUrl && (
    <div className="mt-3">
      <a
        href={`/api/filings/${filing.id}/pdf`}
        className="font-mono text-[9px] uppercase tracking-[0.1em] border border-border rounded-[6px] px-3 py-1 text-text-mid hover:text-text"
      >
        Download Your Complaint PDF ↓
      </a>
    </div>
  )}
</div>
```

**Guest CTA pattern** (lines 115–129) — preserve verbatim (SUCC-04):
```tsx
{!filing.userId && (
  <div className="bg-bg-alt border border-border rounded-[6px] p-6 mb-6">
    <h2 className="font-serif text-base font-bold text-text mb-2">Track Your Filings</h2>
    <p className="font-body text-sm text-text-mid mb-4">
      Create a free account to view your filing history and download your complaint PDF anytime.
    </p>
    <a
      href={`/account/create?filingId=${filing.id}`}
      className="inline-block font-mono text-[11px] tracking-[0.1em] uppercase bg-bg-dark text-white px-8 py-3.5 rounded-[6px] hover:bg-text-mid transition-colors"
    >
      Create Free Account →
    </a>
  </div>
)}
```

---

### `src/app/filing/[id]/success/page.test.tsx` (modified — update for new structure)

**Analog:** Self. The mock setup block and Prisma mock pattern are preserved unchanged.

**Mock setup block** (lines 1–19) — preserve verbatim:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    filing: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }),
}))

vi.mock('@/components/Masthead', () => ({ Masthead: () => null }))
vi.mock('@/components/Footer',   () => ({ Footer:   () => null }))
vi.mock('@/components/DoubleRule',() => ({ DoubleRule:() => null }))
```

**`baseFiling` fixture** (lines 21–32) — extend with new fields required by the updated select:
```typescript
const baseFiling = {
  id:              'filing-uuid-001',
  filingReceiptId: 'EFC-20260401-ABCDE',
  targetName:      'Acme Corp',
  category:        'data-privacy',          // non-ADA
  status:          'paid',
  paymentAmount:   '1.99',
  paidAt:          new Date('2026-04-01T10:00:00Z'),
  complaintPdfUrl: null,
  userId:          null,
  faxId:           null,                    // NEW
  faxStatus:       null,                    // NEW
}
```

**Pattern for Prisma mock + page render** (lines 40–45) — unchanged:
```typescript
const { prisma } = await import('@/lib/prisma')
;(prisma.filing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseFiling)
const { default: SuccessPage } = await import('./page')
const result = await SuccessPage({ params: { id: 'filing-uuid-001' } })
const html = JSON.stringify(result)
```

**Tests to ADD** (new `it` blocks — same pattern as existing tests):
```typescript
it('SUCC-01: renders CPPA guide link when category is not accessibility', async () => {
  const { prisma } = await import('@/lib/prisma')
  ;(prisma.filing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseFiling)
  const { default: SuccessPage } = await import('./page')
  const html = JSON.stringify(await SuccessPage({ params: { id: 'filing-uuid-001' } }))
  expect(html).toContain('/filing/filing-uuid-001/cppa-guide')
  expect(html).toContain('/api/filings/filing-uuid-001/cppa-pdf')
})

it('ADA-01: hides CPPA sections when category is accessibility', async () => {
  const { prisma } = await import('@/lib/prisma')
  ;(prisma.filing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    ...baseFiling, category: 'accessibility',
  })
  const { default: SuccessPage } = await import('./page')
  const html = JSON.stringify(await SuccessPage({ params: { id: 'filing-uuid-001' } }))
  expect(html).not.toContain('cppa-guide')
  expect(html).not.toContain('cppa-pdf')
})

it('SUCC-03: renders fax ID and status when present', async () => {
  const { prisma } = await import('@/lib/prisma')
  ;(prisma.filing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    ...baseFiling, faxId: 'FAX-12345', faxStatus: 'success',
  })
  const { default: SuccessPage } = await import('./page')
  const html = JSON.stringify(await SuccessPage({ params: { id: 'filing-uuid-001' } }))
  expect(html).toContain('FAX-12345')
  expect(html).toContain('success')
})

it('SUCC-03: renders Pending when faxId is null', async () => {
  const { prisma } = await import('@/lib/prisma')
  ;(prisma.filing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseFiling)
  const { default: SuccessPage } = await import('./page')
  const html = JSON.stringify(await SuccessPage({ params: { id: 'filing-uuid-001' } }))
  expect(html).toContain('Pending')
})
```

**Tests to UPDATE** (old assertions that break after rewrite):
- `'Download Complaint PDF'` string changes to be inside the CA AG section — update the assertion to check for the route `/api/filings/${id}/pdf`.
- `'will be available shortly'` string is removed — remove that test or change it to check the CA AG section renders without a PDF link.
- `'Track Your Filings'` and `'Create Free Account'` — **preserve unchanged** (SUCC-04, explicitly required).

---

## Shared Patterns

### Pattern A: `categoryFields` JSON Access
**Source:** `src/lib/complaint-generator.ts` lines 10, 23
**Apply to:** `cppa-complaint-generator.ts`, `generate-complaint-pdf.ts` (existing `toFilingData`)
```typescript
// ALWAYS guard with ?? {} before indexing
const cf = (filing.categoryFields as Record<string, unknown>) ?? {}
const month = cf.visitMonth as string | undefined
```

### Pattern B: `__OMIT__` / filter-nulls for conditional fields
**Source:** `src/lib/complaint-generator.ts` lines 51–52, 116–118
**Apply to:** `cppa-complaint-generator.ts` (Q7 contact block), `generate-complaint-pdf.ts` (`drawLabelValue`)
```typescript
// Sentinel approach (complaint-generator.ts):
.replace(/\{\{phone\}\}/g, data.phone?.trim() || '__OMIT__')
result = result.replace(/^[^\n]*__OMIT__[^\n]*(\n|$)/gm, '')

// Filter-nulls approach (new generator — same intent, no regex):
[value1, value2, phone || null].filter(Boolean).join('\n')

// drawLabelValue approach (AG PDF sections — AGPDF-03):
const drawLabelValue = (label: string, value: string | null | undefined) => {
  if (!value?.trim()) return   // omit entirely, never write "N/A"
  drawLine(`${label}: ${value}`, font, fontSize, black)
}
```

### Pattern C: `drawWrappedText` reuse
**Source:** `src/lib/generate-complaint-pdf.ts` lines 63–114 and 237–250
**Apply to:** `generate-complaint-pdf.ts` (COMPLAINT section body, RESOLUTION REQUESTED body)
```typescript
// Call signature — always destructure result back into {page, y}:
const result = drawWrappedText(text, {
  page, x: margin, y, font, size: fontSize,
  maxWidth, lineHeight, color: black, pdfDoc, margin, height,
})
page = result.page
y    = result.y
```

### Pattern D: Vitest mock-then-import pattern for server components
**Source:** `src/app/filing/[id]/success/page.test.tsx` lines 40–45
**Apply to:** Updated `page.test.tsx`
```typescript
// All vi.mock() calls must appear BEFORE any import of the module under test.
// Use dynamic import() inside each `it` block so mocks are settled before module load.
const { prisma } = await import('@/lib/prisma')
;(prisma.filing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(fixture)
const { default: SuccessPage } = await import('./page')
const html = JSON.stringify(await SuccessPage({ params: { id: 'filing-uuid-001' } }))
```

### Pattern E: `pdfDoc.save({ useObjectStreams: false })`
**Source:** `src/lib/generate-complaint-pdf.ts` line 319
**Apply to:** `generate-complaint-pdf.ts` (preserve unchanged)
```typescript
// Required so Info dictionary stays uncompressed and metadata strings
// (section markers, complaint text) remain searchable in raw PDF bytes.
return pdfDoc.save({ useObjectStreams: false })
```

### Pattern F: Tailwind class vocabulary for new JSX sections
**Source:** `src/app/filing/[id]/success/page.tsx` lines 57–98
**Apply to:** New 3-channel sections in `page.tsx`

Consistent class set in this page:
- Card wrapper: `bg-bg-alt border border-border rounded-[6px] p-6 mb-4`
- Label / metadata text: `font-mono text-[9px] tracking-[0.15em] uppercase text-text-light mb-3`
- Section heading: `font-serif text-base font-bold text-text mb-2`
- Body text: `font-body text-sm text-text-mid`
- Primary CTA button: `inline-block font-mono text-[11px] tracking-[0.1em] uppercase bg-bg-dark text-white px-8 py-3.5 rounded-[6px] hover:bg-text-mid transition-colors`
- Secondary link: `font-mono text-[9px] uppercase tracking-[0.1em] border border-border rounded-[6px] px-3 py-1 text-text-mid hover:text-text`

---

## No Analog Found

All 6 files have close analogs in the codebase. No files require falling back to RESEARCH.md patterns only.

---

## Critical Assertions to Preserve / Destroy

| Test | Action | Reason |
|------|--------|--------|
| `PDF-02: expect(text).toContain('Re:')` | REMOVE | Phase 9 removes letter "Re:" line (AGPDF-02) |
| `PDF-02: expect(text).toContain('Respectfully submitted')` | REMOVE | Phase 9 removes letter closing (AGPDF-02) |
| `PDF-02: expect(text).toContain('PRIVACY COMPLAINT')` | REPLACE with `'CONSUMER COMPLAINT FORM'` | Title changes (AGPDF-01) |
| `PDF-03 variant 1: CCPA reference` | REPLACE | New narrative has no statute text; check for `'On or about'` instead |
| `PDF-03 variant 2: Unruh/ADA reference` | REPLACE | Same reason — no statute text |
| `PDF-03 variant 3: video reference` | UPDATE | Check for category-appropriate narrative opening |
| `page.test: 'Download Complaint PDF'` | UPDATE | Text changes; check for `/api/filings/${id}/pdf` href instead |
| `page.test: 'will be available shortly'` | REMOVE | That conditional text is removed in the redesign |
| `page.test: 'Track Your Filings'` | PRESERVE | SUCC-04 explicitly requires guest CTA preserved |
| `page.test: 'Create Free Account'` | PRESERVE | Same |
| `page.test: 'Filing Not Found'` | PRESERVE | Guard clause unchanged |

---

## Metadata

**Analog search scope:** `src/lib/`, `src/lib/__tests__/`, `src/app/filing/[id]/success/`
**Files read:** 8 (`complaint-generator.ts`, `generate-complaint-pdf.ts`, `generate-complaint-pdf.test.ts`, `success/page.tsx`, `success/page.test.tsx`, `filing-state.ts`, `filing-pipeline.test.ts`, `vitest.config.ts`)
**Pattern extraction date:** 2026-05-03
