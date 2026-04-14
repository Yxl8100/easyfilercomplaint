# Phase 8: Filing-Wizard-Ux-Adjustments — Research

**Researched:** 2026-04-14
**Domain:** Next.js 14 client wizard, Vercel Blob file upload, React state, Tailwind UI
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WIZ-01 | Complaint type step uses plain English labels (not technical codes) | New Step 0: radio-card list mapping DB enum to display labels; wizard entry point changes from `/file/[category]` category selection to inline step |
| WIZ-02 | Details step includes approximate visit date dropdown | Two `FormSelect` dropdowns (Month + Year) added to Step 2 in `[category]/page.tsx`; data fields added to `FilingData` |
| WIZ-03 | Details step includes optional evidence file upload (PDF/PNG/JPG, max 5MB) | Styled `<label>` drop zone wrapping hidden `<input type="file">`; file held in React state; uploaded to new `/api/upload-evidence` route at checkout time |
| WIZ-04 | Agency step shows only CA AG at launch; FCC grayed out with "coming soon" | New Step 3: replaces old agency checkbox step; CA AG shown as non-interactive card; FCC rendered at `opacity-50` with badge |
| WIZ-05 | Filer info step pre-selects California for state dropdown | `defaultFilingData.state` changed to `'CA'`; no UI-component change needed |
| WIZ-06 | Review step shows full summary + truthfulness attestation before payment | Step 5 extended: attestation checkbox disables Continue until checked; summary shows all new fields |
| WIZ-07 | Evidence file stored in Vercel Blob at `evidence/{filingId}/{filename}` | New `/api/upload-evidence` route; uses `@vercel/blob` `put()` with `access: 'private'`; updates `Filing.evidenceFileUrl` + `Filing.evidenceFileName` |
</phase_requirements>

---

## Summary

Phase 8 is a focused UI refactor of the single-page client wizard at `src/app/file/[category]/page.tsx`. The current wizard has 5 steps (0–4) with Step 0 being agency selection and a static confirmation step 5. Phase 8 restructures to 6 steps (0–5): a new Complaint Type radio-card step is inserted at position 0, the existing Business/Details/Your Info steps shift up by one, a new explicit Agency display step is added, and the Review step gains an attestation checkbox and shows all new summary fields.

The backend work is confined to one new API route (`/api/upload-evidence`) and two additions to `FilingData`/`defaultFilingData`. The schema already has `evidenceFileUrl` and `evidenceFileName` columns (SCHEMA-06 done). The filing pipeline already reads `filing.evidenceFileUrl` and attaches the evidence to the fax (FAX-07 done). The only missing piece is a route that uploads the file object to Vercel Blob before checkout.

The most complex interaction is evidence upload timing: the file is held in React state from when the user picks it, then uploaded via a `multipart/form-data` POST to `/api/upload-evidence` at checkout time (not on file select). This matches the UI-SPEC interaction contract. The upload response returns `{ url, filename }` which is stored in React state and included in the checkout POST body.

**Primary recommendation:** Implement as a single plan that rewrites `[category]/page.tsx` with the new 6-step structure, adds `visitMonth`, `visitYear`, and `evidenceFile` (File object) to component state, creates `/api/upload-evidence`, and updates `FilingData`/`defaultFilingData`. Everything else is CSS and copy changes inside the existing file.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Complaint type radio-card selector (WIZ-01) | Browser / Client | — | Pure UI state; no server needed |
| Visit date dropdowns (WIZ-02) | Browser / Client | — | Optional fields stored in React state, sent at checkout |
| Evidence file drop zone (WIZ-03) | Browser / Client | API / Backend | File held in client state; uploaded to backend at checkout |
| Evidence Blob storage (WIZ-07) | API / Backend | Database / Storage | Vercel Blob `put()` + Prisma update |
| Agency display step (WIZ-04) | Browser / Client | — | Static display; no data decision |
| California state pre-select (WIZ-05) | Browser / Client | — | `defaultFilingData` default value |
| Review attestation (WIZ-06) | Browser / Client | — | Checkbox gate on Continue; no server call |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js (App Router) | 14.2.35 | Framework; file-based API routes | Already installed [VERIFIED: package.json] |
| `@vercel/blob` | ^2.3.2 | Blob storage for evidence files | Already installed; used by `storeComplaintPdf` [VERIFIED: package.json] |
| React | (via Next.js 14) | Client component state | Already installed |
| Tailwind CSS | (via project) | Styling with design tokens | Already installed |
| Vitest + @vitejs/plugin-react | (via project) | Unit testing | Already installed [VERIFIED: vitest.config.ts] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Prisma Client | (via project) | DB update for evidenceFileUrl | In `/api/upload-evidence` only |

