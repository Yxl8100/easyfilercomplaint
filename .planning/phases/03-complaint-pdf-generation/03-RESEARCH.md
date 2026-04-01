# Phase 3: Complaint PDF Generation - Research

**Researched:** 2026-04-01
**Domain:** pdf-lib font embedding, Vercel Blob storage, Next.js server-side PDF generation
**Confidence:** HIGH

## Summary

Phase 3 replaces the existing StandardFonts-based PDF drafts in `src/lib/pdf-filler.ts` and `src/app/api/preview-pdf/route.ts` with a single authoritative `generateComplaintPdf()` function that (a) embeds a real TTF font via `@pdf-lib/fontkit`, (b) renders all 13 required letter sections, (c) uploads the result to Vercel Blob, and (d) writes the blob URL back to `Filing.complaintPdfUrl`.

The project already has `pdf-lib ^1.17.1` installed and a working template system (`src/lib/templates/`, `src/lib/complaint-generator.ts`). The complaint type values used in Phase 3 are `privacy_tracking`, `accessibility`, and `video_sharing` — these map to existing template keys (`data-privacy` / `ca_ag`, `accessibility` / `ca_ag`). The `video_sharing` type requires a new template entry. Neither `@pdf-lib/fontkit` nor `@vercel/blob` is installed yet; both must be added in Wave 0.

An automated assertion test that scans raw PDF bytes for prohibited strings (PDF-06) is a first-class deliverable — it runs in vitest alongside the existing `filing-receipt-id.test.ts` pattern.

**Primary recommendation:** Create `src/lib/generate-complaint-pdf.ts` as the single source of truth for PDF generation, store assets (font TTF) in `src/assets/fonts/`, and call `put()` from `@vercel/blob` with a `BLOB_READ_WRITE_TOKEN` guard that falls back to base64-in-DB when the token is absent (PDF-04).

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PDF-01 | generateComplaintPdf() produces a single-page formal complaint letter | pdf-lib PDFDocument.create() + save() → Uint8Array; existing word-wrap pattern in preview-pdf/route.ts is reusable |
| PDF-02 | PDF includes all required sections: header, To, From, Subject, body paragraphs, closing, footer | Implement as 13 discrete drawText blocks; existing pdf-filler.ts demonstrates the y-cursor technique |
| PDF-03 | PDF body copy is determined by complaintType (privacy_tracking / accessibility / video_sharing) | Template system already exists in src/lib/templates/; need to add video_sharing template for ca_ag |
| PDF-04 | Generated PDF stored in Vercel Blob (or DB fallback if BLOB_READ_WRITE_TOKEN not set) | @vercel/blob put() API confirmed; fallback = store Buffer.from(pdfBytes).toString('base64') on Filing record or skip storage |
| PDF-05 | Filing.complaintPdfUrl updated after PDF generation | prisma.filing.update() — field already exists in schema (added in Phase 1) |
| PDF-06 | PDF contains zero references to prohibited strings | Automated vitest assertion: decode Uint8Array to string and assert each prohibited term count === 0 |
| PDF-07 | PDF uses @pdf-lib/fontkit with embedded font (not Standard Fonts) | pdfDoc.registerFontkit(fontkit) + pdfDoc.embedFont(fontBytes) — replaces StandardFonts.TimesRoman |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pdf-lib | ^1.17.1 | PDF document creation and layout | Already installed; proven in preview-pdf/route.ts and pdf-filler.ts |
| @pdf-lib/fontkit | 1.1.1 | Custom TTF/OTF font registration with pdf-lib | Required by PDF-07; official companion package maintained by the pdf-lib team |
| @vercel/blob | 2.3.2 | Store generated PDFs in Vercel's blob storage | Required by PDF-04; project already uses Vercel deployment stack |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| prisma @prisma/client | ^5.22.0 | Update Filing.complaintPdfUrl after upload | Already installed; same pattern as Phase 2 webhook updates |
| vitest | ^4.1.2 | Automated prohibited-string assertion (PDF-06) | Already installed and configured |

### Installation Required (Wave 0)
```bash
npm install @pdf-lib/fontkit @vercel/blob
```

