# Phase 8: Filing-Wizard-Ux-Adjustments — Pattern Map

**Mapped:** 2026-04-14
**Files analyzed:** 5 (3 modified, 2 new)
**Analogs found:** 5 / 5

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/app/file/[category]/page.tsx` | component (wizard) | request-response | self (existing wizard) | exact rewrite |
| `src/lib/filing-state.ts` | model/config | transform | self (existing interface) | exact extension |
| `src/app/api/upload-evidence/route.ts` | API route | file-I/O | `src/lib/store-complaint-pdf.ts` + `src/app/api/checkout/route.ts` | role-match composite |
| `src/components/forms/ProgressBar.tsx` | component (UI) | — | self (existing component) | exact edit |
| `src/components/forms/FormSelect.tsx` | component (UI) | — | self (existing component) | exact edit |

---

## Pattern Assignments

### `src/app/file/[category]/page.tsx` (wizard component, 6-step rewrite)

**Analog:** self — the existing file is the canonical pattern for all wizard step conventions.

**Imports pattern** (lines 1–18):
```typescript
'use client'

import { useState, useCallback, useRef } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCategoryById } from '@/lib/categories'
import { FilingData, defaultFilingData } from '@/lib/filing-state'
import { Masthead } from '@/components/Masthead'
import { Footer } from '@/components/Footer'
import { DoubleRule } from '@/components/DoubleRule'
import { ProgressBar } from '@/components/forms/ProgressBar'
import { StepHeader } from '@/components/forms/StepHeader'
import { StepNavigation } from '@/components/forms/StepNavigation'
import { FormField } from '@/components/forms/FormField'
import { FormTextarea } from '@/components/forms/FormTextarea'
import { FormSelect } from '@/components/forms/FormSelect'
```
Note: Add `useRef` to the existing `useState, useCallback` import for the file input ref (Pitfall 3 fix).

**New React state — add alongside existing `useState` calls** (after line 103):
```typescript
// Evidence upload — File is NOT JSON-serializable, kept separate from FilingData
const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
const [evidenceError, setEvidenceError] = useState<string | null>(null)
const [uploadedEvidence, setUploadedEvidence] = useState<{ url: string; filename: string } | null>(null)
const [attested, setAttested] = useState(false)
const fileInputRef = useRef<HTMLInputElement>(null)
```

**Constant data for Step 0 — insert near top with existing constants** (after line 68):
```typescript
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

const MONTHS = [
  { value: '01', label: 'January' }, { value: '02', label: 'February' },
  { value: '03', label: 'March' },   { value: '04', label: 'April' },
  { value: '05', label: 'May' },     { value: '06', label: 'June' },
  { value: '07', label: 'July' },    { value: '08', label: 'August' },
  { value: '09', label: 'September' },{ value: '10', label: 'October' },
  { value: '11', label: 'November' },{ value: '12', label: 'December' },
]

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 6 }, (_, i) => {
  const y = currentYear - i
  return { value: String(y), label: String(y) }
})
```

**Step 0 — Complaint Type radio-card pattern** (replaces old step 0 agency block):
```tsx
{step === 0 && (
  <div>
    <StepHeader
      step={1}
      title="What type of complaint are you filing?"
      description="Select the category that best describes your complaint."
    />
    <div className="space-y-2">
      {COMPLAINT_TYPES.map((ct) => {
        const isSelected = data.category === ct.value
        return (
          <div
            key={ct.value}
            onClick={() => update({ category: ct.value })}
            className={`bg-bg border rounded-[6px] p-4 cursor-pointer ${
              isSelected ? 'border-bg-dark' : 'border-border'
            }`}
          >
            <p className="font-serif text-base font-bold text-text">{ct.label}</p>
            <p className="font-body text-sm text-text-mid">{ct.subLabel}</p>
          </div>
        )
      })}
    </div>
    <StepNavigation
      onBack={undefined}
      onContinue={() => setStep(1)}
      continueDisabled={!data.category}
    />
  </div>
)}
```

**Step 2 — Visit date dropdowns and evidence upload — copy `FormSelect` grid pattern** (from existing lines 289–295):
```tsx
{/* Visit date — reuse grid grid-cols-2 gap-4 pattern from Step 1 business address grid */}
<div className="grid grid-cols-2 gap-4">
  <FormSelect
    label="Approximate Visit Date"
    hint="Approximate date is sufficient."
    value={data.visitMonth || ''}
    onChange={(e) => update({ visitMonth: e.target.value })}
    options={MONTHS}
  />
  <FormSelect
    label="Year"
    value={data.visitYear || ''}
    onChange={(e) => update({ visitYear: e.target.value })}
    options={YEARS}
  />