**No new packages need to be installed.** All dependencies are present.

---

## Architecture Patterns

### System Architecture Diagram

```
User browser (6-step wizard)
    │
    ├─ Step 0: Complaint Type (radio-card)
    │       selects: complaintType ∈ {privacy_tracking, accessibility, video_sharing}
    │       sets: category in React state
    │
    ├─ Step 1: Business Info (unchanged fields)
    │
    ├─ Step 2: Details
    │       adds: visitMonth, visitYear (FormSelect × 2)
    │       adds: evidenceFile (File object in React state — NOT uploaded yet)
    │
    ├─ Step 3: Agency (static display)
    │       CA AG card (full opacity) + FCC card (opacity-50, "Coming Soon" badge)
    │
    ├─ Step 4: Your Info
    │       state defaultValue="CA"
    │
    └─ Step 5: Review + Attestation
            shows: all summary fields incl. visitDate, evidenceFileName
            checkbox: attested → enables "Pay & File — $1.99 →"
            on Continue:
                1. if evidenceFile exists:
                   POST /api/upload-evidence (multipart/form-data, filingId not yet known)
                   ← returns { url, filename } stored in uploadedEvidence state
                2. POST /api/checkout (includes evidenceFileUrl, evidenceFileName)
                   ← returns { url }
                3. window.location.href = url

/api/upload-evidence (NEW)
    ├─ Receives: multipart/form-data { file, filename }
    ├─ Validates: size ≤ 5MB, type ∈ {pdf, png, jpg, jpeg}
    ├─ put() to Vercel Blob at: evidence/tmp/{uuid}/{filename}
    ├─ Returns: { url, filename }
    └─ Note: filingId not available until checkout creates the Filing record
             URL stored in state and forwarded in checkout POST body

/api/checkout (EXISTING — minimal extension)
    ├─ Receives: existing FilingData + evidenceFileUrl? + evidenceFileName?
    ├─ Stores in Filing.evidenceFileUrl / Filing.evidenceFileName
    └─ Returns: { url }
```

### Recommended Project Structure

No new files or folders needed beyond:

```
src/
├─ app/
│   ├─ api/
│   │   └─ upload-evidence/
│   │       └─ route.ts           # NEW — WIZ-07 evidence blob upload
│   └─ file/
│       └─ [category]/
│           └─ page.tsx           # MODIFIED — full 6-step rewrite
└─ lib/
    └─ filing-state.ts            # MODIFIED — add visitMonth, visitYear, evidenceFileUrl?, evidenceFileName?
```

### Pattern 1: Complaint Type Radio Card (WIZ-01)

The three complaint types map DB enum strings to human-readable labels and sub-labels. The category URL segment (`privacy_tracking`, `accessibility`, `video_sharing`) becomes the `category` field sent to checkout.

```typescript
// Source: UI-SPEC.md — Complaint Type Plain English Labels
const COMPLAINT_TYPES = [
  {
    value: 'privacy_tracking',
    label: 'Privacy & Tracking',
    subLabel: 'Unauthorized data collection, cookies, CCPA violations',
  },
  {
    value: 'accessibility',
    label: 'Accessibility (ADA)',
    subLabel: 'Website barriers, physical access, service animal denial',
  },
  {
    value: 'video_sharing',
    label: 'Video Sharing & Streaming',
    subLabel: 'Cable operator violations, streaming privacy, VPPA',
  },
]
```

