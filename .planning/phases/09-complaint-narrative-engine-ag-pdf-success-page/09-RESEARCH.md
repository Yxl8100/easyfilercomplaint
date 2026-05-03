# Phase 9: Complaint Narrative Engine + AG PDF + Success Page — Research

**Researched:** 2026-05-03
**Domain:** TypeScript narrative generation, pdf-lib form-style PDF layout, Next.js server component, Prisma select
**Confidence:** HIGH

---

## Summary

Phase 9 has three tightly-coupled deliverables that all touch the same complaint narrative layer. The primary new artifact is `src/lib/cppa-complaint-generator.ts`, which generates a `CPPAComplaint` object (all 7 CPPA form question answers). The same natural-language description produced by that generator replaces the body of the CA AG complaint PDF (restructured from legal-letter to form-style). The success page is then rewritten to surface all three channels: CPPA Online, CPPA Paper PDF, and CA AG auto-filed — with ADA filings showing only the CA AG channel.

All three deliverables are pure TypeScript/TSX — no new dependencies are required. The existing `generateComplaintPdf` / `drawWrappedText` / font-loading infrastructure is reused. The visit date extraction logic in `complaint-generator.ts` (`buildVisitDate`) is the canonical pattern to port into the new generator.

The main implementation risks are: (1) the 2000-character limit on the CPPA description narrative requiring a measured template that leaves room for the user's free-text, (2) the `categoryFields` JSON containing `visitMonth`/`visitYear` as strings that must be read through the `filing.categoryFields` JSON field (not top-level schema fields), and (3) the existing `generate-complaint-pdf.test.ts` asserting `'Respectfully submitted'` and `'Re:'` as required markers — those assertions must be updated because Phase 9 removes those sections from the AG PDF.

**Primary recommendation:** Write `cppa-complaint-generator.ts` first as a standalone module, then thread its output through the restructured `generateComplaintPdf`, then rewrite the success page last. Keep each deliverable in its own git commit so the plan-checker can verify independently.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CPPA narrative generation | API / Backend (lib) | — | Pure data transformation over `Filing` model; runs server-side only |
| CA AG PDF generation | API / Backend (lib) | — | Requires fs/readFileSync for font loading; cannot run in browser |
| Visit date extraction | API / Backend (lib) | — | Reads `categoryFields` JSON; always server-side |
| Success page rendering | Frontend Server (SSR) | — | Server component with Prisma select; no client-side fetch needed |
| Fax status display | Frontend Server (SSR) | — | `faxId`/`faxStatus` read from DB at render time; polling is a separate concern |

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CPTXT-01 | `generateCPPAComplaint(filing: Filing): CPPAComplaint` returns all 7 CPPA form question answers | New module `src/lib/cppa-complaint-generator.ts`; interface defined below |
| CPTXT-02 | Complaint description is natural first-person narrative, no statute citations, ≤2000 chars | Template-based generation with char-budget approach; no `§` or `Civil Code` strings |
| CPTXT-03 | Visit date formatted as "Month YYYY" (e.g., "March 2026"), never "N/A" or numeric codes | Port `buildVisitDate` from `complaint-generator.ts`; reads `categoryFields.visitMonth/Year` |
| CPTXT-04 | User's free-text description integrated naturally (not orphaned "Specifically, I observed:") | Inline interpolation pattern: "…{description}. I was not given…" |
| CPTXT-05 | Business name field: "{targetName} ({targetUrl})" or just "{targetName}" if no URL | Ternary on `filing.targetUrl` |
| AGPDF-01 | Form-style layout with 6 named sections (Your Information, Business Information, Complaint, Resolution Requested, Prior Contact, Affirmation) | Restructure `generateComplaintPdf` using existing `drawWrappedText` + new `drawSectionHeader` helper |
| AGPDF-02 | Zero statute citations; no "Dear Attorney General" salutation; no "Respectfully submitted" closing | Remove those sections; use form-section structure |
| AGPDF-03 | Empty fields omitted entirely — no "N/A" placeholder text | Conditional rendering per field; existing `__OMIT__` sentinel pattern reusable |
| AGPDF-04 | Sinch fax pipeline unchanged — same delivery mechanism, only PDF content changes | `generateComplaintPdf` signature and output type unchanged; pipeline calls it identically |
| DESC-01 | Natural first-person language; user free-text integrated contextually | Template design detail — covered by CPTXT-04 implementation |
| DESC-02 | Description ≤2000 characters; visit date as "Month YYYY" | CPTXT-02 + CPTXT-03 enforcement |
| DESC-03 | Complaint types → CPPA checkboxes correctly: privacy_tracking→2, video_sharing→1, accessibility→none | `CATEGORY_TO_CPPA_CHECKBOXES` map in generator |
| SUCC-01 | Success page shows 3 channel sections: CPPA Online (★ recommended), CPPA Paper PDF, CA AG (auto-filed) | Rewrite `src/app/filing/[id]/success/page.tsx` |
| SUCC-02 | CPPA section → `/filing/[id]/cppa-guide`; Paper PDF → `/api/filings/[id]/cppa-pdf` | Hardcoded relative links using `filing.id` |
| SUCC-03 | CA AG section shows fax ID and status; handles failure/pending state | Prisma select adds `faxId`, `faxStatus`; conditional rendering |
| SUCC-04 | Guest users see "Create Account" CTA at bottom | Already exists; preserve in rewrite |
| ADA-01 | ADA/accessibility complaint type hides CPPA channel (both guide + paper PDF sections) | `filing.category === 'accessibility'` conditional |
</phase_requirements>