**Version verification (confirmed 2026-04-01):**
- `@pdf-lib/fontkit`: 1.1.1 (latest, npm registry)
- `@vercel/blob`: 2.3.2 (latest, npm registry)

### Font Asset
A free, open-source TTF must be bundled in the repository at `src/assets/fonts/`. Recommended: **Liberation Serif Regular + Bold** (metrically compatible with Times New Roman, SIL Open Font License). These render identically on government fax machines and avoid the variable-rendering problem that occurs with PDF Standard Fonts.

Alternative: **Noto Sans** — a TTF is already present in the project at `node_modules/next/dist/compiled/@vercel/og/noto-sans-v27-latin-regular.ttf` but **should NOT be referenced from node_modules** (path is fragile across installs). Copy the font bytes into `src/assets/fonts/` or download Liberation Serif from the SIL release.

---

## Architecture Patterns

### Recommended File Structure
```
src/
├── lib/
│   ├── generate-complaint-pdf.ts   # NEW: authoritative PDF function (replaces pdf-filler.ts)
│   ├── store-complaint-pdf.ts      # NEW: Vercel Blob upload + DB fallback
│   ├── pdf-filler.ts               # EXISTING: keep for legacy; not called in Phase 3 pipeline
│   ├── complaint-generator.ts      # EXISTING: template rendering (reused)
│   └── templates/
│       ├── data-privacy.ts         # EXISTING: contains ca_ag template for privacy_tracking
│       ├── accessibility.ts        # EXISTING: contains ca_ag template for accessibility
│       └── index.ts                # EXISTING: template registry (add video_sharing mapping)
├── assets/
│   └── fonts/
│       ├── LiberationSerif-Regular.ttf   # NEW: bundled font
│       └── LiberationSerif-Bold.ttf      # NEW: bundled font
└── __tests__/
    └── generate-complaint-pdf.test.ts    # NEW: PDF-06 assertion + integration tests
```

### Pattern 1: Font Registration with @pdf-lib/fontkit
**What:** Register fontkit before any embedFont call; read TTF bytes from filesystem using `fs.readFileSync` (server-only code).
**When to use:** Every call to `generateComplaintPdf()`.

```typescript
// Source: https://pdf-lib.js.org/ (official documentation)
import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { readFileSync } from 'fs'
import { join } from 'path'

const fontBytes = readFileSync(join(process.cwd(), 'src/assets/fonts/LiberationSerif-Regular.ttf'))
const boldFontBytes = readFileSync(join(process.cwd(), 'src/assets/fonts/LiberationSerif-Bold.ttf'))

const pdfDoc = await PDFDocument.create()
pdfDoc.registerFontkit(fontkit)  // MUST be called before embedFont with custom fonts
const font = await pdfDoc.embedFont(fontBytes)
const boldFont = await pdfDoc.embedFont(boldFontBytes)
const pdfBytes = await pdfDoc.save()  // returns Uint8Array
```

### Pattern 2: Vercel Blob Upload with Fallback
**What:** Upload Uint8Array as Buffer to Vercel Blob; fall back gracefully when `BLOB_READ_WRITE_TOKEN` is absent.
**When to use:** After `pdfDoc.save()` returns; before updating `Filing.complaintPdfUrl`.

```typescript
// Source: https://vercel.com/docs/storage/vercel-blob/using-blob-sdk (verified 2026-04-01)
import { put } from '@vercel/blob'

async function storeComplaintPdf(filingId: string, pdfBytes: Uint8Array): Promise<string | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    // DB fallback: caller stores null or skips
    console.warn('[pdf] BLOB_READ_WRITE_TOKEN not set — skipping blob storage')
    return null
  }

  const blob = await put(
    `complaints/${filingId}/complaint.pdf`,
    Buffer.from(pdfBytes),
    {
      access: 'private',
      contentType: 'application/pdf',
      addRandomSuffix: false,
      allowOverwrite: true,
    }
  )
  return blob.url
}
```

**Key detail:** `put()` accepts `Buffer` (which extends `ArrayBuffer`) as the `body` parameter. No conversion to base64 is needed for upload. The `blob.url` is the private Vercel Blob URL stored in `Filing.complaintPdfUrl`.

