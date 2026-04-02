---
phase: 06-guest-to-account-conversion
plan: 02
subsystem: auth
status: checkpoint-pending
tags: [auth, account-creation, login, filing-history, pdf-proxy, nextauth]
dependency_graph:
  requires:
    - src/app/api/auth/register/route.ts (Plan 01 — POST /api/auth/register)
    - src/lib/auth.ts (Plan 01 — Credentials provider + JWT strategy)
    - src/middleware.ts (Plan 01 — /account/* protection)
    - prisma/schema.prisma (Filing.filerEmail, Filing.complaintPdfUrl)
  provides:
    - GET /account/create?filingId= — account creation form with email pre-fill
    - GET /login — credentials sign-in page
    - GET /account/filings — authenticated filing history with PDF download links
    - GET /api/filings/[id]/pdf — authenticated PDF proxy for private Vercel Blob URLs
    - Updated success page CTA includes filingId query param
  affects:
    - src/app/filing/[id]/success/page.tsx (CTA href now includes filingId)
tech_stack:
  added: []
  patterns:
    - Server component wrapper + client form component pattern (account create)
    - next-auth/react signIn('credentials') with redirect: false + router.push
    - PDF proxy pattern: auth guard + ownership check + server-side fetch + stream to client
    - Client-side form validation before API submit
key_files:
  created:
    - src/app/account/create/page.tsx
    - src/app/account/create/AccountCreateForm.tsx
    - src/app/account/create/page.test.tsx
    - src/app/login/page.tsx
    - src/app/login/page.test.tsx
    - src/app/account/filings/page.tsx
    - src/app/account/filings/page.test.tsx
    - src/app/api/filings/[id]/pdf/route.ts
  modified:
    - src/app/filing/[id]/success/page.tsx (filingId in CTA href)
decisions:
  - "Server component wrapper + client AccountCreateForm — server reads filerInfo from DB, passes as props to client form (avoids client-side DB access)"
  - "PDF proxy route (not direct Blob URL) — Blob URLs are private per AUTH-03/RESEARCH.md Pitfall 5; server-side fetch verifies auth + ownership before streaming"
  - "JSON.stringify(result) testing pattern for server components — consistent with Phase 02 Plan 05 pattern; no @testing-library/react needed"
  - "bcryptjs installed via npm install in worktree — was in package.json but not in worktrees node_modules"
metrics:
  duration: "12 minutes"
  completed: "2026-04-02 (checkpoint-pending)"
  tasks_completed: 2
  tasks_total: 3
  files_created: 8
  files_modified: 1
  tests_added: 17
  tests_total: 130
---

# Phase 06 Plan 02: UI Pages Summary (Checkpoint Pending)

**One-liner:** Account creation with email pre-fill, credentials login, filing history with proxied PDF downloads — all pages wired to the Plan 01 auth infrastructure.

**Status:** Tasks 1 and 2 complete. Awaiting Task 3 human verification checkpoint.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Account create page, login page, success page CTA | fbad126 | src/app/account/create/page.tsx, AccountCreateForm.tsx, src/app/login/page.tsx, src/app/filing/[id]/success/page.tsx |
| 2 | Filing history page and PDF proxy route | 7aab40d | src/app/account/filings/page.tsx, src/app/api/filings/[id]/pdf/route.ts |

## What Was Built

### Task 1: Account Creation + Login + Success Page CTA (AUTH-01, AUTH-04)

**`/account/create?filingId=xxx`** — server component reads `filerEmail` / `filerInfo.email` from Filing by `filingId`, passes `defaultEmail`, `defaultName`, `filingId` as props to `AccountCreateForm` client component.

`AccountCreateForm` client component:
- Pre-fills email (read-only with `aria-label`) and name from filerInfo
- Client-side validation: required fields, password ≥ 8 chars, password match
- POSTs to `/api/auth/register` with `{name, email, password, filingId}`
- On 201: auto-logs in with `signIn('credentials', {email, password, redirect: false})`, then `router.push('/account/filings')`
- On 409 (`email_taken`): error card with link to /login
- On 400/500: generic error card
- Loading state: `Loader2` spinner + disabled button with `aria-busy`/`aria-disabled`

**`/login`** — client component:
- Email + password form with credentials sign-in
- On error: clears password, retains email, shows "Incorrect email or password" alert
- On success: `router.push('/account/filings')`

**Success page CTA** updated: `href={`/account/create?filingId=${filing.id}`}` — resolves RESEARCH.md Pitfall 5 (email pre-fill requires filingId parameter).

### Task 2: Filing History + PDF Proxy (AUTH-07)

**`/account/filings`** — server component:
- `auth()` session check; redirects to `/login` if unauthenticated
- Queries `prisma.filing.findMany({ where: { userId: session.user.id } })`
- Renders filing cards with: receipt ID, business name, filed date, status badge
- Status badges: filed/paid → dark, failed → accent, in-progress → muted
- PDF download link: `<a href="/api/filings/{id}/pdf">` — conditional on `complaintPdfUrl` not null
- Empty state: "No filings yet." + explanatory copy

**`/api/filings/[id]/pdf`** — GET route (PDF proxy):
1. Verifies `session?.user?.id` (401 if unauthenticated)
2. Finds filing by `params.id`, checks `filing.userId === session.user.id` (404 if mismatch or not found)
3. Checks `filing.complaintPdfUrl` exists (404 if null)
4. Fetches private Blob URL server-side, streams `ArrayBuffer` to client with `Content-Type: application/pdf` and `Content-Disposition: inline; filename="EFC_Filing_{receiptId}.pdf"`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] bcryptjs not installed in worktree node_modules**
- **Found during:** Task 2 full test run
- **Issue:** `bcryptjs` was in `package.json` but `node_modules/bcryptjs` was missing from the worktree (worktrees don't automatically inherit all package installs). `register.test.ts` failed with `ERR_MODULE_NOT_FOUND`.
- **Fix:** `npm install --prefer-offline` in the worktree to install all dependencies
- **Files modified:** None (package.json unchanged)
- **Commit:** None (npm install, not a code change)

**2. [Rule 2 - Pattern] Tests adapted to server component testing pattern**
- **Found during:** Task 1 test creation
- **Issue:** Plan spec referenced `@testing-library/react` which is not installed in this project. Existing tests use `JSON.stringify(result)` to assert on server component JSX output.
- **Fix:** Rewrote page tests using the project's established `JSON.stringify(result)` pattern. Login page (client component) tested by verifying module exports and mock behavior.
- **Files modified:** page.test.tsx files (no behavior change)
- **Commit:** fbad126 (included in Task 1 commit)

## Checkpoint Awaiting

Task 3 is `type="checkpoint:human-verify"` — requires human verification of the complete end-to-end guest-to-account conversion flow in a running dev environment.

## Known Stubs

None — all functionality is wired. The PDF proxy correctly fetches from `complaintPdfUrl` (set by Plan 03's `storeComplaintPdf`). The filing history page shows real data from Prisma.

## Self-Check: PASSED (Tasks 1-2 only)

- src/app/account/create/page.tsx: FOUND
- src/app/account/create/AccountCreateForm.tsx: FOUND
- src/app/login/page.tsx: FOUND
- src/app/account/filings/page.tsx: FOUND
- src/app/api/filings/[id]/pdf/route.ts: FOUND
- Commit fbad126: FOUND (Task 1)
- Commit 7aab40d: FOUND (Task 2)
- 130/130 tests passing: VERIFIED