---

## Standard Stack

### Core (all already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pdf-lib | 1.17.1 | PDF generation | Already used in `generate-complaint-pdf.ts` [VERIFIED: package.json] |
| @pdf-lib/fontkit | 1.1.1 | Embedded font support | Already installed; required for fax-compatible font rendering [VERIFIED: package.json] |
| @prisma/client | 5.22.0 | Database access | Project standard; `Filing` model is the input to all generators [VERIFIED: package.json] |
| vitest | 4.1.2 | Test framework | Project standard; config at `vitest.config.ts` [VERIFIED: package.json, vitest.config.ts] |

### No New Dependencies Required

All Phase 9 work is TypeScript authoring over existing infrastructure. No `npm install` needed.

---

## Architecture Patterns

### System Architecture Diagram

```
Filing record (Prisma)
         │
         ├─► cppa-complaint-generator.ts
         │        ├── buildVisitDate(categoryFields)
         │        ├── buildDescription(filing, visitDate)  ≤2000 chars, no §
         │        └── returns CPPAComplaint { q1..q7 }
         │                    │
         │                    └─► success/page.tsx (Q4 display)
         │                    └─► cppa-guide/page.tsx (Phase 10)
         │
         ├─► generate-complaint-pdf.ts  (restructured)
         │        ├── generateCPPAComplaint(filing).q4   ← shared description
         │        ├── drawSectionHeader("YOUR INFORMATION")
         │        ├── drawLabelValue("Name", filerInfo.firstName + …)
         │        ├── drawLabelValue("Email", filerInfo.email)
         │        └── returns Uint8Array  → sinch-fax pipeline (unchanged)
         │
         └─► success/page.tsx
                  ├── Prisma select adds: faxId, faxStatus, category
                  ├── isADA = filing.category === 'accessibility'
                  ├── [!isADA] Section 1: CPPA Online → /filing/[id]/cppa-guide
                  ├── [!isADA] Section 2: CPPA Paper PDF → /api/filings/[id]/cppa-pdf
                  └── Section 3: CA AG auto-filed (faxId + faxStatus)
```

### Recommended Project Structure

No new directories needed. New/modified files:

```
src/
├── lib/
│   ├── cppa-complaint-generator.ts   ← NEW (Phase 9 primary deliverable)
│   ├── generate-complaint-pdf.ts     ← MODIFIED (form-style restructure)
│   └── __tests__/
│       ├── cppa-complaint-generator.test.ts  ← NEW
│       └── generate-complaint-pdf.test.ts    ← MODIFIED (update broken assertions)
└── app/
    └── filing/
        └── [id]/
            └── success/
                ├── page.tsx          ← MODIFIED (3-channel redesign)
                └── page.test.tsx     ← MODIFIED (update for new structure)
```

### Pattern 1: CPPAComplaint Interface

```typescript
// Source: strategy document + REQUIREMENTS.md CPTXT-01 to CPTXT-05

export interface CPPAComplaint {
  /** Q1: Checkbox instructions (visual only — no copy-paste box on guide page) */
  q1CheckboxInstructions: string[]   // e.g. ["collection/use/storage/sharing", "Right to Opt-out"]

  /** Q2: Business name for copy-paste */
  q2BusinessName: string             // "{targetName} ({targetUrl})" or "{targetName}"

  /** Q3: California resident (instruction only) */
  q3CaliforniaResident: 'Yes'

  /** Q4: Complaint description — the core narrative, ≤2000 chars, no statute citations */
  q4Description: string

  /** Q5: Supporting materials for copy-paste */
  q5SupportingMaterials: string

  /** Q6: Contacted business (instruction only) */
  q6ContactedBusiness: 'No / Not applicable'

  /** Q7: Contact information for copy-paste */
  q7ContactInfo: string
}
```

**Why this shape:**
- Q1, Q3, Q6 are "instructions only" fields — guide page (Phase 10) shows them visually without a copy box per CPGDE-05. Research confirms they still belong in the interface for Phase 10 consumption [CITED: REQUIREMENTS.md CPGDE-05]
- Q5 is a fixed string with `{filingReceiptId}` interpolated [CITED: strategy document]
- Q7 is name + email + phone + address for copy-paste [CITED: strategy document]

### Pattern 2: generateCPPAComplaint Logic (All 7 Questions)

