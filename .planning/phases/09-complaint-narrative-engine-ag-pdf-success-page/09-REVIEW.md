---
phase: 09-complaint-narrative-engine-ag-pdf-success-page
reviewed: 2026-05-03T22:02:51Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/lib/cppa-complaint-generator.ts
  - src/lib/generate-complaint-pdf.ts
  - src/app/filing/[id]/success/page.tsx
  - src/lib/__tests__/cppa-complaint-generator.test.ts
  - src/lib/__tests__/generate-complaint-pdf.test.ts
  - src/app/filing/[id]/success/page.test.tsx
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 9: Code Review Report

**Reviewed:** 2026-05-03T22:02:51Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Six files were reviewed covering the complaint narrative engine (`cppa-complaint-generator.ts`), AG PDF generation (`generate-complaint-pdf.ts`), the success page (`page.tsx`), and their corresponding test suites.

The core logic is well-structured. No security vulnerabilities or data-loss risks were found. The main concerns are: (1) a MONTH_NAMES array bounds issue that silently produces `undefined` when given a malformed month value, (2) the success page displaying the raw `faxStatus` DB string directly to users rather than the normalized human-readable label, (3) a `toFilingData` helper that is exported and constructed but never used by any code path in the reviewed files (dead code), and (4) missing `description` null-safety in `toFilingData` that could propagate `null` into a field typed as `string`.

## Warnings

### WR-01: MONTH_NAMES array out-of-bounds produces silent `undefined` in narrative

**File:** `src/lib/cppa-complaint-generator.ts:52`

**Issue:** `buildVisitDate` parses `visitMonth` with `parseInt(month, 10) - 1` and then indexes `MONTH_NAMES[idx]`. The nullish fallback (`?? month`) only activates when the computed index is `undefined` (i.e., out of range). However `parseInt('0', 10) - 1 = -1`, giving `MONTH_NAMES[-1]` which is `undefined` in JavaScript — the fallback fires, emitting the raw string `"0"` into the narrative rather than a month name. Any input that results in an index of -1 (month value `"0"`) or >= 12 (month value `"13"` etc.) silently degrades the copy without any logging or validation error.

**Fix:**
```typescript
function buildVisitDate(categoryFields: Record<string, unknown>): string {
  const month = categoryFields?.visitMonth as string | undefined
  const year  = categoryFields?.visitYear  as string | undefined
  if (month && year) {
    const idx = parseInt(month, 10) - 1
    const monthName = (idx >= 0 && idx < MONTH_NAMES.length) ? MONTH_NAMES[idx] : undefined
    if (!monthName) {
      console.warn(`[cppa-complaint-generator] Invalid visitMonth value: ${month}`)
      return year
    }
    return `${monthName} ${year}`
  }
  if (year) return year
  return 'a recent date'
}
```

---

### WR-02: Success page renders raw DB `faxStatus` string to users instead of normalized label

**File:** `src/app/filing/[id]/success/page.tsx:185`

**Issue:** Line 185 renders `{filing.faxStatus ?? faxDisplay.label}`. When `filing.faxStatus` is a non-null DB string (e.g., `"partialsuccess"`, `"failure"`, any future enum value), the raw DB value is shown to users verbatim — bypassing `getFaxStatusDisplay` entirely. The `faxDisplay.label` fallback is only reached when `faxStatus` is `null`. This means a user with a `partialsuccess` fax will see `"partialsuccess"` on screen rather than `"Delivery Failed"`, and a `failure` status renders as `"failure"` rather than the styled label.

**Fix:**
```tsx
<span className={`font-mono text-[11px] uppercase tracking-[0.1em] ${faxDisplay.colorClass}`}>
  {faxDisplay.label}
</span>
```
The `getFaxStatusDisplay` function already computes the correct label for all known statuses; use it exclusively.

---

### WR-03: `toFilingData` constructs an object but is dead code in the reviewed scope

**File:** `src/lib/generate-complaint-pdf.ts:32-60`

**Issue:** `toFilingData` is defined, exported (line 314), and imported `FilingData` from `filing-state`, but `generateComplaintPdf` never calls it — the function only uses `generateCPPAComplaint(filing)` for the complaint text. The `toFilingData` conversion output is fully unused in this file. An exported function that is never called internally suggests either (a) it is a dead remnant of a refactor, or (b) it is intended for callers that have not yet been written, which means no test coverage exists for its output shape. If it is truly orphaned, it should be removed to reduce maintenance surface.

**Fix:** Audit callers with `grep -r "toFilingData" src/`. If no external callers exist, remove the function and the `FilingData` import. If it is genuinely needed for backward compatibility, add a comment explaining which caller depends on it.

---

### WR-04: `toFilingData` passes `filing.description` as-is — can be `null` but `FilingData.description` is typed `string`

**File:** `src/lib/generate-complaint-pdf.ts:43`

**Issue:** `Filing.description` is a nullable Prisma field (`string | null`). `FilingData.description` is typed `string` (non-nullable, per `filing-state.ts` line 18). The assignment `description: filing.description` on line 43 therefore violates the type contract — TypeScript will flag this as an error if strict null checks are enabled, and at runtime passing `null` downstream could produce `"null"` strings or throw. This is a companion bug to WR-03; if `toFilingData` is kept, the null must be handled.

**Fix:**
```typescript
description: filing.description ?? '',
```

---

## Info

### IN-01: Duplicate test ID `CPTXT-05` on two distinct test cases

**File:** `src/lib/__tests__/cppa-complaint-generator.test.ts:115`

**Issue:** Lines 110 and 115 both use the label `'CPTXT-05: ...'`. These test distinct behaviors (URL present vs. URL null). Duplicate test IDs make traceability to spec requirements ambiguous and can confuse test-result reporting.

**Fix:** Rename the second case to `CPTXT-06`:
```typescript
it('CPTXT-06: q2BusinessName is just targetName when targetUrl is null', () => {
```

---

### IN-02: `drawSectionHeader` does not account for new-page `y` reset before underline

**File:** `src/lib/generate-complaint-pdf.ts:172-187`

**Issue:** `drawSectionHeader` draws the section title, then immediately draws a horizontal rule at the current `y` position without checking if a page break just occurred between the title draw and the rule draw. In practice the rule is drawn 17 pts below the title on the same page, so this is not a crash — but if a future change increases font size or spacing, the rule could land on a new page while the title remains on the old page. The existing `drawLine` helper and `drawWrappedText` both check for page overflow before drawing; `drawSectionHeader` does not.

**Fix:** Apply the same `y < margin + size + 4` guard used in `drawLine` before drawing the separator rule.

---

### IN-03: `extractPdfText` in test file uses an infinite `while(true)` loop without a hard upper-bound guard

**File:** `src/lib/__tests__/generate-complaint-pdf.test.ts:45`

**Issue:** The `while (true)` loop in `extractPdfText` advances `idx` on each iteration via `idx = endPos + 9` (or `idx = streamPos + 1` in the continue branch). If a PDF byte sequence produces a `streamPos` that never advances (e.g., a degenerate stream marker where `endPos < dataStart`), the loop could stall. This is a test-reliability concern, not a production bug.

**Fix:**
```typescript
// Replace: while (true) {
let iterations = 0
while (idx < buf.length && iterations++ < 10000) {
```

---

_Reviewed: 2026-05-03T22:02:51Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