</div>

{/* Evidence upload drop zone */}
<div>
  <label className="block font-mono text-[9px] tracking-[0.15em] uppercase text-text-light mb-1.5">
    Supporting Evidence (optional)
  </label>
  <label className="block bg-bg-alt border border-dashed border-border-dark rounded-[6px] p-6 text-center cursor-pointer hover:border-bg-dark transition-colors">
    <input
      ref={fileInputRef}
      type="file"
      accept=".pdf,.png,.jpg,.jpeg"
      className="hidden"
      onChange={handleFileChange}
    />
    {evidenceFile ? (
      <div className="flex items-center justify-center gap-3">
        <span className="font-body text-sm text-text">File selected: {evidenceFile.name}</span>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); handleRemoveFile() }}
          className="font-mono text-[9px] uppercase text-text-light hover:text-accent transition-colors"
        >
          Remove ×
        </button>
      </div>
    ) : (
      <span className="font-body text-sm text-text-mid">Attach a PDF, PNG, or JPG — max 5 MB</span>
    )}
  </label>
  {evidenceError && (
    <div className="mt-2 p-3 bg-accent-bg border border-accent rounded-[6px]">
      <p className="font-mono text-[9px] uppercase text-accent">{evidenceError}</p>
    </div>
  )}
</div>
```

**File change and remove handlers** (insert with other callbacks, after `updateCategoryField`):
```typescript
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

const handleRemoveFile = () => {
  setEvidenceFile(null)
  setEvidenceError(null)
  if (fileInputRef.current) fileInputRef.current.value = ''
}
```

**Step 3 — Agency static display** (replaces old agency checkbox step):
```tsx
{step === 3 && (
  <div>
    <StepHeader
      step={4}
      title="Your complaint will be filed with:"
      description="At launch, EasyFilerComplaint files with the California Attorney General. Additional agencies are coming soon."
    />
    <div className="space-y-2">
      {/* CA AG — full opacity, no click handler */}
      <div className="bg-bg border border-border rounded-[6px] p-4">
        <p className="font-serif text-base font-bold text-text">California Attorney General</p>
      </div>
      {/* FCC — disabled with coming soon badge */}
      <div className="opacity-50 cursor-not-allowed bg-bg border border-border rounded-[6px] p-4 flex items-center gap-3">
        <p className="font-serif text-base font-bold text-text">FCC</p>
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] bg-accent-bg text-accent border border-accent px-2 py-0.5 rounded-[4px]">
          Coming Soon
        </span>
      </div>
    </div>
    <StepNavigation
      onBack={() => setStep(2)}
      onContinue={() => setStep(4)}
    />
  </div>
)}
```

**Step 5 — Attestation checkbox gate pattern** (extends existing review step):
```tsx
{/* Attestation checkbox — inside Step 5, above StepNavigation */}
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

**Updated handleSubmit — evidence upload before checkout** (replaces lines 144–163):
```typescript
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
    if (!response.ok) {
      throw new Error(result.error || 'We could not start the payment process. Please try again or contact support.')
    }
    window.location.href = result.url
  } catch (err: unknown) {
    setSubmitError(err instanceof Error ? err.message : 'We could not start the payment process. Please try again or contact support.')
  } finally {
    setIsSubmitting(false)
  }
}
```

**ProgressBar invocation — step offset** (line 174, unchanged math):
```tsx
<ProgressBar currentStep={step + 1} />
```
ProgressBar uses `stepNum === currentStep` where `stepNum = index`. With `step + 1`: step 0 → index 1 is active. New 6-step array has indices 0–5, so step 5 (Review) → `currentStep = 6` → no index matches (Review at index 5 is `isDone`). Fix: pass `currentStep={step}` directly, OR verify the STEPS array length covers index 5 at `step === 5`. Safest: change to `currentStep={step}` so index 0 is active at step 0, index 5 at step 5.

---

### `src/lib/filing-state.ts` (model/config, transform)

**Analog:** self (lines 1–52 — the existing interface and defaults).

**Interface extension** — add after `ageRange?: string` (line 34):
```typescript
// Phase 8 additions
visitMonth?: string        // '01'–'12' from Details step dropdown
visitYear?: string         // e.g. '2026' from Details step dropdown
evidenceFileUrl?: string   // set after /api/upload-evidence, forwarded to checkout
evidenceFileName?: string  // set after /api/upload-evidence, forwarded to checkout
```