```typescript
// Source: strategy document, codebase analysis
// [VERIFIED: complaint-generator.ts, categories.ts]

const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']

function buildVisitDate(categoryFields: Record<string, unknown>): string {
  // Port directly from complaint-generator.ts buildVisitDate()
  const month = categoryFields?.visitMonth as string | undefined
  const year = categoryFields?.visitYear as string | undefined
  if (month && year) {
    const idx = parseInt(month, 10) - 1
    return `${MONTH_NAMES[idx] ?? month} ${year}`
  }
  if (year) return year
  return 'a recent date'     // fallback — never "N/A"
}

// Category → CPPA checkbox strings (DESC-03)
const CATEGORY_TO_CPPA_CHECKBOXES: Record<string, string[]> = {
  privacy_tracking: ['collection/use/storage/sharing', 'Right to Opt-out of Sale/Sharing'],
  video_sharing:    ['collection/use/storage/sharing'],
  accessibility:    [],   // ADA: no CPPA channel
}

// Q2: business name (CPTXT-05)
function buildBusinessName(filing: Filing): string {
  return filing.targetUrl
    ? `${filing.targetName} (${filing.targetUrl})`
    : filing.targetName
}

// Q4: core narrative (CPTXT-02, CPTXT-04, DESC-01)
function buildDescription(filing: Filing, visitDate: string): string {
  const base = `On or about ${visitDate}, I visited the website ${filing.targetUrl || filing.targetName}.` +
    ` During my visit, I discovered that the website was collecting my personal information —` +
    ` including my browsing activity, device information, and IP address —` +
    ` and sharing it with third-party advertising companies without my knowledge or consent.`

  // Integrate user free-text contextually if present (CPTXT-04)
  const userText = filing.description?.trim()
  const middle = userText
    ? ` ${userText}.`
    : ` The website placed tracking cookies on my device and transmitted my data to advertising networks.`

  const closing = ` I was not given a clear opportunity to opt out of this data collection before it occurred,` +
    ` and the website did not display an adequate privacy notice or "Do Not Sell My Personal Information" link.` +
    ` I am filing this complaint because I believe these practices violate my rights as a California consumer.`

  return (base + middle + closing).slice(0, 2000)   // hard cap (DESC-02)
}
```

**Character budget analysis (CPTXT-02):**
- Fixed opening clause: ~230 chars
- Fixed middle fallback: ~115 chars
- Fixed closing: ~220 chars
- Total fixed: ~565 chars
- User description budget remaining: ~1435 chars (generous; most user descriptions are 50-300 chars)
- Safest approach: build full string, then `.slice(0, 2000)` — no truncation mid-word concern since the closing is appended after user text [ASSUMED — exact count needs verification by running sample]

**Q5 fixed string:**
```
"I have a screenshot of the website's tracking activity, a record of cookies placed on
 my device, and a filing receipt from EasyFilerComplaint (Filing ID: {filingReceiptId})."
```
[CITED: strategy document]

**Q7 contact info block:**
```
{firstName} {lastName}
{email}
{phone}
{address}, {city}, {state} {zip}
```
Phone and address: omit line if blank (same `__OMIT__` sentinel approach as complaint-generator.ts).

### Pattern 3: CA AG PDF Form-Style Sections (AGPDF-01 through AGPDF-03)

The restructured `generateComplaintPdf` replaces the 13-section letter format with 6 named form sections. The `drawWrappedText` helper and font-loading code are unchanged.

**New section structure:**

```
CALIFORNIA ATTORNEY GENERAL — CONSUMER COMPLAINT FORM
[EasyFilerComplaint . {date}]
─────────────────────────────────────────────

YOUR INFORMATION
Name: {firstName} {lastName}
Address: {address}
City, State, Zip: {city}, {state} {zip}
Email: {email}
Phone: {phone}           ← omit entirely if blank
County: {county}         ← omit entirely if blank

BUSINESS INFORMATION
Company: {targetName}
Website: {targetUrl}     ← omit entirely if blank
Address: {targetAddress} ← omit entirely if blank

COMPLAINT
{cppaComplaint.q4 — same natural-language description as CPPA Q4}

RESOLUTION REQUESTED
I respectfully request that the California Attorney General investigate this matter
and take appropriate enforcement action to protect California consumer rights.

PRIOR CONTACT
[Only rendered if filing.priorContact === true]
I previously contacted {targetName} regarding this issue. {priorContactDetails}

AFFIRMATION
I affirm that the foregoing information is true and accurate to the best of my knowledge.

─────────────────────────────────────────────
EasyFilerComplaint . easyfilercomplaint.com . Filing ID: {filingReceiptId}
```

**Implementation approach:**

Add a `drawSectionHeader` helper alongside the existing `drawLine` closure:

```typescript
// Source: codebase analysis of existing drawLine pattern in generate-complaint-pdf.ts
const drawSectionHeader = (title: string) => {
  y -= 8
  if (y < margin + fontSize + 4) { page = pdfDoc.addPage([612, 792]); y = height - margin }
  page.drawText(title, { x: margin, y, font: boldFont, size: 11, color: black })
  y -= 11 + 4
  // thin rule under header
  page.drawLine({ start: { x: margin, y }, end: { x: 612 - margin, y }, thickness: 0.5, color: gray })
  y -= 8
}

const drawLabelValue = (label: string, value: string | null | undefined) => {
  if (!value?.trim()) return   // AGPDF-03: omit empty fields entirely
  drawLine(`${label}: ${value}`, font, fontSize, black)
}
```

