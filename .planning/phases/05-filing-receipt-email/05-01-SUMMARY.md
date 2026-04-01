---
phase: 05-filing-receipt-email
plan: 01
subsystem: email
tags: [resend, email, pdf-attachment, pipeline, vitest]

# Dependency graph
requires:
  - phase: 04-phaxio-fax-integration
    provides: executeFilingPipeline with email stub at step 4

provides:
  - sendFilingReceiptEmail(filing, pdfBytes, faxFailed) — sends branded HTML email via Resend with PDF attachment
  - buildReceiptEmailHtml(params) — pure function returning inline-CSS HTML email template
  - Filing.receiptEmailSentAt written to DB after successful send
  - Pipeline email stub replaced with live Resend call

affects:
  - future phases referencing email step in pipeline
  - verifier for entity separation (EMAIL-05)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - vi.hoisted() for mocks that must be available before vi.mock factory runs
    - function constructor syntax in vi.mock (not arrow function) for class-like mocks
    - EMAIL-05 prohibited string test: strip government agency title before asserting no law-firm references

key-files:
  created:
    - src/lib/email-receipt.ts
    - src/lib/__tests__/email-receipt.test.ts
  modified:
    - src/lib/filing-pipeline.ts
    - src/lib/__tests__/filing-pipeline.test.ts
    - .env (RESEND_API_KEY placeholder added, gitignored)

key-decisions:
  - "vi.hoisted() used for mockSend and mockPrismaUpdate — vi.fn() outside vi.mock factory is not available at mock registration time"
  - "function constructor syntax in vi.mock Resend factory — arrow function causes 'not a constructor' error since Resend is called with new"
  - "EMAIL-05 prohibited 'attorney' check strips 'Attorney General' (government office title) before asserting — spirit of prohibition is law-firm references, not government agencies"

patterns-established:
  - "Email module pattern: pure buildHtml() + async send() with DB update + guard clauses"
  - "vi.hoisted() for test mocks that feed into vi.mock factory functions"

requirements-completed: [EMAIL-01, EMAIL-02, EMAIL-03, EMAIL-04, EMAIL-05, EMAIL-06]

# Metrics
duration: 25min
completed: 2026-04-01
---

# Phase 05 Plan 01: Filing Receipt Email Summary

**Resend receipt email with branded HTML and complaint PDF attachment wired into executeFilingPipeline, replacing the Phase 4 email stub**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-01T12:40:00Z
- **Completed:** 2026-04-01T13:05:00Z
- **Tasks:** 4
- **Files modified:** 4 (+ .env locally)

## Accomplishments

- `buildReceiptEmailHtml()` — pure function producing inline-CSS HTML with receipt ID, business name, CA AG, date, amount, optional fax-failure note; zero prohibited entity strings
- `sendFilingReceiptEmail()` — sends via Resend from `noreply@easyfilercomplaint.com` with PDF attached, updates `Filing.receiptEmailSentAt` in DB
- `executeFilingPipeline` Step 4 now calls `sendFilingReceiptEmail` (replacing stub); email failure remains non-fatal
- 20 new unit tests (email-receipt) + 3 updated/added pipeline tests — all 99 tests pass

## Task Commits

1. **Task 1: Create email-receipt.ts** - `23ba02f` (feat)
2. **Task 2: Wire email into pipeline + update pipeline tests** - `ff19250` (feat)
3. **Task 3: Create email-receipt.test.ts** - `4204b65` (test)
4. **Task 3 fix: hoisted mocks + attorney test fix** - `fdb6dc2` (fix)

Task 4 (add RESEND_API_KEY to .env): completed locally — .env is gitignored.

## Files Created/Modified

- `src/lib/email-receipt.ts` — `buildReceiptEmailHtml()` and `sendFilingReceiptEmail()` with Resend + Prisma
- `src/lib/__tests__/email-receipt.test.ts` — 20 tests covering EMAIL-01 through EMAIL-06 + prohibited strings
- `src/lib/filing-pipeline.ts` — email stub replaced with `sendFilingReceiptEmail(filing, pdfBytes, faxFailed)`
- `src/lib/__tests__/filing-pipeline.test.ts` — Test 5 updated, Tests 10+11 added (EMAIL-01, email non-fatal)
- `.env` — RESEND_API_KEY placeholder added (local only, gitignored)

## Decisions Made

- `vi.hoisted()` for `mockSend` and `mockPrismaUpdate` — these feed into `vi.mock()` factory functions which run before module-scope code; regular `vi.fn()` at module scope fails with undefined
- `function` constructor syntax in `vi.mock('resend', ...)` factory — arrow function can't be called with `new Resend(...)`, which causes "not a constructor" error in the module under test
- EMAIL-05 "attorney" prohibited-string test: strips "Attorney General" before asserting — the prohibition targets law-firm/attorney-client references (DPW, PV Law, etc.), not the California Attorney General government office title

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] vi.mock Resend factory needs function constructor, not arrow function**
- **Found during:** Task 3 (email-receipt test creation)
- **Issue:** `vi.mock('resend', () => ({ Resend: vi.fn().mockImplementation(() => ...) }))` — the inner `() => {...}` is an arrow function; `new Resend(...)` in the module throws "not a constructor"
- **Fix:** Changed to `function MockResend() { return { emails: { send: mockSend } } }` and used `vi.hoisted()` for `mockSend`
- **Files modified:** `src/lib/__tests__/email-receipt.test.ts`
- **Verification:** All 20 tests pass
- **Committed in:** `fdb6dc2`

**2. [Rule 1 - Bug] EMAIL-05 "attorney" prohibited test conflicts with agency name "California Attorney General"**
- **Found during:** Task 3 (running email-receipt tests)
- **Issue:** `buildReceiptEmailHtml` correctly renders "California Attorney General" as the agency name; case-insensitive test `not.toContain('attorney')` fails because "Attorney General" is a government office title, not a law-firm reference
- **Fix:** Updated test to strip "Attorney General" substring before asserting no "attorney" references remain — preserves EMAIL-05 spirit (no DPW/PV Law/attorney-client references) while allowing the government agency name
- **Files modified:** `src/lib/__tests__/email-receipt.test.ts`
- **Verification:** All 20 tests pass including the corrected prohibited-string check
- **Committed in:** `fdb6dc2`

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs)
**Impact on plan:** Both fixes necessary for tests to compile and pass. No scope creep. Core functionality unchanged.

## Issues Encountered

- Pre-existing TypeScript errors in `src/app/api/webhooks/phaxio/route.ts` and `src/lib/submit-fax.ts` (from Phase 4) — not caused by this plan, not fixed (out of scope per deviation rules). Logged below.

## Known Stubs

None — `sendFilingReceiptEmail` is fully wired and live. `RESEND_API_KEY` must be set to a real value in production env (Vercel dashboard) for emails to actually send.

## User Setup Required

**RESEND_API_KEY** must be set in Vercel dashboard (and local `.env`) before go-live:
- Obtain from resend.com dashboard
- Verify domain `easyfilercomplaint.com` is verified in Resend (covers `noreply@` address since `filings@` already works)
- Local: replace `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx` placeholder in `.env`

## Next Phase Readiness

- Phase 5 complete — full filing pipeline is live: PDF generation → Blob storage → fax → receipt email
- All 99 tests passing
- Pre-existing TS errors in Phase 4 files (`phaxio/route.ts`, `submit-fax.ts`) remain — should be addressed before go-live

---
*Phase: 05-filing-receipt-email*
*Completed: 2026-04-01*