The wizard entry point also changes: the current `src/app/file/page.tsx` category picker is no longer the entry. The wizard at `src/app/file/[category]/page.tsx` absorbs Step 0 (complaint type selection), so the `[category]` URL segment may become a placeholder or redirect. **See Open Question 1.**

### Pattern 2: Evidence Upload at Checkout Time (WIZ-03, WIZ-07)

The UI-SPEC explicitly states: "The file object is held in React state and uploaded to `/api/upload-evidence` at checkout time (not immediately on select)." [VERIFIED: UI-SPEC.md]

```typescript
// Source: UI-SPEC Interaction Contracts — Evidence Upload
// React state (not FilingData) — File is not JSON-serializable
const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
const [uploadedEvidence, setUploadedEvidence] = useState<{
  url: string
  filename: string
} | null>(null)

// At handleSubmit, before /api/checkout:
if (evidenceFile) {
  const formData = new FormData()
  formData.append('file', evidenceFile)
  formData.append('filename', evidenceFile.name)
  const res = await fetch('/api/upload-evidence', { method: 'POST', body: formData })
  const result = await res.json()
  // result.url stored and forwarded to checkout
}
```

The `/api/upload-evidence` route uses `@vercel/blob`'s `put()` with `access: 'private'` (consistent with complaint PDFs). The path is `evidence/tmp/{randomId}/{filename}` because the filingId does not exist yet at upload time.

```typescript
// Source: storeComplaintPdf.ts pattern [VERIFIED: src/lib/store-complaint-pdf.ts]
import { put } from '@vercel/blob'

const blob = await put(
  `evidence/tmp/${crypto.randomUUID()}/${filename}`,
  fileBuffer,
  { access: 'private', addRandomSuffix: false, allowOverwrite: false }
)
```

### Pattern 3: Visit Date Dual Dropdowns (WIZ-02)

Two `FormSelect` components in `grid grid-cols-2 gap-4`. Both are optional.

```typescript
// Source: UI-SPEC.md — Visit Date Interaction Contract
const MONTHS = [
  { value: '01', label: 'January' }, { value: '02', label: 'February' },
  { value: '03', label: 'March' },   { value: '04', label: 'April' },
  { value: '05', label: 'May' },     { value: '06', label: 'June' },
  { value: '07', label: 'July' },    { value: '08', label: 'August' },
  { value: '09', label: 'September' },{ value: '10', label: 'October' },
  { value: '11', label: 'November' },{ value: '12', label: 'December' },
]

// Year: current year (2026) descending to current year minus 5 (2021)
const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 6 }, (_, i) => {
  const y = currentYear - i
  return { value: String(y), label: String(y) }
})
```

### Pattern 4: Agency Static Display (WIZ-04)

Step 3 has no interaction — `selectedAgencies` is implicitly `['ca_ag']`. The Continue button is always enabled.

```tsx
// Source: UI-SPEC.md — Agency Display
// CA AG — full opacity, no click handler
<div className="bg-bg border border-border rounded-[6px] p-4">
  <p className="font-serif text-base font-bold text-text">California Attorney General</p>
</div>

// FCC — disabled with coming soon badge
<div className="opacity-50 cursor-not-allowed bg-bg border border-border rounded-[6px] p-4 flex items-center gap-3">
  <p className="font-serif text-base font-bold text-text">FCC</p>
  <span className="font-mono text-[9px] uppercase tracking-[0.1em] bg-accent-bg text-accent border border-accent px-2 py-0.5 rounded-[4px]">
    Coming Soon
  </span>
</div>
```

### Pattern 5: Attestation Checkbox Gate (WIZ-06)