### Pattern 3: The 13-Section Letter Layout
**What:** Formal government complaint letter with fixed sections rendered using a y-cursor.
**When to use:** Inside `generateComplaintPdf()`, after font registration.

The 13 required sections (derived from the Phase 3 success criteria and existing templates):

1. **Document header** — "PRIVACY COMPLAINT" centered bold
2. **Filing date line** — "Filed via EasyFilerComplaint · [date]" small gray
3. **Horizontal rule** — divider line
4. **To block** — Agency name and address
5. **From block** — Complainant name and address
6. **Date line** — formal date
7. **Re / Subject line** — complaint subject (bold)
8. **Opening salutation** — "Dear [Agency],"
9. **Body paragraphs** — complaint-type-specific text (from template system)
10. **Relief requested** — standard paragraph requesting investigation
11. **Prior contact disclosure** — conditional section (if priorContact === true)
12. **Closing** — "Respectfully submitted," + complainant name
13. **Footer** — "EasyFilerComplaint · easyfilercomplaint.com · Filing ID: [filingReceiptId]"

**Word-wrap helper:** The existing y-cursor + word-wrap loop from `src/app/api/preview-pdf/route.ts` is tested and should be extracted into a shared helper.

### Pattern 4: Complaint Type Routing
**What:** Map `Filing.category` values to template keys.
**When to use:** When populating the body section of the letter.

| Filing.category value | Template key | Agency key | Template file |
|-----------------------|-------------|------------|---------------|
| `privacy_tracking` | `data-privacy` | `ca_ag` | templates/data-privacy.ts |
| `accessibility` | `accessibility` | `ca_ag` | templates/accessibility.ts |
| `video_sharing` | `video-sharing` | `ca_ag` | **NEW — must be created** |

The template index (`src/lib/templates/index.ts`) must be updated to register the `video-sharing` category.

### Anti-Patterns to Avoid
- **Using StandardFonts from pdf-lib:** StandardFonts (Helvetica, Times Roman) are not embedded — they rely on the PDF viewer having the font. On government fax software this causes rendering failures. PDF-07 explicitly forbids this.
- **Calling `fs.readFileSync` with a relative path:** Next.js changes `process.cwd()` during builds. Always use `join(process.cwd(), 'src/assets/fonts/...')` or import font bytes at module level.
- **Passing Uint8Array directly to Resend attachment:** STATE.md note: use `Buffer.from(pdfBytes).toString('base64')` for email attachments (Phase 5 concern, but the Uint8Array is the canonical form from this phase).
- **Storing PDF bytes in the DB:** The Filing schema has `complaintPdfUrl String?` — store only the URL, not the bytes. The DB fallback when blob is unavailable should store `null` and log a warning, not attempt to persist bytes in a JSON field.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Font embedding in PDF | Custom TTF parser or binary injection | `@pdf-lib/fontkit` + `pdfDoc.registerFontkit()` | Font subsetting, encoding, and glyph mapping are ~3,000 lines of spec-compliance |
| File storage with CDN | Custom S3 upload or local disk write | `@vercel/blob` `put()` | Vercel Blob handles multipart, CDN distribution, and signed URLs |
| Word wrap in PDF | Manual pixel-level text breaking | `font.widthOfTextAtSize(text, size)` | pdf-lib exposes text metric APIs; the existing preview-pdf route already has a working loop |
| Template variable substitution | Build a custom template engine | Existing `src/lib/complaint-generator.ts` `fillTemplate()` | Already handles `{{variable}}`, `{{#if}}` blocks, and array joins |

---

## Common Pitfalls

### Pitfall 1: @pdf-lib/fontkit import in Next.js
**What goes wrong:** `import fontkit from '@pdf-lib/fontkit'` fails with "Module not found" or "default export" error if the package is not in dependencies (only devDependencies) or if the ESM/CJS interop is mishandled.
**Why it happens:** `@pdf-lib/fontkit` ships as CJS. Next.js 14 App Router server components handle CJS fine, but the import must use the default import syntax.
**How to avoid:** Use `import fontkit from '@pdf-lib/fontkit'` (not destructured). Ensure it is in `dependencies`, not `devDependencies`.
**Warning signs:** TypeScript error "has no default export" — fix by checking `@types/pdf-lib` or adding `"esModuleInterop": true` in tsconfig (already present in Next.js projects by default).