**Critical note on AGPDF-02:** The `generate-complaint-pdf.test.ts` currently asserts `expect(text).toContain('Respectfully submitted')` and `expect(text).toContain('Re:')` as PDF-02 markers. These assertions will **break** after Phase 9 restructures the PDF. Those tests must be updated in the same plan wave as the PDF restructure. The new assertions should check for the 6 section header strings instead.

**AGPDF-04 — Sinch pipeline unchanged:** The `generateComplaintPdf(filing, filerInfo): Promise<Uint8Array>` signature is unchanged. The pipeline (`filing-pipeline.ts`) calls it as `await generateComplaintPdf(filing, filerInfo)` and passes the result directly to `sendFax`. No pipeline changes needed. [VERIFIED: src/lib/filing-pipeline.ts lines 24-46]

### Pattern 4: Success Page Prisma Select Extension

Current select:
```typescript
select: {
  id, filingReceiptId, targetName, category, status,
  paymentAmount, paidAt, complaintPdfUrl, userId
}
```

Required additions for Phase 9 (SUCC-03, ADA-01):
```typescript
select: {
  id: true,
  filingReceiptId: true,
  targetName: true,
  category: true,           // already present — needed for ADA conditional
  status: true,
  paymentAmount: true,
  paidAt: true,
  complaintPdfUrl: true,
  userId: true,
  faxId: true,              // NEW — SUCC-03
  faxStatus: true,          // NEW — SUCC-03
}
```

Both `faxId` (String?) and `faxStatus` (String?) are already in the Prisma `Filing` model. [VERIFIED: prisma/schema.prisma lines 131-132]

### Pattern 5: Success Page Three-Channel Layout

```tsx
// Source: strategy document + SUCC-01 to SUCC-04, ADA-01

const isADA = filing.category === 'accessibility'

{/* STEP 1: CPPA Online — hidden for ADA */}
{!isADA && (
  <div className="...">
    <p className="...">★ STEP 1: File with CPPA <span>(Recommended)</span></p>
    <a href={`/filing/${filing.id}/cppa-guide`}>File Now — Step-by-Step Guide →</a>
  </div>
)}

{/* STEP 2: CPPA Paper PDF — hidden for ADA */}
{!isADA && (
  <div className="...">
    <p>STEP 2: Download Paper Complaint (Mail)</p>
    <a href={`/api/filings/${filing.id}/cppa-pdf`}>Download CPPA Complaint PDF</a>
  </div>
)}

{/* STEP 3: CA AG Auto-Filed — always shown */}
<div className="...">
  <p>STEP {isADA ? '1' : '3'}: Attorney General (Auto-Filed) ✓</p>
  {filing.faxId && <p>Fax ID: {filing.faxId}</p>}
  <p>Status: {filing.faxStatus ?? 'Pending'}</p>
  {filing.complaintPdfUrl && (
    <a href={`/api/filings/${filing.id}/pdf`}>Download Your Complaint PDF</a>
  )}
</div>
```