```tsx
// Source: UI-SPEC.md — Review + Attestation
const [attested, setAttested] = useState(false)

<label className="flex items-start gap-3 cursor-pointer">
  <input
    type="checkbox"
    checked={attested}
    onChange={(e) => setAttested(e.target.checked)}
    className="mt-0.5 accent-text"
  />
  <span className="font-body text-sm text-text-mid">
    I certify that the information in this complaint is true and accurate
    to the best of my knowledge.
  </span>
</label>

<StepNavigation
  onBack={() => setStep(4)}
  onContinue={handleSubmit}
  continueLabel={isSubmitting ? 'Redirecting to Stripe...' : 'Pay & File — $1.99 →'}
  continueDisabled={!attested || isSubmitting}
  isLast
/>
```

Note: `isLast` on `StepNavigation` already applies `bg-accent text-white` to the Continue button [VERIFIED: StepNavigation.tsx line 35]. The disabled style (`bg-border text-text-light cursor-not-allowed`) is also already in `StepNavigation.tsx`.

### Pattern 6: ProgressBar STEPS Update

Current `STEPS` array in `ProgressBar.tsx`:
```
['Category', 'Agencies', 'Business', 'Incident', 'Your Info', 'Review']
```

New `STEPS` array per UI-SPEC:
```
['Complaint Type', 'Business', 'Details', 'Agency', 'Your Info', 'Review']
```

The `ProgressBar` receives `currentStep={step + 1}` in the current wizard. Phase 8 wizard uses step 0–5 (6 steps total). `ProgressBar` renders `STEPS.length` items. Changing the array is the only edit needed to `ProgressBar.tsx`. [VERIFIED: ProgressBar.tsx]

### Pattern 7: FilingData Extensions

```typescript
// Source: filing-state.ts [VERIFIED: src/lib/filing-state.ts]
// Add to FilingData interface:
visitMonth?: string       // '01'–'12'
visitYear?: string        // '2021'–'2026'
evidenceFileUrl?: string  // set after upload, forwarded to checkout
evidenceFileName?: string // set after upload, forwarded to checkout

// Add to defaultFilingData:
state: 'CA',              // WIZ-05 California pre-select
```

The `evidenceFile` File object is NOT added to `FilingData` (File is not JSON-serializable). It lives only in component-local `useState`.

### Pattern 8: /api/upload-evidence Route

```typescript
// Source: @vercel/blob put() pattern from store-complaint-pdf.ts [VERIFIED]
// New route: src/app/api/upload-evidence/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  // Validate size (5MB = 5 * 1024 * 1024 bytes)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File exceeds 5 MB' }, { status: 400 })
  }

  // Validate type
  const allowed = ['application/pdf', 'image/png', 'image/jpeg']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')

  const blob = await put(
    `evidence/tmp/${crypto.randomUUID()}/${filename}`,
    buffer,
    { access: 'private', contentType: file.type, addRandomSuffix: false }
  )

  return NextResponse.json({ url: blob.url, filename })
}
```

### Pattern 9: /api/checkout Extension (minimal)

The checkout route already maps `FilingData` fields to `prisma.filing.create`. Adding evidence fields requires two additions:

```typescript
// In prisma.filing.create data block:
evidenceFileUrl: data.evidenceFileUrl ?? undefined,
evidenceFileName: data.evidenceFileName ?? undefined,
```

No schema migration needed — columns already exist (SCHEMA-06). [VERIFIED: prisma/schema.prisma]

### Anti-Patterns to Avoid