### Pitfall 2: Font file path resolution in Vercel serverless
**What goes wrong:** `fs.readFileSync('./src/assets/fonts/...')` returns ENOENT in production because Vercel's serverless function root is not the project root.
**Why it happens:** `process.cwd()` is the function execution directory, which differs from the repo root on some Vercel configurations.
**How to avoid:** Use `join(process.cwd(), 'src/assets/fonts/LiberationSerif-Regular.ttf')` OR use `path.resolve(__dirname, '../assets/fonts/...')`. Test locally with `next build && next start` before deploying.
**Warning signs:** PDF generation succeeds in `next dev` but returns 500 in production.

### Pitfall 3: StandardFonts still imported after refactor
**What goes wrong:** Tests pass but the PDF still uses StandardFonts because `pdf-filler.ts` or `preview-pdf/route.ts` was not updated or because the new function accidentally falls back to `embedFont(StandardFonts.TimesRoman)`.
**Why it happens:** There are two existing implementations (`pdf-filler.ts` and `preview-pdf/route.ts`) that both use StandardFonts. Phase 3 introduces a third — if the call chain is not clearly traced, old implementations remain active.
**How to avoid:** The PDF-07 test assertion should verify the PDF bytes do NOT contain the string "Times-Roman" (PDF name for TimesRoman standard font) — this detects StandardFonts regression automatically.
**Warning signs:** The prohibited-strings assertion test passes but the font name in the PDF metadata shows "Times-Roman".

### Pitfall 4: Prohibited strings appearing in template text
**What goes wrong:** Body copy in the template strings accidentally includes words like "attorney", "law firm", or entity names.
**Why it happens:** Templates in `data-privacy.ts` and `accessibility.ts` were written pre-Phase 3 without running the PDF-06 assertion.
**How to avoid:** The PDF-06 test scans raw PDF bytes (not just the template string) to catch strings that appear in any PDF section including metadata.
**Warning signs:** Test fails on "attorney" even though no template seems to use it — check PDF document metadata (author field, creator field).

### Pitfall 5: Vercel Blob access level mismatch
**What goes wrong:** PDFs uploaded with `access: 'public'` are accessible without authentication, which exposes PII.
**Why it happens:** Copying examples from Vercel documentation that use `access: 'public'` for simplicity.
**How to avoid:** Always use `access: 'private'` for complaint PDFs. Delivery to users must go through a signed URL or server-proxied download route.
**Warning signs:** The blob URL is accessible directly without credentials in the browser.

---

## Code Examples

### generateComplaintPdf() Skeleton
```typescript
// src/lib/generate-complaint-pdf.ts
import { PDFDocument, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { readFileSync } from 'fs'
import { join } from 'path'
import { generateComplaintText } from './complaint-generator'
import type { Filing } from '@prisma/client'

// Complaint type → template category map
const COMPLAINT_TYPE_TO_CATEGORY: Record<string, string> = {
  privacy_tracking: 'data-privacy',
  accessibility: 'accessibility',
  video_sharing: 'video-sharing',
}

export async function generateComplaintPdf(filing: Filing): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  const regularBytes = readFileSync(join(process.cwd(), 'src/assets/fonts/LiberationSerif-Regular.ttf'))
  const boldBytes = readFileSync(join(process.cwd(), 'src/assets/fonts/LiberationSerif-Bold.ttf'))
  const font = await pdfDoc.embedFont(regularBytes)
  const boldFont = await pdfDoc.embedFont(boldBytes)

  // ... render 13 sections using y-cursor pattern ...

  return pdfDoc.save()
}
```

