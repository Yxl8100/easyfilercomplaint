---
phase: 11-cppa-paper-complaint-pdf
fixed_at: 2026-05-03T20:45:00Z
review_path: .planning/phases/11-cppa-paper-complaint-pdf/11-REVIEW.md
iteration: 1
findings_in_scope: 9
fixed: 9
skipped: 0
status: all_fixed
---

# Phase 11: Code Review Fix Report

**Fixed at:** 2026-05-03T20:45:00Z
**Source review:** `.planning/phases/11-cppa-paper-complaint-pdf/11-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 9 (CR x2, WR x7)
- Fixed: 9
- Skipped: 0

All 206 tests pass after fixes.

## Fixed Issues

### CR-01: No error handler around `generateCPPAComplaintPdf` in route

**Files modified:** `src/app/api/filings/[id]/cppa-pdf/route.ts`
**Commit:** 9baee85
**Applied fix:** Wrapped `await generateCPPAComplaintPdf(filing)` in a try/catch block. On error, logs `[cppa-pdf] PDF generation failed:` and returns `NextResponse.json({ error: 'pdf_generation_failed' }, { status: 500 })`. The `pdfBytes` variable is declared with `let` before the try block so the blob upload and download response can use it after the successful path. Happy-path behavior (mock returns Uint8Array) is unchanged.

---

### CR-02: `q5SupportingMaterials` hardcodes tracking-specific claims for all categories

**Files modified:** `src/lib/cppa-complaint-generator.ts`
**Commit:** 32dd439
**Applied fix:** Replaced the hardcoded `q5` string with a `q5Map: Record<string, string>` that branches on `filing.category`. Entries for `accessibility` (screenshots of accessibility barriers) and `video_sharing`/`video-sharing` (records of unauthorized video sharing) are added. All other categories (privacy_tracking, data-privacy, etc.) fall through to the original cookie/tracking/screenshot default via `??`.

---

### WR-01: `readFileSync` called synchronously on every PDF generation request

**Files modified:** `src/lib/cppa-pdf-generator.ts`
**Commit:** 71a0706
**Applied fix:** Moved both `readFileSync` calls for `LiberationSerif-Regular.ttf` and `LiberationSerif-Bold.ttf` from inside `generateCPPAComplaintPdf` to module-level constants above `drawWrappedText`. The function body now uses the cached `regularBytes`/`boldBytes` constants with a comment indicating WR-01. The `readFileSync` import is retained (still needed at module level). Disk reads happen once at cold start instead of on every request.

---

### WR-02: `infoDict` null guard silently skips all PDF metadata

**Files modified:** `src/lib/cppa-pdf-generator.ts`
**Commit:** 71a0706
**Applied fix:** Replaced the `if (infoDict) { ... }` guard with an explicit `if (!infoDict) { throw new Error('[cppa-pdf] PDF Info dictionary not available — cannot set section markers') }`. The `infoDict.set(...)` calls are now unconditional (at function body indentation level), executed only after the guard confirms `infoDict` is non-null. This surfaces the failure immediately rather than silently producing a PDF with no Subject/Keywords/Description/Comments metadata.

---

### WR-03: `q2BusinessName` uses `filing.targetName` without null fallback

**Files modified:** `src/lib/cppa-complaint-generator.ts`
**Commit:** 32dd439
**Applied fix:** Added `const name = filing.targetName ?? 'Unknown Business'` before the `return` block. Both branches of the `q2BusinessName` ternary now use `name` instead of `filing.targetName` directly, preventing the literal string `"null"` from appearing in the sworn legal document.

---

### WR-04: `visitMonth: "0"` produces `"0 YYYY"` in complaint narrative

**Files modified:** `src/lib/cppa-complaint-generator.ts`
**Commit:** 32dd439
**Applied fix:** Added range validation in `buildVisitDate`: after computing `idx = parseInt(month, 10) - 1`, an `if (idx >= 0 && idx < MONTH_NAMES.length)` guard wraps the `return` statement. If `idx` is out of range (e.g., from `visitMonth: "0"` or `visitMonth: "13"`), execution falls through to the existing `if (year) return year` fallback, producing a year-only string instead of `"0 YYYY"` or `"undefined YYYY"`.

---

### WR-05: Static test reads source file with `process.cwd()` — fails outside project root

**Files modified:** `src/app/api/filings/[id]/cppa-pdf/route.test.ts`
**Commit:** cfef06d
**Applied fix:** Added `import { fileURLToPath } from "url"` as a static top-level import. In the UUID-only access test, replaced the `path.join(process.cwd(), 'src/app/api/filings/[id]/cppa-pdf/route.ts')` call with `fileURLToPath(new URL("./route.ts", import.meta.url))`. The `const path = await import('path')` dynamic import line was removed (no longer needed). The `const fs = await import('fs')` dynamic import is retained for `readFileSync`.

---

### WR-06: Missing `Content-Length` header on PDF download response

**Files modified:** `src/app/api/filings/[id]/cppa-pdf/route.ts`
**Commit:** 9baee85
**Applied fix:** Added `'Content-Length': String(pdfBytes.byteLength)` to the `NextResponse` headers object alongside the existing `Content-Type` and `Content-Disposition` headers. The value is computed from the known `Uint8Array.byteLength` at response construction time.

---

### WR-07: `q7ContactInfo` can be empty string if all filerInfo fields are absent

**Files modified:** `src/lib/cppa-complaint-generator.ts`
**Commit:** 32dd439
**Applied fix:** Added a guard immediately after the `.filter(Boolean).join('\n')` expression: `if (!q7Lines) { throw new Error('[cppa-complaint] filerInfo is missing required contact fields') }`. This surfaces the data integrity problem at generation time rather than producing a sworn complaint PDF with a blank Q7 section.

---

## Skipped Issues

None — all 9 in-scope findings were fixed.

---

_Fixed: 2026-05-03T20:45:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
