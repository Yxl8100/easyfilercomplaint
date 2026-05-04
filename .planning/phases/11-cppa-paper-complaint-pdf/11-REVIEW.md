---
phase: 11-cppa-paper-complaint-pdf
reviewed: 2026-05-03T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/lib/__tests__/cppa-pdf-generator.test.ts
  - src/app/api/filings/[id]/cppa-pdf/route.test.ts
  - src/lib/cppa-pdf-generator.ts
  - src/app/api/filings/[id]/cppa-pdf/route.ts
findings:
  critical: 2
  warning: 7
  info: 2
  total: 11
status: fixed
---

# Phase 11: Code Review Report

**Reviewed:** 2026-05-03T00:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Four files were reviewed: the CPPA PDF generator library, the CPPA complaint data builder (pulled in as a dependency during cross-reference), the API route, and both test files. The implementation is structurally sound — fonts are embedded, the UUID-only access model is correctly applied, and blob storage failure is correctly non-fatal. However two blockers were found: the route has no error boundary around PDF generation, and the `q5SupportingMaterials` text contains a category-specific false claim that ships for non-tracking complaint types. Seven warnings cover missing error handling, a null dereference path, synchronous I/O on every request, a fragile static-check test, an off-by-one on visitMonth "0", an empty Q7 contact section, and a missing Content-Length header.

---

## Critical Issues

### CR-01: No error handler around `generateCPPAComplaintPdf` in route — unhandled 500 leaks internals

**File:** `src/app/api/filings/[id]/cppa-pdf/route.ts:38`
**Issue:** `generateCPPAComplaintPdf(filing)` is awaited with no try/catch. If pdf-lib throws (corrupt font bytes, out-of-memory, unexpected null in filing fields), the exception propagates uncaught to Next.js, which renders a generic 500 HTML error page with a stack trace in development, and returns an unstructured 500 in production. The caller receives neither a PDF nor a machine-readable error JSON.
**Fix:**
```ts
let pdfBytes: Uint8Array
try {
  pdfBytes = await generateCPPAComplaintPdf(filing)
} catch (err) {
  console.error('[cppa-pdf] PDF generation failed:', err)
  return NextResponse.json({ error: 'pdf_generation_failed' }, { status: 500 })
}
```
Apply this wrapping before the blob-upload block. The rest of the function already uses the correct pattern (blob failure is caught and non-fatal); PDF generation must be treated the same way.

---

### CR-02: `q5SupportingMaterials` hardcodes tracking-specific claims for all complaint categories

**File:** `src/lib/cppa-complaint-generator.ts:125`
**Issue:** Q5 always outputs:
> "I have a screenshot of the website's tracking activity, a record of cookies placed on my device, and a filing receipt..."

For `accessibility` complaints there is no "tracking activity" or "cookies"; for `video_sharing` complaints cookies are not relevant. A consumer who submits this PDF to the CPPA would be asserting possession of evidence they may not have, and the claim is factually mismatched to the complaint type. This is a correctness defect in a sworn legal document.

**Fix:** Branch on `filing.category` the same way `buildDescription` does:
```ts
const q5Map: Record<string, string> = {
  accessibility:
    `I have screenshots documenting the accessibility barriers I encountered and a filing receipt from EasyFilerComplaint (Filing ID: ${receiptId}).`,
  video_sharing:
    `I have records documenting the unauthorized sharing of my video content and a filing receipt from EasyFilerComplaint (Filing ID: ${receiptId}).`,
  'video-sharing':
    `I have records documenting the unauthorized sharing of my video content and a filing receipt from EasyFilerComplaint (Filing ID: ${receiptId}).`,
}
const q5 = q5Map[filing.category]
  ?? `I have a screenshot of the website's tracking activity, a record of cookies placed on my device, and a filing receipt from EasyFilerComplaint (Filing ID: ${receiptId}).`