### Prohibited String Assertion Test (PDF-06)
```typescript
// src/lib/__tests__/generate-complaint-pdf.test.ts
import { describe, it, expect } from 'vitest'
import { generateComplaintPdf } from '../generate-complaint-pdf'

const PROHIBITED = ['DPW', 'Pro Veritas', 'APFC', 'ComplianceSweep', 'IdentifiedVerified', 'attorney', 'law firm']

const mockFiling = { /* minimal Filing fixture */ }

describe('generateComplaintPdf — entity separation', () => {
  it('contains zero prohibited strings (PDF-06)', async () => {
    const bytes = await generateComplaintPdf(mockFiling as any)
    const text = Buffer.from(bytes).toString('latin1')  // latin1 preserves raw bytes
    for (const term of PROHIBITED) {
      const count = (text.match(new RegExp(term, 'gi')) ?? []).length
      expect(count, `Found prohibited term "${term}" in PDF bytes`).toBe(0)
    }
  })
})
```

**Note:** Use `latin1` (not `utf-8`) to decode PDF bytes — PDF uses a binary format; utf-8 decode will throw on many byte sequences.

### Vercel Blob Put (server-side)
```typescript
// Source: https://vercel.com/docs/storage/vercel-blob/using-blob-sdk
import { put } from '@vercel/blob'

const blob = await put(
  `complaints/${filing.id}/EFC_${filing.filingReceiptId}.pdf`,
  Buffer.from(pdfBytes),
  { access: 'private', contentType: 'application/pdf', allowOverwrite: true }
)
// blob.url is the private storage URL
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| StandardFonts (Helvetica, Times Roman) | Embedded TTF via fontkit | pdf-lib ≥ 1.4.0 | Consistent rendering regardless of viewer/fax machine |
| Local disk storage | Vercel Blob | 2023 (Vercel GA) | Serverless-compatible; no ephemeral disk writes needed |
| Per-agency generateXxxPdf() functions | Single generateComplaintPdf(filing) | This phase | Reduces duplication; single font-load path |

**Deprecated/outdated in this codebase:**
- `src/lib/pdf-filler.ts`: Uses StandardFonts; exports `fillCaAgPdf`, `fillFdaPdf`, `fillDojAdaPdf`. Not called from any Phase 2+ pipeline; superseded by `generateComplaintPdf()` in this phase.
- `src/app/api/preview-pdf/route.ts`: Also uses StandardFonts. Phase 3 should update this route to call `generateComplaintPdf()` so the preview reflects the final output.

---

## Open Questions

1. **video_sharing template content**
   - What we know: `Filing.category` can be `video_sharing` (mentioned in Phase 3 success criteria) but no `video-sharing` entry exists in `src/lib/templates/index.ts` or any template file.
   - What's unclear: Exact legal statute and body copy for a video sharing privacy complaint to CA AG.
   - Recommendation: Planner should include a task to create `src/lib/templates/video-sharing.ts` with a `ca_ag` entry modeled after `data-privacy.ts`'s CA AG template, citing California AB 602 (deepfake/video) or CCPA video data provisions.

2. **Font file source / license**
   - What we know: A TTF is needed in `src/assets/fonts/`. Noto Sans TTF exists in `node_modules/next/dist/compiled/@vercel/og/` but should not be referenced there.
   - What's unclear: Whether Liberation Serif or Noto Sans is preferred for government fax legibility.
   - Recommendation: Liberation Serif is metrically closer to Times New Roman (which many government forms use). Download from https://github.com/liberationfonts/liberation-fonts/releases and commit both Regular and Bold TTFs. Planner should include a Wave 0 task to add these binary assets.

3. **complaintType vs category field naming**
   - What we know: The Phase 3 success criteria use values `privacy_tracking`, `accessibility`, `video_sharing`. The Filing schema stores this as `category String`. The existing template index uses keys `data-privacy`, `accessibility`, `video-sharing`.
   - What's unclear: Whether `Filing.category` currently stores `data-privacy` (existing wizard value) or `privacy_tracking` (Phase 3 spec value).
   - Recommendation: Planner should include a task to verify the wizard step that sets `Filing.category` and ensure the mapping table in `generate-complaint-pdf.ts` correctly translates between the two naming schemes.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | PDF generation (fs.readFileSync) | Yes | 24.12.0 | — |
| pdf-lib | PDF-01, PDF-02, PDF-07 | Yes (installed) | 1.17.1 | — |
| @pdf-lib/fontkit | PDF-07 | No — NOT installed | — | None; required for embedded fonts |
| @vercel/blob | PDF-04 | No — NOT installed | — | Skip storage, return null URL (DB fallback per PDF-04) |
| BLOB_READ_WRITE_TOKEN env | PDF-04 | Unknown (not in local .env.local) | — | Fallback: skip blob upload, log warning |
| Prisma / Neon | PDF-05 | Yes (deployed in Phase 1) | 5.22.0 | — |
| Liberation Serif TTF files | PDF-07 | No — not in repository | — | None; required for embedded font |

**Missing dependencies with no fallback:**
- `@pdf-lib/fontkit` — must be `npm install`ed before Wave 1 can start
- Liberation Serif (or equivalent) TTF files — must be committed to `src/assets/fonts/` before Wave 1 can start

**Missing dependencies with fallback:**
- `@vercel/blob` / `BLOB_READ_WRITE_TOKEN` — PDF-04 explicitly allows DB fallback; planner should implement the guard

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run src/lib/__tests__/generate-complaint-pdf.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PDF-01 | generateComplaintPdf() returns non-empty Uint8Array | unit | `npx vitest run src/lib/__tests__/generate-complaint-pdf.test.ts` | No — Wave 0 |
| PDF-02 | PDF bytes contain all 13 section markers (header text, "Re:", footer, etc.) | unit | same | No — Wave 0 |
| PDF-03 | Body copy differs between privacy_tracking, accessibility, video_sharing | unit | same | No — Wave 0 |
| PDF-04 | storeComplaintPdf() returns null when BLOB_READ_WRITE_TOKEN absent | unit | same | No — Wave 0 |
| PDF-05 | Filing.complaintPdfUrl is set after successful generation | integration | same | No — Wave 0 |
| PDF-06 | Zero prohibited strings in PDF bytes | unit | same | No — Wave 0 |
| PDF-07 | PDF does not contain "Times-Roman" or "Helvetica" font name strings | unit | same | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/__tests__/generate-complaint-pdf.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/generate-complaint-pdf.test.ts` — covers PDF-01 through PDF-07
- [ ] `src/assets/fonts/LiberationSerif-Regular.ttf` — required font asset (binary, committed to repo)
- [ ] `src/assets/fonts/LiberationSerif-Bold.ttf` — required font asset (binary, committed to repo)
- [ ] `npm install @pdf-lib/fontkit @vercel/blob` — must run before any code compiles