**Step number for ADA:** When `isADA`, CA AG becomes "STEP 1" (only channel). Non-ADA: "STEP 3". The strategy document shows "STEP 3" for the three-channel case; for ADA it should read "STEP 1" to avoid confusing gap (no steps 1 and 2 shown). [ASSUMED — the strategy doc doesn't explicitly state the ADA step numbering; this is a reasonable convention]

**Fax status display states (SUCC-03):**
- `faxStatus: 'success'` — show "Delivered" badge
- `faxStatus: 'failure'` — show "Delivery Failed" with explanation
- `faxStatus: 'queued'` / `'inprogress'` — show "Pending"
- `faxStatus: null` — show "Pending" (not yet sent)

Sinch normalizes to lowercase status strings: `queued`, `inprogress`, `success`, `failure`, `partialsuccess`. [VERIFIED: src/lib/sinch-fax.ts normalizeSinchStatus function]

### Anti-Patterns to Avoid

- **Orphaned description sentence:** The old ca_ag template used `{{#if description}}Specifically, I observed: {{description}}{{/if}}` — this produces an unnatural fragment. Phase 9 must integrate the user text mid-narrative instead.
- **Statute citations in CPPA narrative:** Any reference to `§1798`, `Civil Code`, `Penal Code 631`, or `42 U.S.C.` violates CPTXT-02. The generator must never include legal citation strings.
- **N/A placeholders in AG PDF:** The existing `complaint-generator.ts` uses `'N/A'` as a fallback for `targetUrl`, `county`, etc. The new AG PDF must use the `__OMIT__` sentinel approach (or conditional rendering) rather than writing "N/A" to the PDF.
- **`visitMonth`/`visitYear` as top-level Filing fields:** These are NOT in the Prisma schema. They live inside `filing.categoryFields` as JSON. Always read them as `(filing.categoryFields as Record<string,unknown>).visitMonth`. [VERIFIED: prisma/schema.prisma — no visitMonth field; filing-state.ts FilingData has them as top-level but they are populated from categoryFields at checkout]
- **Using `generateComplaintText()` for the new description:** The old template still contains statute citations. Phase 9 must use the new `generateCPPAComplaint().q4` function for both the CPPA narrative and the AG PDF body — not the old template function.
- **Category alias confusion:** The `generate-complaint-pdf.ts` `CATEGORY_TO_TEMPLATE` map maps `privacy_tracking → 'data-privacy'` and `video_sharing → 'video-sharing'`. In the new generator, use the raw `filing.category` value ('privacy_tracking', 'video_sharing', 'accessibility') directly against `CATEGORY_TO_CPPA_CHECKBOXES` — no translation needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Word-wrap in PDF | Custom line-break logic | `drawWrappedText()` in `generate-complaint-pdf.ts` | Already handles page overflow, paragraph breaks, multi-page documents [VERIFIED: generate-complaint-pdf.ts lines 63-114] |
| Font loading | Re-read font bytes | Existing `readFileSync(join(process.cwd(), 'src/assets/fonts/...'))` pattern | Fonts are already embedded and tested; path is stable [VERIFIED: generate-complaint-pdf.ts lines 121-122] |
| Character counting | Manual substring logic | `String.prototype.slice(0, 2000)` | Simple, correct, no library needed |
| Fax delivery | Any new fax code | Unchanged `executeFilingPipeline()` | AGPDF-04 explicitly requires no pipeline changes |
| PDF storage | New blob utility | `storeComplaintPdf()` in `store-complaint-pdf.ts` | Already handles BLOB_READ_WRITE_TOKEN absent case, private access, Filing.complaintPdfUrl update [VERIFIED: store-complaint-pdf.ts] |

**Key insight:** Every hard problem in Phase 9 is already solved in the codebase. This phase is primarily authoring new TypeScript functions and restructuring layout code, not building infrastructure.

---

## Common Pitfalls

### Pitfall 1: Breaking Existing PDF Tests
**What goes wrong:** The existing `generate-complaint-pdf.test.ts` asserts `expect(text).toContain('Respectfully submitted')` and `expect(text).toContain('Re:')` as required PDF-02 section markers. Restructuring the AG PDF to form-style removes those strings, causing two test failures.
**Why it happens:** Tests were written to verify the old letter format; Phase 9 changes the format.
**How to avoid:** Update the test assertions in the same wave as the PDF restructure. Replace with checks for the new section headers: `'YOUR INFORMATION'`, `'BUSINESS INFORMATION'`, `'COMPLAINT'`, `'RESOLUTION REQUESTED'`, `'AFFIRMATION'`.
**Warning signs:** `vitest run` reports failures in `generate-complaint-pdf.test.ts` tests "PDF-02: PDF bytes contain required section markers".

### Pitfall 2: visitMonth/visitYear Not in Prisma Schema
**What goes wrong:** Code tries `filing.visitMonth` or `filing.visitYear` directly — TypeScript error, runtime undefined.
**Why it happens:** These fields live in `filing.categoryFields` JSON, populated at checkout from `FilingData.visitMonth/visitYear`. The Prisma schema does not have top-level `visitMonth`/`visitYear` columns.
**How to avoid:** Always extract as `const cf = (filing.categoryFields as Record<string,unknown>) ?? {}; const month = cf.visitMonth as string | undefined`.
**Warning signs:** TypeScript compiler error `Property 'visitMonth' does not exist on type 'Filing'`.

### Pitfall 3: Statute Citation Creep from Old Templates
**What goes wrong:** Developer copies the old `ca_ag` template text as a starting point and misses removing the statute citations, or the `generateComplaintText()` function is still called for the AG PDF body.
**Why it happens:** Old function still exists in `complaint-generator.ts`; easy to fall back on it.
**How to avoid:** The restructured `generateComplaintPdf` must call `generateCPPAComplaint(filing).q4` for the body — not `generateComplaintText()`. Add an assertion to the PDF test that the output contains no `§` character and no `Civil Code` substring.
**Warning signs:** Test assertion `expect(text).not.toContain('§')` fails.

### Pitfall 4: 2000-Char Limit Cuts Mid-Sentence
**What goes wrong:** `.slice(0, 2000)` truncates a long user description in the middle of a sentence, producing malformed output like "…tracking cookies were placed on m".
**Why it happens:** Naive slice doesn't respect word boundaries.
**How to avoid:** Build the description in the order: fixed opening + user text + fixed closing. If user text is very long, truncate only the user text portion before appending the closing clause. Alternatively, truncate at the last space before 2000 chars.
**Warning signs:** Generated narrative ends mid-word.

### Pitfall 5: ADA Category Check Uses Wrong String
**What goes wrong:** Code uses `filing.category === 'accessibility'` but the Filing was created before Phase 8 with an old category alias, or the check is case-sensitive while the value has a different casing.
**Why it happens:** Multiple category aliases exist (see `CATEGORY_TO_TEMPLATE` map).
**How to avoid:** Verify that the wizard saves exactly `'accessibility'` as the category for ADA filings. The `categories.ts` file uses `id: 'accessibility'` which is the canonical value. The `CATEGORY_TO_TEMPLATE` map doesn't remap `accessibility`. [VERIFIED: categories.ts, generate-complaint-pdf.ts CATEGORY_TO_TEMPLATE]

### Pitfall 6: Success Page Test File Uses Old Assertions
**What goes wrong:** The existing `page.test.tsx` checks for `'Download Complaint PDF'` and `'Track Your Filings'` strings. After rewrite, the element text changes, causing test failures.
**Why it happens:** Old test expects old UI strings.
**How to avoid:** Update `page.test.tsx` in the same wave as `page.tsx`. New assertions should check for CPPA guide link, paper PDF link, fax status display, and ADA conditional hiding.

---

## Code Examples

### CPPAComplaint interface and generator skeleton

```typescript
// Source: strategy document + REQUIREMENTS.md CPTXT-01 to CPTXT-05
// File: src/lib/cppa-complaint-generator.ts

import type { Filing } from '@prisma/client'

export interface CPPAComplaint {
  q1CheckboxInstructions: string[]
  q2BusinessName: string
  q3CaliforniaResident: 'Yes'
  q4Description: string
  q5SupportingMaterials: string
  q6ContactedBusiness: 'No / Not applicable'
  q7ContactInfo: string
}

const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']

const CATEGORY_TO_CPPA_CHECKBOXES: Record<string, string[]> = {
  privacy_tracking: ['Collection, use, storage, or sharing of my personal information',
                     'Right to opt out of sale or sharing of personal information'],
  video_sharing:    ['Collection, use, storage, or sharing of my personal information'],
  accessibility:    [],
}

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

export function generateCPPAComplaint(filing: Filing): CPPAComplaint {
  const cf = (filing.categoryFields as Record<string, unknown>) ?? {}
  const visitDate    = buildVisitDate(cf)
  const businessRef  = filing.targetUrl || filing.targetName
  const userText     = filing.description?.trim() ?? ''

  // Q4: core narrative — no statute citations
  const opening = `On or about ${visitDate}, I visited the website ${businessRef}.`
    + ` During my visit, I discovered that the website was collecting my personal information —`
    + ` including my browsing activity, device information, and IP address —`
    + ` and sharing it with third-party advertising companies without my knowledge or consent.`
  const middle = userText
    ? ` ${userText}.`
    : ` The website placed tracking cookies on my device and transmitted my data to advertising networks.`
  const closing = ` I was not given a clear opportunity to opt out of this data collection before it occurred,`
    + ` and the website did not display an adequate privacy notice or "Do Not Sell My Personal Information" link.`
    + ` I am filing this complaint because I believe these practices violate my rights as a California consumer.`

  // Safeguard: if userText is very long, trim middle to preserve closing
  const maxMiddle = 2000 - opening.length - closing.length - 5
  const safeMiddle = middle.length > maxMiddle ? middle.slice(0, maxMiddle).trimEnd() + '.' : middle
  const q4 = (opening + safeMiddle + closing).slice(0, 2000)

  // Q5 fixed
  const q5 = `I have a screenshot of the website's tracking activity, a record of cookies placed on my device, and a filing receipt from EasyFilerComplaint (Filing ID: ${filing.filingReceiptId ?? filing.id}).`

  // Q7 — filerInfo is stored as JSON on filing.filerInfo
  const fi = (filing.filerInfo as Record<string,string> | null) ?? {}
  const phone   = fi.phone?.trim()
  const address = fi.address?.trim()
  const q7Lines = [
    `${fi.firstName ?? ''} ${fi.lastName ?? ''}`.trim(),
    fi.email ?? '',
    phone    || null,
    address  ? `${address}, ${fi.city}, ${fi.state} ${fi.zip}` : null,
  ].filter(Boolean).join('\n')

  return {
    q1CheckboxInstructions: CATEGORY_TO_CPPA_CHECKBOXES[filing.category] ?? [],
    q2BusinessName:         filing.targetUrl
                              ? `${filing.targetName} (${filing.targetUrl})`
                              : filing.targetName,
    q3CaliforniaResident:   'Yes',
    q4Description:          q4,
    q5SupportingMaterials:  q5,
    q6ContactedBusiness:    'No / Not applicable',
    q7ContactInfo:          q7Lines,
  }
}
```

### Form-style section header helper for AG PDF

```typescript
// Source: codebase analysis of existing drawLine pattern
// Add inside generateComplaintPdf() alongside existing drawLine closure

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
  if (!value?.trim()) return  // AGPDF-03: omit empty fields
  drawLine(`${label}: ${value}`, font, fontSize, black)
}
```

### Updated PDF Info metadata for new format

```typescript
// Replace old 'Respectfully submitted' keyword in metadata:
infoDict.set(PDFName.of('Subject'), PDFString.of('CONSUMER COMPLAINT FORM'))
infoDict.set(PDFName.of('Keywords'), PDFString.of(
  `EasyFilerComplaint YOUR INFORMATION BUSINESS INFORMATION COMPLAINT AFFIRMATION Filing ID: ${filingReceiptIdForMeta}`
))
```

---

## Runtime State Inventory

> Omitted — this is a greenfield feature phase (new TypeScript functions + UI rewrite), not a rename/migration phase. No stored data, live service config, or OS-registered state is affected beyond the Filing record's existing fields.

---

## Validation Architecture

nyquist_validation is enabled (config.json `workflow.nyquist_validation: true`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run src/lib/__tests__/cppa-complaint-generator.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CPTXT-01 | `generateCPPAComplaint` returns all 7 fields, none null | unit | `npx vitest run src/lib/__tests__/cppa-complaint-generator.test.ts` | ❌ Wave 0 |
| CPTXT-02 | q4 contains no `§`, no `Civil Code`, no `Penal Code`, ≤2000 chars | unit | same | ❌ Wave 0 |
| CPTXT-03 | Visit date reads "March 2026" not "03/2026" or "N/A" | unit | same | ❌ Wave 0 |
| CPTXT-04 | User description text appears inside q4 narrative (not after "Specifically, I observed:") | unit | same | ❌ Wave 0 |
| CPTXT-05 | q2 = "Acme Corp (acme.com)" when targetUrl present; "Acme Corp" when absent | unit | same | ❌ Wave 0 |
| AGPDF-01 | AG PDF text contains all 6 section headers | unit | `npx vitest run src/lib/__tests__/generate-complaint-pdf.test.ts` | ✅ (modify) |
| AGPDF-02 | AG PDF text contains no `§`, no `Dear Attorney General`, no `Respectfully submitted` | unit | same | ✅ (modify) |
| AGPDF-03 | AG PDF text contains no `N/A` string | unit | same | ✅ (modify) |
| DESC-03 | privacy_tracking q1 has 2 items; video_sharing has 1; accessibility has 0 | unit | cppa-complaint-generator.test.ts | ❌ Wave 0 |
| SUCC-01 | Success page HTML contains CPPA guide link and CA AG section | unit | `npx vitest run src/app/filing/\\[id\\]/success/page.test.tsx` | ✅ (modify) |
| SUCC-02 | CPPA guide link href = `/filing/{id}/cppa-guide`; paper PDF href = `/api/filings/{id}/cppa-pdf` | unit | same | ✅ (modify) |
| SUCC-03 | Fax ID and status rendered when present; "Pending" when null | unit | same | ✅ (modify) |
| SUCC-04 | Guest CTA present when userId null | unit | same | ✅ (exists, verify preserved) |
| ADA-01 | CPPA sections hidden when category=`accessibility` | unit | same | ✅ (modify) |

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/__tests__/cppa-complaint-generator.test.ts src/lib/__tests__/generate-complaint-pdf.test.ts src/app/filing/\\[id\\]/success/page.test.tsx`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/lib/__tests__/cppa-complaint-generator.test.ts` — covers CPTXT-01 through CPTXT-05 and DESC-03
- [ ] Update `src/lib/__tests__/generate-complaint-pdf.test.ts` — replace broken PDF-02 assertions (remove `'Respectfully submitted'` / `'Re:'`; add 6 form section header checks + `§` prohibition check)
- [ ] Update `src/app/filing/[id]/success/page.test.tsx` — add tests for 3-channel sections, ADA conditional, fax status display; preserve SUCC-04 guest CTA test

---

## Security Domain

> `security_enforcement` is not set to `false` — included.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No new auth surface in Phase 9 |
| V3 Session Management | No | Success page is server component; uses existing Prisma session-safe query |
| V4 Access Control | Partial | Success page renders filing data for any user who has the URL — existing pattern; no new auth check added in Phase 9 |
| V5 Input Validation | Yes | `filing.description` (user free-text) inserted into narrative and PDF — must be treated as untrusted text content, not code |
| V6 Cryptography | No | No new crypto operations |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| User description injecting PDF commands or special chars | Tampering | pdf-lib renders text as drawn glyphs, not interpreted commands — no injection risk. Emoji/special chars may render as blank glyphs (font limitation) but do not execute |
| User description containing `§` or statute text | Information Disclosure | Narrative template design must ensure user text is sandwiched between fixed clauses, not appended verbatim to a statute-quoting template |
| Success page exposing faxId to wrong user | Information Disclosure | Existing pattern: page is accessible to anyone with the filing UUID (security through obscurity). No new exposure — faxId is not sensitive. Phase 9 does not add a new auth layer here |

**Note on V4:** The success page (`/filing/[id]/success`) does not currently verify session ownership — it shows the filing to whoever has the URL. This is a pre-existing design decision (receipt page paradigm, like airline boarding pass). Phase 9 does not change this. The CPPA guide page (Phase 10) does require ownership verification (CPGDE-02).

---

## Open Questions

1. **ADA category alias risk**
   - What we know: `categories.ts` uses `id: 'accessibility'`; `CATEGORY_TO_TEMPLATE` does not remap it
   - What's unclear: Phase 8 (not yet executed) may change wizard category values. If Phase 8 saves a different alias for ADA, `filing.category === 'accessibility'` check breaks
   - Recommendation: Plan should note dependency on Phase 8 canonical category value. Planner should add a comment in the ADA conditional: `// category value is 'accessibility' per categories.ts id`

