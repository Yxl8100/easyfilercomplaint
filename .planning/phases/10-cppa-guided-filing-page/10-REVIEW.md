---
phase: 10-cppa-guided-filing-page
reviewed: 2026-05-03T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/components/CopyButton.tsx
  - src/components/CopyButton.test.tsx
  - src/app/filing/[id]/cppa-guide/page.tsx
  - src/app/filing/[id]/cppa-guide/page.test.tsx
findings:
  critical: 2
  warning: 5
  info: 2
  total: 9
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-05-03T00:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Reviewed the CPPA guided filing page (`CPPAGuidePage`), the reusable `CopyButton` component, and their accompanying test suites. The generator (`cppa-complaint-generator.ts`) was read as a cross-file dependency and surfaced additional findings.

The page itself is structurally sound — layout, routing, and generator integration look correct. However two critical issues exist: (1) the clipboard write in `CopyButton` is not guarded against rejection, meaning a user-visible crash is possible on any browser that denies clipboard permission; and (2) a `setTimeout` return value is leaked across re-renders with no cleanup, which can cause a state-update-on-unmounted-component error. Five warnings cover the `as unknown as Filing` unsafe cast, missing access control on a PII-bearing database read, an unreachable parameter in the `notFound` mock, a test that directly invokes `writeText` rather than simulating a click (making it a vacuous assertion), and the fact that the generator appends a period to user-supplied text unconditionally — producing double-periods when the user already ended their sentence. Two info items cover a magic-number timeout constant and minor test-label clarity.

---

## Critical Issues

### CR-01: Unhandled `clipboard.writeText` rejection silently swallows errors

**File:** `src/components/CopyButton.tsx:13`

**Issue:** `handleCopy` calls `await navigator.clipboard.writeText(text)` and then unconditionally calls `setCopied(true)`. If the browser denies clipboard permission (e.g., the document is not focused, the user blocks the API, or the page is running in an iframe without `clipboard-write` permission), `writeText` rejects with a `DOMException`. Because `handleCopy` is an `async function` attached to `onClick` without a `.catch()` or `try/catch`, the rejection becomes an unhandled promise rejection. The button gives no feedback: it does not show an error state, and `setCopied` is never reached — but the unhandled rejection can also trigger global error handlers or, in some React error boundary configurations, unmount part of the tree.

**Fix:**
```tsx
async function handleCopy() {
  try {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  } catch {
    // clipboard permission denied or API unavailable — show transient error feedback
    setCopied(false) // no-op on first click, correct after retry
    // optionally: setError(true) + render an "Unable to copy" label
  }
}
```

---

### CR-02: `setTimeout` return value leaked — state update on potentially unmounted component

**File:** `src/components/CopyButton.tsx:15`

**Issue:** `setTimeout(() => setCopied(false), 1500)` is called inside `handleCopy` but the timer ID is never stored and never cleared. If the component unmounts within 1500 ms (e.g., a route navigation immediately after clicking Copy), the timer fires and calls `setCopied(false)` on an unmounted component. React 18 suppresses the warning in some modes, but the pattern is still incorrect — and if the user clicks rapidly, multiple concurrent timers accumulate. Each click schedules a new 1500 ms reset, so the button can flip back to "Copy" later than the user expects, and intermediate timers from earlier clicks fire against stale state.

**Fix:** Move the timeout into a `useEffect` cleanup so it is cancelled on unmount and on subsequent clicks:
```tsx
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(text)
    if (timerRef.current) clearTimeout(timerRef.current)
    setCopied(true)
    timerRef.current = setTimeout(() => setCopied(false), 1500)
  } catch { /* handle */ }
}

// Cancel on unmount
useEffect(() => () => {
  if (timerRef.current) clearTimeout(timerRef.current)
}, [])
```

---

## Warnings

### WR-01: `as unknown as Filing` unsafe cast bypasses type safety on a PII-bearing struct

**File:** `src/app/filing/[id]/cppa-guide/page.tsx:46`

**Issue:** The Prisma `.select()` result is cast with `filing as unknown as Filing`. The comment acknowledges the cast but asserts that all fields the generator reads are included in the select. This is a manual invariant maintained purely in a code comment — the TypeScript compiler will not catch it if any field is removed from the select or if the generator starts reading a new field. The generator reads `filerInfo`, `filerEmail`, and `categoryFields` from the `Filing` type. If any of these are dropped from the select (e.g., during a schema refactor), the generator will silently receive `undefined` rather than the expected value and produce malformed output. `filerEmail` in particular is not verified to be present before the cast.

**Fix:** Replace the cast with a typed interface that matches the select shape and pass that to the generator, or adjust `generateCPPAComplaint` to accept a `Pick<Filing, ...>` type covering only the fields it actually uses. Either approach makes the compiler enforce the contract:
```ts
type FilingForCPPA = Pick<Filing,
  'id' | 'category' | 'targetName' | 'targetUrl' | 'description' |
  'filerInfo' | 'filingReceiptId' | 'categoryFields' | 'filerEmail'
>

// generateCPPAComplaint(filing: FilingForCPPA): CPPAComplaint
```

---

### WR-02: No authentication or ownership check before serving PII from database

**File:** `src/app/filing/[id]/cppa-guide/page.tsx:13-26`