---

## Sources

### Primary (HIGH confidence)
- Official pdf-lib documentation at https://pdf-lib.js.org/ — fontkit registration pattern, embedFont with TTF bytes, save() → Uint8Array
- Vercel Blob SDK documentation at https://vercel.com/docs/storage/vercel-blob/using-blob-sdk — put() API, access parameter, BLOB_READ_WRITE_TOKEN default behavior, Buffer as body parameter
- Project codebase inspection — existing pdf-filler.ts, complaint-generator.ts, templates/, preview-pdf/route.ts, Prisma schema (all read directly)
- npm registry — @pdf-lib/fontkit 1.1.1, @vercel/blob 2.3.2 (verified 2026-04-01)

### Secondary (MEDIUM confidence)
- STATE.md accumulated context: "pdf-lib is already installed", "Single Uint8Array from pdf-lib.save() is source of truth", "Buffer.from(pdfBytes).toString('base64') for Resend attachment" — project-specific decisions already made
- Node.js path resolution behavior for Vercel serverless — `process.cwd()` stability is verified behavior for Next.js App Router server components

### Tertiary (LOW confidence)
- Liberation Serif as preferred font for government fax legibility — based on general knowledge of metric compatibility with Times New Roman; should be validated with a physical fax test before go-live

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified against npm registry; pdf-lib already installed
- Architecture: HIGH — patterns drawn from existing codebase code (not hypothetical)
- Pitfalls: HIGH — StandardFonts pitfall is directly observable in existing code; Vercel Blob access pitfall verified in official docs
- Font file path resolution: MEDIUM — behavior confirmed for Next.js dev; production serverless verified by documentation description

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (pdf-lib and @vercel/blob are stable; risk of breaking change is low)