**defaultFilingData extension** — change `state: ''` to (line 49):
```typescript
state: 'CA',               // WIZ-05 — California pre-selected
```
Note: `evidenceFile` (File object) is NOT added here — it is not JSON-serializable and lives only in component `useState`.

---

### `src/app/api/upload-evidence/route.ts` (API route, file-I/O) — NEW FILE

**Analog 1 (Blob put pattern):** `src/lib/store-complaint-pdf.ts` lines 1–38
**Analog 2 (route structure + error handling):** `src/app/api/checkout/route.ts` lines 1–100

**Imports pattern** — copy from `store-complaint-pdf.ts` line 1 + `checkout/route.ts` line 1:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
```

**BLOB_READ_WRITE_TOKEN guard** — copy from `store-complaint-pdf.ts` lines 18–21:
```typescript
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  return NextResponse.json(
    { error: 'Evidence upload unavailable in this environment' },
    { status: 503 }
  )
}
```

**Blob put call** — copy from `store-complaint-pdf.ts` lines 25–30, adapted for evidence:
```typescript
// store-complaint-pdf.ts uses:
const blob = await put(blobPath, Buffer.from(pdfBytes), {
  access: 'private',
  contentType: 'application/pdf',
  addRandomSuffix: false,
  allowOverwrite: true,
})

// upload-evidence/route.ts uses (path differs, allowOverwrite: false):
const blob = await put(
  `evidence/tmp/${crypto.randomUUID()}/${filename}`,
  buffer,
  { access: 'private', contentType: file.type, addRandomSuffix: false }
)
```

**Full route pattern** (composite of both analogs):
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'

export async function POST(request: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Evidence upload unavailable in this environment' },
      { status: 503 }
    )
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Validate size — 5MB = 5 * 1024 * 1024 bytes
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File exceeds 5 MB' }, { status: 400 })
  }

  // Validate MIME type
  const allowed = ['application/pdf', 'image/png', 'image/jpeg']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  // Sanitize filename — same defensive pattern as store-complaint-pdf path construction
  const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')

  try {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const blob = await put(
      `evidence/tmp/${crypto.randomUUID()}/${filename}`,
      buffer,
      { access: 'private', contentType: file.type, addRandomSuffix: false }
    )

    return NextResponse.json({ url: blob.url, filename })
  } catch (err) {
    console.error('[/api/upload-evidence] Error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
```

---

### `src/components/forms/ProgressBar.tsx` (component, UI edit)

**Analog:** self (line 1 — the `STEPS` constant).

**Current STEPS array** (line 1):
```typescript
const STEPS = ['Category', 'Agencies', 'Business', 'Incident', 'Your Info', 'Review']
```

**New STEPS array** (replace line 1):
```typescript
const STEPS = ['Complaint Type', 'Business', 'Details', 'Agency', 'Your Info', 'Review']
```

No other changes to this file. The rendering logic (lines 7–48) is unchanged. Array length stays at 6 — indices 0–5 match the new 6-step wizard state (steps 0–5) when `currentStep={step}` is passed from the wizard.

---

### `src/components/forms/FormSelect.tsx` (component, UI edit)

**Analog:** self (line 27 — the hint `<p>` element).

**Current hint line** (line 27):
```typescript
{hint && <p className="font-mono text-[8px] tracking-[0.05em] text-text-light">{hint}</p>}
```

**New hint line** — update `text-[8px]` to `text-[9px]` to match UI-SPEC 9px mono hint standard:
```typescript
{hint && <p className="font-mono text-[9px] tracking-[0.05em] text-text-light">{hint}</p>}
```

Note: `FormField.tsx` line 19 has the same `text-[8px]` hint — apply the same fix there for consistency. The UI-SPEC mandates 9px for all mono hint text uniformly.

---

## Shared Patterns

### Error Container
**Source:** `src/app/file/[category]/page.tsx` lines 751–755
**Apply to:** Submit error in Step 5, evidence upload error in Step 2
```tsx
<div className="mb-4 p-4 bg-accent-bg border border-accent rounded-[6px]">
  <p className="font-mono text-[9px] tracking-[0.1em] uppercase text-accent mb-1">Payment Error</p>
  <p className="font-body text-sm text-text">{submitError}</p>
</div>
```
For evidence error, use a condensed variant without the heading:
```tsx
<div className="mt-2 p-3 bg-accent-bg border border-accent rounded-[6px]">
  <p className="font-mono text-[9px] uppercase text-accent">{evidenceError}</p>
</div>
```