- **Uploading the File on input change:** UI-SPEC says upload at checkout time, not on select. Uploading immediately would create orphaned blobs for filings that never reach payment.
- **Storing File object in FilingData:** `File` is not JSON-serializable — would break `JSON.stringify(data)` in checkout POST.
- **Using `incidentDate` (date input) instead of `visitMonth`/`visitYear`:** The existing `incidentDate` is a free-form `<input type="date">`. Phase 8 adds separate dropdowns. Do not reuse `incidentDate` for visit date.
- **Uploading evidence directly to the final `evidence/{filingId}/{filename}` path:** The filingId does not exist until `prisma.filing.create` runs inside `/api/checkout`. Use `evidence/tmp/{uuid}/{filename}` at upload time.
- **Using native fetch for file upload:** The project uses axios for Phaxio fax sends due to the Node.js CRLF bug. Evidence upload from the client browser is not affected (browser FormData is fine). Only server-to-Phaxio calls need axios. [VERIFIED: STATE.md — "Phaxio fax calls MUST use axios"]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Blob storage | Custom S3/GCS integration | `@vercel/blob` `put()` | Already installed and used; same pattern as complaint PDFs |
| File type validation | Manual MIME sniffing | `file.type` check + extension allowlist | Sufficient for client-uploaded files; consistent with UI-SPEC accept attribute |
| Styled select dropdowns | Custom dropdown component | `FormSelect` | Already styled to design system [VERIFIED: FormSelect.tsx] |
| Form field labels | Custom label component | `FormField` / `FormSelect` | Already implement mono label pattern at correct 9px size |
| Navigation buttons | Custom button component | `StepNavigation` | Already implements disabled/isLast states [VERIFIED: StepNavigation.tsx] |

---

## Common Pitfalls

### Pitfall 1: ProgressBar step count mismatch

**What goes wrong:** The wizard uses `currentStep={step + 1}` but ProgressBar renders `STEPS.length` items. Adding Step 0 (complaint type) shifts all step numbers up by one in the `step` state variable. If `currentStep` calculation is not updated consistently, the active indicator will be one off.