```

---

## Warnings

### WR-01: `readFileSync` called synchronously on every PDF generation request — blocks event loop

**File:** `src/lib/cppa-pdf-generator.ts:78-79`
**Issue:** Both `LiberationSerif-Regular.ttf` and `LiberationSerif-Bold.ttf` are loaded via synchronous `readFileSync` inside the exported async function. This executes on the hot path of every request, blocking the Node.js event loop for the duration of the disk read. Under concurrent load, all other requests are stalled while fonts are read from disk.

**Fix:** Cache the font bytes at module load time as module-level constants:
```ts
const regularBytes = readFileSync(join(process.cwd(), 'src/assets/fonts/LiberationSerif-Regular.ttf'))
const boldBytes    = readFileSync(join(process.cwd(), 'src/assets/fonts/LiberationSerif-Bold.ttf'))

export async function generateCPPAComplaintPdf(filing: Filing): Promise<Uint8Array> {
  // Use cached regularBytes / boldBytes — no readFileSync here
  ...
}
```
Module-level `readFileSync` runs once at cold start, which is the correct trade-off for static assets.

---

### WR-02: `infoDict` null guard silently skips all metadata — test assertions become unreliable

**File:** `src/lib/cppa-pdf-generator.ts:101-114`
**Issue:** `pdfDoc.context.lookup(pdfDoc.context.trailerInfo.Info, PDFDict)` returns `undefined` if the PDF context has no Info dict (which can happen depending on pdf-lib version or document state). When `infoDict` is falsy the entire block is skipped — no Subject, Keywords, Description, or Comments are set. The test assertions in CPPDF-01 and CPPDF-02 that rely on finding section markers and the filing ID in the Info dict would silently pass the document check but miss the content. The failure would only surface as wrong user-facing PDF content, not a test failure (tests would find nothing and `not.toContain` passes vacuously for some checks).

More importantly: if this fails silently in production, the perjury attestation text (`Comments` field) is absent from the PDF's machine-readable metadata.

**Fix:** Assert that the Info dict was found and throw explicitly if not:
```ts
const infoDict = pdfDoc.context.lookup(pdfDoc.context.trailerInfo.Info, PDFDict)
if (!infoDict) {
  throw new Error('[cppa-pdf] PDF Info dictionary not available — cannot set section markers')
}
infoDict.set(...)
```
Or use pdf-lib's `setSubject`/`setKeywords` APIs if the version supports them, avoiding direct context manipulation.

---

### WR-03: `q2BusinessName` passes `filing.targetName` without a null fallback

**File:** `src/lib/cppa-complaint-generator.ts:140-142`
**Issue:** `filing.targetName` is used directly in the ternary:
```ts
q2BusinessName: filing.targetUrl
  ? `${filing.targetName} (${filing.targetUrl})`
  : filing.targetName,
```
The Prisma schema column is `String` (non-nullable), but at runtime — especially given the `as unknown as Filing` cast used in tests and any filing created through API paths without strict validation — `targetName` could be `null`. This produces the literal string `"null (https://...)"` or `null` as the drawn text, neither of which is valid content in a sworn legal document.

**Fix:**
```ts
const name = filing.targetName ?? 'Unknown Business'
q2BusinessName: filing.targetUrl
  ? `${name} (${filing.targetUrl})`
  : name,