### Mono Label Pattern
**Source:** `src/components/forms/FormField.tsx` line 11, `src/app/file/[category]/page.tsx` line 187
**Apply to:** All new custom labels in wizard steps (complaint type step heading label, evidence upload label, agency step labels)
```tsx
<label className="block font-mono text-[9px] tracking-[0.15em] uppercase text-text-light">
  {label}
</label>
```

### Radio Input Pattern (existing in wizard)
**Source:** `src/app/file/[category]/page.tsx` lines 400–413 (environmental ongoing radio group)
**Apply to:** Complaint type step (adapt to full-card click instead of inline radio input)
```tsx
<input
  type="radio"
  name="ongoing"
  value={v}
  checked={data.categoryFields.ongoing === v}
  onChange={() => updateCategoryField('ongoing', v)}
  className="accent-text"
/>
```
For complaint type cards, the entire `<div>` is the click target (no visible `<input type="radio">`).

### Summary Row Pattern
**Source:** `src/app/file/[category]/page.tsx` lines 663–672 (review summary rows)
**Apply to:** Step 5 review — add new rows for complaint type label, visit date, evidence filename
```tsx
<div className="flex justify-between">
  <span>Category:</span>
  <span className="font-serif text-text font-bold">{category.label}</span>
</div>
```
New rows follow exact same structure:
```tsx
<div className="flex justify-between">
  <span>Complaint Type:</span>
  <span className="font-serif text-text font-bold">
    {COMPLAINT_TYPES.find(ct => ct.value === data.category)?.label ?? data.category}
  </span>
</div>
{(data.visitMonth || data.visitYear) && (
  <div className="flex justify-between">
    <span>Approx. Visit Date:</span>
    <span className="font-serif text-text font-bold">
      {[data.visitMonth && MONTHS.find(m => m.value === data.visitMonth)?.label, data.visitYear].filter(Boolean).join(' ')}
    </span>
  </div>
)}
{evidenceFile && (
  <div className="flex justify-between">
    <span>Evidence:</span>
    <span className="font-serif text-text font-bold">{evidenceFile.name}</span>
  </div>
)}
```

### API Route Error Handling
**Source:** `src/app/api/checkout/route.ts` lines 93–98
**Apply to:** `src/app/api/upload-evidence/route.ts`
```typescript
} catch (err) {
  console.error('[/api/checkout] Error:', err)
  return NextResponse.json(
    { error: 'Failed to create checkout session' },
    { status: 500 }
  )
}
```

---

## Test Patterns

### API Route Test Pattern
**Source:** `src/app/api/checkout/route.test.ts` lines 1–105
**Apply to:** `src/app/api/upload-evidence/route.test.ts`

Key structural elements to copy:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock @vercel/blob
vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
}))

describe('POST /api/upload-evidence', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.BLOB_READ_WRITE_TOKEN = 'test-token'
  })

  it('returns 400 when no file provided', async () => { ... })
  it('returns 400 when file exceeds 5MB', async () => { ... })
  it('returns 400 when file type is not allowed', async () => { ... })
  it('returns { url, filename } on valid PDF upload', async () => { ... })
  it('returns 503 when BLOB_READ_WRITE_TOKEN is absent', async () => { ... })
})
```

### Client Component Test Pattern (wizard page)
**Source:** `src/app/filing/[id]/success/page.test.tsx` lines 1–109
**Apply to:** `src/app/file/[category]/page.test.tsx`

Key structural elements:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/categories', () => ({ getCategoryById: vi.fn() }))
vi.mock('next/navigation', () => ({ notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }) }))
vi.mock('@/components/Masthead', () => ({ Masthead: () => null }))
vi.mock('@/components/Footer', () => ({ Footer: () => null }))

// Tests serialize JSX result as JSON string and use toContain() for assertions
const html = JSON.stringify(result)
expect(html).toContain('Privacy & Tracking')
```

---

## No Analog Found

All files have close matches in the codebase. No files require falling back to RESEARCH.md-only patterns.

---

## Metadata

**Analog search scope:** `src/app/`, `src/components/forms/`, `src/lib/`, `src/app/api/`
**Files scanned:** 12 source files + 8 test files
**Pattern extraction date:** 2026-04-14