**Why it happens:** The current code passes `step + 1` to ProgressBar. In the new 6-step flow (steps 0–5), `currentStep` should be `step` (0-indexed, matching ProgressBar's `stepNum === currentStep` check) OR stay as `step + 1` with ProgressBar's comparison adjusted. **Read ProgressBar.tsx carefully**: `isActive = stepNum === currentStep` where `stepNum = index`. With `currentStep = step + 1`, step 0 → `currentStep = 1` → index 1 is active. This was correct for the old 5-step flow where step 0 showed step 1 as active. Confirm this math holds for the new 6-step flow.

**How to avoid:** Map out step→currentStep→ProgressBar index before writing code.

**Warning signs:** ProgressBar shows wrong step highlighted, or step 5 (Review) never shows as active.

### Pitfall 2: Orphaned evidence blobs

**What goes wrong:** Evidence is uploaded before the Filing record exists. If checkout fails or the user abandons after uploading, the blob at `evidence/tmp/...` is never associated with any Filing.

**Why it happens:** The upload must happen before `/api/checkout` to get the URL, but checkout creates the Filing.

**How to avoid:** This is an accepted tradeoff at this volume (low launch traffic). Document the path in code comments. Do not attempt to "rename" or "move" the blob in a post-checkout step — it adds complexity without a clear user benefit. The orphaned blobs will not affect functionality. A cleanup cron is a v2 concern.

### Pitfall 3: File input state not resetting on remove

**What goes wrong:** After a user clicks "Remove ×", the hidden `<input type="file">` retains the file in the browser's input state, so re-selecting the same file does not trigger `onChange`.

**Why it happens:** Browser caches the last selected value in the input element.

**How to avoid:** On remove, set the input's `value` to `''` via a `ref`. E.g.:
```typescript
const fileInputRef = useRef<HTMLInputElement>(null)
const handleRemove = () => {
  setEvidenceFile(null)
  if (fileInputRef.current) fileInputRef.current.value = ''
}
```

### Pitfall 4: Wizard entry URL structure

**What goes wrong:** The current URL is `/file/[category]` where category is one of the `categories` array IDs (`data-privacy`, `accessibility`, etc.). Phase 8 changes the three valid complaint types to `privacy_tracking`, `accessibility`, `video_sharing`. If the `notFound()` guard in the wizard page still calls `getCategoryById(params.category)`, and `categories.ts` still uses `data-privacy` as an ID, then the new URL structure breaks.

**Why it happens:** The UI-SPEC introduces new category values without specifying whether `categories.ts` or the URL routing changes.

**How to avoid:** See Open Question 1 — this needs a decision before planning. The cleanest solution is to make Step 0 use a fixed route (e.g., `/file/start` or just `/file`) and embed the complaint type selector there, removing the `[category]` dependency for Step 0.

### Pitfall 5: FormSelect hint text at wrong font size

**What goes wrong:** The existing `FormSelect.tsx` hint uses `font-mono text-[8px]` (8px). The UI-SPEC mandates 9px (`text-[9px]`) for all mono hint text.

**Why it happens:** FormSelect was built before the 9px standardization in Phase 8's UI-SPEC.

**How to avoid:** Update `FormSelect.tsx` hint `<p>` to `text-[9px]` when adding the visit date hint text, OR pass a custom className for the hint. Check whether changing the base component affects other uses.

### Pitfall 6: `isLast` button style vs. attestation disabled state

**What goes wrong:** `StepNavigation` with `isLast=true` applies `bg-accent text-white` for the enabled state. But when `continueDisabled=true`, it applies `bg-border text-text-light`. The Review step must show disabled until attested, then switch to `bg-accent text-white`. This is already handled correctly by `StepNavigation.tsx`'s ternary — `continueDisabled` takes priority over `isLast` in the ternary chain.

**Why it happens:** Developers may try to override button styles manually, creating duplication.

**How to avoid:** Pass `isLast={true}` and `continueDisabled={!attested || isSubmitting}` to `StepNavigation`. No button style overrides needed. [VERIFIED: StepNavigation.tsx lines 31–37]

---

## Code Examples

### Evidence upload form handling

```typescript
// Source: [ASSUMED] — standard React pattern for file input with FormData
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0] ?? null
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    setEvidenceError('File exceeds 5 MB. Please compress or choose a smaller file.')
    return
  }
  const allowed = ['application/pdf', 'image/png', 'image/jpeg']
  if (!allowed.includes(file.type)) {
    setEvidenceError('Only PDF, PNG, and JPG files are accepted.')
    return
  }
  setEvidenceError(null)
  setEvidenceFile(file)
}
```

### Updated handleSubmit with evidence upload

```typescript
// Source: [ASSUMED] — extends existing handleSubmit pattern [VERIFIED: [category]/page.tsx lines 144–163]
const handleSubmit = async () => {
  setIsSubmitting(true)
  setSubmitError(null)
  try {
    let evidenceFileUrl: string | undefined
    let evidenceFileName: string | undefined

    if (evidenceFile) {
      const formData = new FormData()
      formData.append('file', evidenceFile)
      const upRes = await fetch('/api/upload-evidence', { method: 'POST', body: formData })
      if (!upRes.ok) throw new Error('Evidence upload failed')
      const upData = await upRes.json()
      evidenceFileUrl = upData.url
      evidenceFileName = upData.filename
    }

    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, evidenceFileUrl, evidenceFileName }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Payment process failed.')
    window.location.href = result.url
  } catch (err: unknown) {
    setSubmitError(err instanceof Error ? err.message : 'We could not start the payment process.')
  } finally {
    setIsSubmitting(false)
  }
}
```

---

## Runtime State Inventory

This is a refactor/UX adjustment phase with no renames. Runtime state inventory not applicable.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@vercel/blob` | WIZ-07 evidence upload | ✓ | ^2.3.2 | If `BLOB_READ_WRITE_TOKEN` absent, upload route returns error (same pattern as `storeComplaintPdf`) |
| Prisma Client | Checkout route extension | ✓ | (via project) | — |
| Node.js / Next.js | API route | ✓ | Next.js 14.2.35 | — |
| Vitest | Tests | ✓ | (via project) | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** `BLOB_READ_WRITE_TOKEN` — if absent in local dev, upload route should return a graceful error (not throw). Planner should include env-guard same as `storeComplaintPdf`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest + @vitejs/plugin-react |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

**Current baseline:** 152 tests passing across 23 files. [VERIFIED: local test run]

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WIZ-01 | Complaint type step renders plain English labels; raw enum not shown | unit (render) | `npx vitest run src/app/file` | ❌ Wave 0 |
| WIZ-02 | Visit date dropdowns appear in Details step; optional (no blocking validation) | unit (render) | `npx vitest run src/app/file` | ❌ Wave 0 |
| WIZ-03 | Evidence file upload: accept .pdf/.png/.jpg; reject >5MB; reject invalid type | unit | `npx vitest run src/app/api/upload-evidence` | ❌ Wave 0 |
| WIZ-04 | Agency step shows CA AG at full opacity; FCC at opacity-50 with badge | unit (render) | `npx vitest run src/app/file` | ❌ Wave 0 |
| WIZ-05 | State field default value is 'CA' | unit | `npx vitest run src/lib/filing-state` | ❌ Wave 0 |
| WIZ-06 | Continue disabled until attestation checked | unit (render) | `npx vitest run src/app/file` | ❌ Wave 0 |
| WIZ-07 | /api/upload-evidence stores file in Vercel Blob at evidence/tmp/... | unit (mocked blob) | `npx vitest run src/app/api/upload-evidence` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green (152 baseline + new WIZ tests) before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/app/file/[category]/page.test.tsx` — covers WIZ-01, WIZ-02, WIZ-04, WIZ-05, WIZ-06
- [ ] `src/app/api/upload-evidence/route.test.ts` — covers WIZ-03, WIZ-07
- [ ] `src/lib/filing-state.test.ts` — covers WIZ-05 default value (minimal, may be inlined)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — (no new auth) |
| V3 Session Management | no | — |
| V4 Access Control | no | Evidence upload is pre-auth (guest flow) |
| V5 Input Validation | yes | File size check (5MB), MIME type allowlist, filename sanitization |
| V6 Cryptography | no | Blob path uses `crypto.randomUUID()` for uniqueness only |

### Known Threat Patterns for File Upload

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Oversized file DoS | Denial of Service | 5MB limit validated server-side in `/api/upload-evidence` before Blob write |
| Malicious file type | Tampering | MIME type allowlist (pdf/png/jpeg) validated in route |
| Path traversal via filename | Tampering | Filename sanitized: `replace(/[^a-zA-Z0-9._-]/g, '_')` |
| Direct Blob URL access (PII) | Info Disclosure | `access: 'private'` on all Blob puts — consistent with complaint PDFs |

---

## Open Questions (RESOLVED)

1. **Wizard URL routing: what happens to `/file/[category]`?**
   - **What we know:** Current entry is `/file/[category]` where category is one of `categories.ts` IDs (`data-privacy`, etc.). Phase 8 introduces a complaint type selector (Step 0) with different values (`privacy_tracking`, `accessibility`, `video_sharing`).
   - **What's unclear:** Does the wizard remain at `/file/[category]` (requiring categories.ts to be updated to match new values), or does Step 0 use a fixed URL like `/file/start`? The UI-SPEC does not specify the URL structure change.
   - **Recommendation:** The simplest approach is to update `categories.ts` category IDs to match the three Phase 8 complaint types (`privacy_tracking`, `accessibility`, `video_sharing`), update `src/app/file/page.tsx` to link to the new IDs, and change the wizard's `notFound()` guard accordingly. This preserves the URL pattern. Confirm with user or planner.
   - **RESOLVED:** Keep `/file/[category]` URL pattern. Update `categories.ts` IDs to `privacy_tracking`, `accessibility`, `video_sharing`. Plan 08-02 Task 1 implements this.

2. **`/api/upload-evidence`: BLOB_READ_WRITE_TOKEN absent behavior**
   - **What we know:** `storeComplaintPdf` returns `null` gracefully when token is absent. Evidence upload is a user-initiated action that needs a URL back.
   - **What's unclear:** Should the upload route return a mock URL in development (like `file:///local`) or should it error?
   - **Recommendation:** Return a 503 with `{ error: 'Evidence upload unavailable in this environment' }`. The wizard shows a non-fatal error and allows the user to continue without evidence. This is consistent with making evidence optional (WIZ-03).
   - **RESOLVED:** Return 503 with `{ error: 'Evidence upload unavailable in this environment' }`. Plan 08-01 Task 2 implements this.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Multi-agency checkbox Step 0 | Single-agency display Step 3 (CA AG only) | Phase 8 | Removes agency toggle; agency is implicit |
| Category selected before wizard (on /file page) | Complaint type selected inside wizard (Step 0) | Phase 8 | URL routing question (Open Question 1) |
| `incidentDate` free-form date input | `visitMonth` + `visitYear` dropdowns | Phase 8 | More user-friendly approximate date |
| No evidence upload | File drop zone + Vercel Blob upload | Phase 8 | New `/api/upload-evidence` route needed |
| No attestation | Attestation checkbox gates Review continue | Phase 8 | Truthfulness certification before payment |
| State field no default | State defaults to 'CA' | Phase 8 | WIZ-05 defaultFilingData change |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Evidence upload path uses `evidence/tmp/{uuid}/` because filingId is unavailable before checkout | Architecture Patterns (Pattern 2) | If filingId were available earlier, path could match `evidence/{filingId}/` per WIZ-07. Planner must decide whether to do a two-step upload-then-rename or accept tmp path | 
| A2 | File MIME type validation via `file.type` is sufficient for server-side security | Security Domain | Browsers can send any MIME type; a dedicated magic-bytes check would be more rigorous. For this risk level (optional evidence, private blob), MIME+extension check is acceptable |
| A3 | Wizard stays at `/file/[category]` URL pattern with updated category IDs | Open Question 1 | If route changes to `/file/start`, routing logic and tests differ |

---

## Sources

### Primary (HIGH confidence)

- `src/app/file/[category]/page.tsx` — existing wizard implementation, verified full source
- `src/components/forms/ProgressBar.tsx` — STEPS array and step rendering logic
- `src/components/forms/StepNavigation.tsx` — disabled/isLast button styles
- `src/components/forms/FormSelect.tsx` — hint font size (8px, needs update to 9px)
- `src/lib/filing-state.ts` — FilingData interface and defaults
- `src/app/api/checkout/route.ts` — checkout endpoint field mapping
- `src/lib/store-complaint-pdf.ts` — Vercel Blob `put()` pattern with `access: 'private'`
- `src/lib/filing-pipeline.ts` — evidence attachment in fax send (FAX-07 already implemented)
- `prisma/schema.prisma` — confirms SCHEMA-06 columns (`evidenceFileUrl`, `evidenceFileName`) exist
- `.planning/phases/08-filing-wizard-ux-adjustments/08-UI-SPEC.md` — design contract, interaction specs, copy, CSS class spec
- `package.json` — verifies `@vercel/blob` ^2.3.2 and Next.js 14.2.35 installed

### Secondary (MEDIUM confidence)

- `.planning/REQUIREMENTS.md` — WIZ-01 through WIZ-07 requirement text
- `.planning/STATE.md` — decisions log (Phase 01 SCHEMA-06, Phase 04 FAX-07)

### Tertiary (LOW confidence)

- None — all claims verified from codebase

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries verified in package.json
- Architecture: HIGH — existing patterns verified from source files
- Pitfalls: HIGH — derived directly from reading current source
- Open questions: MEDIUM — URL routing question requires a planner decision

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (stable Next.js/Vercel Blob stack)