**Issue:** `prisma.filing.findUnique({ where: { id: params.id } })` fetches a filing — including `filerEmail`, `filerInfo` (name, address, phone), and `description` — using only the route parameter `id` as the lookup key. There is no session check, no token verification, and no ownership assertion. Any user who knows (or can guess) a filing UUID can visit `/filing/<uuid>/cppa-guide` and see another person's full contact information and complaint narrative. UUIDs are long but not secret; they may appear in browser history, server logs, or referrer headers from the CPPA external link.

**Fix:** Verify that the requesting session's user matches the filing's owner before returning data. The minimal pattern for a Next.js server component:
```ts
import { getServerSession } from 'next-auth'
// or use your existing auth helper

const session = await getServerSession(authOptions)
if (!session || filing.filerEmail !== session.user?.email) {
  // redirect to login or return a 403 page
  redirect('/login')
}
```
If the application intentionally uses token-scoped URLs instead of session auth, document this decision explicitly and confirm the UUID entropy is treated as a secret.

---

### WR-03: Generator produces double-period when user input already ends with a period

**File:** `src/lib/cppa-complaint-generator.ts:69,86,105` (and symmetrical lines in each category branch)

**Issue:** In all three `buildDescription` branches, user-supplied text is appended as `` ` ${userText}.` `` — a period is appended unconditionally. If the user's original complaint description ends with a period (or any other sentence-ending punctuation), the generated narrative will contain a double-period (`..`) or mixed punctuation like `!.` or `?.`. This appears in the copyable Q4 field that the filer pastes directly into the CPPA form. Example: user types `"I was tracked."` → narrative contains `"I was tracked.."`.

**Fix:**
```ts
const trimmed = userText.trimEnd()
const punctuated = /[.!?]$/.test(trimmed) ? trimmed : trimmed + '.'
const middle = ` ${punctuated}`
```

---

### WR-04: Test CPGDE-03 (clipboard test) is a vacuous assertion — it does not test `CopyButton`

**File:** `src/components/CopyButton.test.tsx:31-43`

**Issue:** The test titled "navigator.clipboard.writeText is called with exact text prop value on click invocation" does not render `CopyButton` at all. It directly calls `writeText(testText)` and then asserts `expect(writeText).toHaveBeenCalledWith(testText)`. This is a tautology: the test is asserting that the mock it just called was called. It does not verify that `CopyButton`'s `handleCopy` function calls `writeText` with the `text` prop. If `CopyButton` were changed to call `writeText('hardcoded wrong value')`, this test would still pass.

**Fix:** Render `CopyButton`, simulate a click, and assert:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'

it('CPGDE-03: calls clipboard.writeText with the text prop on click', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(globalThis, 'navigator', {
    value: { clipboard: { writeText } },
    writable: true, configurable: true,
  })
  render(<CopyButton text="my complaint text" />)
  fireEvent.click(screen.getByRole('button'))
  await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith('my complaint text'))
})
```
This requires adding `@testing-library/react` (or equivalent) to the test setup.

---

### WR-05: `vi.mock('next/navigation', ...)` mock is declared but never triggered — dead test setup

**File:** `src/app/filing/[id]/cppa-guide/page.test.tsx:11-13`

**Issue:** The mock for `next/navigation` stubs `notFound` to throw `'NEXT_NOT_FOUND'`. However, `page.tsx` never imports or calls `notFound` — when a filing is not found, the page returns a "Filing Not Found" JSX subtree directly. The mock is therefore inert dead code. More importantly, no test currently verifies what happens when `params.id` is missing or malformed (e.g., an empty string), which the page also does not guard against. If Prisma's `findUnique` throws (e.g., a UUID format violation), the page has no error boundary and the unhandled exception will propagate to Next.js's 500 handler.

**Fix:** Remove the unused `next/navigation` mock. Separately, add a test for the database-throws case to document the intended behavior (re-throw vs. friendly error page).

---

## Info

### IN-01: Magic number `1500` should be a named constant

**File:** `src/components/CopyButton.tsx:15`

**Issue:** The 1500 ms timeout duration is a bare numeric literal. If the value needs to change, or if other components need the same duration for visual consistency, it is easy to miss. A named constant makes the intent explicit.

**Fix:**
```tsx
const COPY_FEEDBACK_DURATION_MS = 1500
// ...
setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS)
```

---

### IN-02: `q5SupportingMaterials` text in generator always references "tracking activity" and "cookies" regardless of complaint category

**File:** `src/lib/cppa-complaint-generator.ts:125`

**Issue:** The Q5 string is:
> "I have a screenshot of the website's tracking activity, a record of cookies placed on my device, and a filing receipt..."

This text is returned verbatim for accessibility complaints, where there are no cookies and the violation has nothing to do with tracking. A filer with an accessibility complaint would be pasting factually incorrect supporting material into the CPPA form.

**Fix:** Make Q5 category-aware, similar to how `buildDescription` branches by category:
```ts
const q5 = filing.category === 'accessibility'
  ? `I have documentation of the accessibility barriers I encountered and a filing receipt from EasyFilerComplaint (Filing ID: ${receiptId}).`
  : `I have a screenshot of the website's tracking activity, a record of cookies placed on my device, and a filing receipt from EasyFilerComplaint (Filing ID: ${receiptId}).`
```

---

_Reviewed: 2026-05-03T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