2. **Description for video_sharing and accessibility categories**
   - What we know: Strategy document's sample narrative is written for `privacy_tracking`. The `buildDescription` function above is also written for that category.
   - What's unclear: The `q4Description` for `video_sharing` (unauthorized video distribution) and `accessibility` (ADA barrier) needs different narrative text — the current sample doesn't fit those categories.
   - Recommendation: The generator should branch on `filing.category` to select a different narrative template per category. Planner should create separate narrative templates for all three categories. The `accessibility` description won't be used in CPPA context (ADA-01 hides it) but the AG PDF still needs it.

3. **filerInfo JSON availability at success page render time**
   - What we know: `filerInfo` is stored as JSON on `Filing.filerInfo` at checkout. `generateCPPAComplaint` reads from it for Q7.
   - What's unclear: The success page doesn't currently select `filerInfo`. If Q7 (contact info) needs to be shown on the success page, `filerInfo` must be added to the select.
   - Recommendation: Phase 9 success page does NOT need to display Q7 — that's Phase 10 (cppa-guide page). No `filerInfo` needed in the success page select.

4. **Step number label for ADA CA AG section**
   - What we know: Strategy doc shows "STEP 3: Attorney General" in the three-channel layout. For ADA, only one channel is shown.
   - What's unclear: Should ADA show "STEP 1" or just no step number at all?
   - Recommendation: Show "STEP 1" for ADA — removes the visual oddity of a missing steps 1 and 2.