```

---

### WR-04: `visitMonth: "0"` produces "0 YYYY" in complaint narrative

**File:** `src/lib/cppa-complaint-generator.ts:52`
**Issue:** In `buildVisitDate`, the month index is computed as `parseInt(month, 10) - 1`. If `visitMonth` is `"0"` (zero-based input or data entry error), `idx = -1` and `MONTH_NAMES[-1]` is `undefined` in JavaScript. The `?? month` fallback then substitutes the raw string `"0"`, yielding `"0 2026"` in the narrative of a sworn legal document.

**Fix:** Add a validation step:
```ts
const idx = parseInt(month, 10) - 1
if (idx >= 0 && idx < MONTH_NAMES.length) {
  return `${MONTH_NAMES[idx]} ${year}`
}
// Invalid month — fall through to year-only fallback
```

---

### WR-05: Static test reads source file with `process.cwd()` — fails when CWD is not project root

**File:** `src/app/api/filings/[id]/cppa-pdf/route.test.ts:130-136`
**Issue:** The `CPPDF-03: UUID-only access` test calls `fs.readFileSync(path.join(process.cwd(), 'src/app/api/filings/[id]/cppa-pdf/route.ts'))`. If the test runner is invoked from any directory other than the project root (e.g., a CI runner with a non-standard workdir, or Vitest with a different `root`), this throws `ENOENT` rather than failing with a readable assertion error. The test also reads source at test-runtime, which is brittle — a rename or relocation of the route file silently breaks the test.

**Fix:** Use `import.meta.url` with `URL`-based path resolution, which is CWD-independent:
```ts
import { fileURLToPath } from 'url'
const routeSrc = readFileSync(
  fileURLToPath(new URL('./route.ts', import.meta.url)),
  'utf8'
)
```
Alternatively, assert the absence of the `auth` import via a Vitest module graph inspection rather than string-matching source code.

---

### WR-06: Missing `Content-Length` header on PDF download response

**File:** `src/app/api/filings/[id]/cppa-pdf/route.ts:64-69`
**Issue:** The `NextResponse` for the PDF download does not set `Content-Length`. Since `pdfBytes` is a `Uint8Array` of known size at this point, omitting the header means:
- Browsers cannot show a progress indicator for the download.
- Proxies and CDNs cannot detect a truncated response.
- Some older HTTP/1.1 clients will not know when the response body ends without connection close.

**Fix:**
```ts
return new NextResponse(pdfBytes, {
  headers: {
    'Content-Type': 'application/pdf',
    'Content-Length': String(pdfBytes.byteLength),
    'Content-Disposition': `attachment; filename="CPPA_Complaint_${downloadId}.pdf"`,
  },
})
```

---

### WR-07: `q7ContactInfo` can be empty string if all filerInfo fields are absent

**File:** `src/lib/cppa-complaint-generator.ts:128-136`
**Issue:** `filerInfo` is cast from `filing.filerInfo` which is `Prisma.JsonValue | null`. The fallback `?? {}` handles the null case, but if the JSON object exists and all expected string keys (`firstName`, `lastName`, `email`, `phone`, `address`) are absent or empty, every element of the array passed to `.filter(Boolean)` is falsy, and `.join('\n')` produces `""`. Section Q7 of the sworn complaint then renders blank content.

This is not guarded against in the PDF generator or the route, and the test mock always supplies a complete `filerInfo`. The condition can occur in real filings if the filer info was stored incompletely.

**Fix:** After assembling `q7Lines`, add a guard:
```ts
const q7Lines = [...].filter(Boolean).join('\n')
if (!q7Lines) {
  throw new Error('[cppa-complaint] filerInfo is missing required contact fields')
}
```
This surfaces the data integrity problem at generation time rather than producing a defective legal document.

---

## Info

### IN-01: `drawWrappedText` is duplicated verbatim from `generate-complaint-pdf.ts`

**File:** `src/lib/cppa-pdf-generator.ts:23`
**Issue:** The comment explicitly states "Copied verbatim from src/lib/generate-complaint-pdf.ts lines 63-114." The function is 52 lines of non-trivial word-wrap logic. Any bug fix or behavioral change must be applied to both files independently.

**Fix:** Extract `drawWrappedText` to a shared utility module (e.g., `src/lib/pdf-utils.ts`) and import from both `generate-complaint-pdf.ts` and `cppa-pdf-generator.ts`.

---

### IN-02: Magic number `50000` in test stream size filter has no named constant

**File:** `src/lib/__tests__/cppa-pdf-generator.test.ts:58`
**Issue:** `if (chunk.length > 50000)` uses an undocumented magic number to distinguish font streams from content streams. The comment explains the intent but a named constant would make the threshold self-documenting and easier to adjust.

**Fix:**
```ts
const MAX_CONTENT_STREAM_BYTES = 50_000 // font streams are typically 100KB+
if (chunk.length > MAX_CONTENT_STREAM_BYTES) {
```

---

_Reviewed: 2026-05-03T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