---

## Environment Availability

> Step 2.6: SKIPPED — Phase 9 is pure TypeScript/TSX authoring with no new external dependencies. All tools (Next.js, pdf-lib, Prisma, vitest) are already installed and verified.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | ADA step number should display as "STEP 1" when it is the only channel | Success Page Pattern | Minor UX issue — easy to fix |
| A2 | Exact character count for fixed narrative clauses leaves ~1435 chars for user description | Standard Stack / Code Examples | If fixed text is longer, user description budget is smaller; `.slice(0, 2000)` still safe-guards |
| A3 | Phase 8 will save category as `'accessibility'` (same as categories.ts id) | Common Pitfalls #5 | If alias differs, ADA-01 conditional silently fails — wrong channels shown |

---

## Sources

### Primary (HIGH confidence)
- `src/lib/complaint-generator.ts` — visit date extraction, template interpolation patterns [VERIFIED: read in session]
- `src/lib/generate-complaint-pdf.ts` — full PDF layout, drawWrappedText, font loading, section structure [VERIFIED: read in session]
- `src/lib/filing-state.ts` — FilingData interface, visitMonth/visitYear location [VERIFIED: read in session]
- `src/lib/categories.ts` — canonical category IDs [VERIFIED: read in session]
- `prisma/schema.prisma` — Filing model fields (faxId, faxStatus, categoryFields JSON) [VERIFIED: read in session]
- `src/lib/sinch-fax.ts` — fax status normalization strings [VERIFIED: read in session]
- `src/app/filing/[id]/success/page.tsx` — current success page structure to rewrite [VERIFIED: read in session]
- `src/lib/__tests__/generate-complaint-pdf.test.ts` — existing assertions that will break [VERIFIED: read in session]
- `src/app/filing/[id]/success/page.test.tsx` — existing success page assertions [VERIFIED: read in session]
- `vitest.config.ts` — test runner config [VERIFIED: read in session]
- `package.json` — all installed dependencies and versions [VERIFIED: read in session]

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` decisions log — category design decisions, CPPA as primary channel rationale [VERIFIED: read in session]
- `EFC_v2_Filing_Strategy_Option_C.md` — CPPAComplaint interface shape, sample narrative, checkbox mapping, AG PDF section structure [VERIFIED via objective/context provided]

### Tertiary (LOW confidence)
- Character budget arithmetic for 2000-char limit — calculated from template text but not verified by running the code [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies verified in package.json
- Architecture (CPPAComplaint interface): HIGH — directly specified in strategy doc + requirements
- AG PDF restructure: HIGH — codebase shows exact existing patterns to adapt
- Success page: HIGH — existing page read; Prisma schema verified for new fields
- Pitfalls: HIGH — directly derived from code analysis of existing tests and patterns
- Visit date extraction: HIGH — exact same logic exists in complaint-generator.ts

**Research date:** 2026-05-03
**Valid until:** 2026-06-03 (dependencies are all stable; only risk is Phase 8 changing category aliases)
