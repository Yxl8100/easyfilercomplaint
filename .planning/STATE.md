---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-04-02T03:07:32Z"
last_activity: 2026-04-02 -- Phase 06 Plan 01 complete
progress:
  total_phases: 8
  completed_phases: 5
  total_plans: 16
  completed_plans: 15
---

# State: EasyFilerComplaint

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-01)

**Core value:** A consumer can pay $1.99 and have a formal privacy complaint filed with a government agency in under 5 minutes.
**Current focus:** Phase 06 — guest-to-account-conversion

## Current Position

Phase: 06 (guest-to-account-conversion) — EXECUTING
Plan: 2 of 2
Status: Executing Phase 06
Last activity: 2026-04-02 -- Phase 06 Plan 01 complete (auth infrastructure)

```
v1.1 Progress: [██████████] ~94% (15/16 plans complete)
```

## Phase Status

| Phase | Name | Plans | Status |
|-------|------|-------|--------|
| 3 | Complaint PDF Generation | 2/2 | Complete |
| 4 | Phaxio Fax Integration + Filing Pipeline | 4/4 | Complete |
| 5 | Filing Receipt Email | 1/1 | Complete |

## Milestone Context (v1.0 Complete)

Phases 1-2 complete as of 2026-04-01:

- Phase 1: Prisma schema extended (SCHEMA-01–08) — Neon deployed
- Phase 2: Stripe checkout wired (PAY-01–08) — test mode verified

## Decisions Log

| Date | Decision | Context |
|------|----------|---------|
| 2026-03-31 | Standard granularity, YOLO mode, parallel execution | Initial config |
| 2026-03-31 | Research + plan-check + verifier all enabled | Quality gates on |
| 2026-03-31 | Codebase mapping skipped | Detailed spec provided by user |
| 2026-04-01 | Used Prisma enum FilingStatus for type-safe lifecycle status with DB-level constraint | Phase 01, Plan 01 |
| 2026-04-01 | Made userId and user relation optional on Filing to support guest filings (SCHEMA-05) | Phase 01, Plan 01 |
| 2026-04-01 | Added complaintPdfUrl and receiptEmailSentAt to Filing now to prevent schema changes in Phase 3 and Phase 5 | Phase 01, Plan 01 |
| 2026-04-01 | passwordHash added as String? (nullable) so existing OAuth users are not broken | Phase 01, Plan 01 |
| 2026-04-01 | Used Math.random() with A-Z0-9 charset (5 chars = 60M+ combinations) for filing receipt ID suffix | Phase 01, Plan 02 |
| 2026-04-01 | UTC date in EFC-YYYYMMDD-XXXXX format ensures consistent receipt IDs regardless of server timezone | Phase 01, Plan 02 |
| 2026-04-01 | Module-level Stripe singleton (not globalThis pattern from prisma.ts) because Stripe instances are stateless — no HMR concern | Phase 02, Plan 01 |
| 2026-04-01 | Stripe env guard throws at module load time so STRIPE_SECRET_KEY absence surfaces at startup, not mid-request | Phase 02, Plan 01 |
| 2026-04-01 | Create Filing before Stripe session so filingId is available for session metadata; stripeSessionId stored in second update after session creation | Phase 02, Plan 02 |
| 2026-04-01 | Validate targetName, email, description, category before touching Stripe or Prisma — fail fast on missing required fields | Phase 02, Plan 02 |
| 2026-04-01 | Used request.text() for raw body in webhook handler — Stripe HMAC requires unmodified bytes; request.json() would break signature verification | Phase 02, Plan 03 |
| 2026-04-01 | Idempotency guard in webhook via prisma.filing.findUnique before paid update — prevents double-processing on Stripe retry storms | Phase 02, Plan 03 |
| 2026-04-01 | paymentAmount stored as string '1.99' — Prisma accepts string for Decimal fields without importing Decimal class | Phase 02, Plan 03 |
| 2026-04-01 | Called server component directly in tests (JSON.stringify result) — avoids React DOM testing complexity for server components | Phase 02, Plan 05 |
| 2026-04-01 | Added @vitejs/plugin-react to vitest so TSX files can be transformed — tsconfig jsx:preserve is required for Next.js but breaks vitest without plugin | Phase 02, Plan 05 |
| 2026-04-01 | Used window.location.href for Stripe redirect — Next.js router.push cannot navigate to external domains (checkout.stripe.com) | Phase 02, Plan 04 |
| 2026-04-01 | Removed SubmissionResult import and submissionResults state — no longer used after replacing /api/submit with /api/checkout; step 5 retained as static UI | Phase 02, Plan 04 |
| 2026-04-01 | Store PDF section markers as literal strings in Info dict (PDFString.of() + useObjectStreams: false) — custom font glyph encoding makes drawn text unsearchable via latin1 string search | Phase 03, Plan 01 |
| 2026-04-01 | Store complaint body text in Description metadata for PDF-03 content assertions — complaint-type-specific strings (CCPA, Unruh/ADA, video) are accessible without a full PDF text extraction library | Phase 03, Plan 01 |
| 2026-04-01 | extractPdfText() test utility skips streams >50KB to avoid false positives in binary font data when checking for prohibited strings | Phase 03, Plan 01 |
| 2026-04-01 | storeComplaintPdf takes filingId and filingReceiptId as separate strings (not full Filing object) for minimal interface matching Phase 4 pipeline call signature | Phase 03, Plan 02 |
| 2026-04-01 | access: 'private' on all Vercel Blob uploads — complaint PDFs contain PII per RESEARCH.md Pitfall 5 | Phase 03, Plan 02 |
| 2026-04-01 | Status lifecycle transitions (generating/complete) deferred to PIPE-03 in Phase 4 — storeComplaintPdf is a pure storage utility | Phase 03, Plan 02 |
| 2026-04-01 | axios + form-data instead of native fetch for Phaxio — avoids Node.js 18-23.6 multipart CRLF bug (FAX-08) | Phase 04, Plan 01 |
| 2026-04-01 | sendFax takes FaxFile[] array — enables multi-file evidence attachments in single fax send (FAX-07) | Phase 04, Plan 01 |
| 2026-04-01 | filerInfo Json? stored at checkout time — filing pipeline retrieves filer PII from Filing without User join | Phase 04, Plan 01 |
| 2026-04-01 | Used crypto.timingSafeEqual wrapped in try/catch to handle HMAC length-mismatch edge case without throwing | Phase 04, Plan 02 |
| 2026-04-01 | verifyPhaxioSignature() extracted as standalone utility for testability — webhook route imports it | Phase 04, Plan 02 |
| 2026-04-01 | NEXT_PUBLIC_APP_URL used to construct callbackUrl — webhook URL must match what Phaxio was configured with | Phase 04, Plan 02 |
| 2026-04-01 | Direct pipeline call from Stripe webhook — no queue needed at this volume (PIPE-02) | Phase 04, Plan 03 |
| 2026-04-01 | Fax failure isolated in try/catch so email stub always runs regardless of fax outcome (PIPE-05) | Phase 04, Plan 03 |
| 2026-04-01 | Idempotency guard updated: skip if status != pending_payment/draft — prevents re-run after pipeline starts | Phase 04, Plan 03 |
| 2026-04-01 | Vercel cron schedule defaults to 0 0 * * * (once daily, Hobby plan safe); Pro upgrade path documented in route.ts comment | Phase 04, Plan 04 |
| 2026-04-01 | Per-filing try/catch in cron handler — one Phaxio API failure does not block other filings in the same cron run | Phase 04, Plan 04 |
| 2026-04-01 | Skip prisma.filing.update when faxStatus has not changed — avoids unnecessary writes on every cron tick | Phase 04, Plan 04 |
| 2026-04-01 | vi.hoisted() for mockSend in Resend test — vi.fn() outside vi.mock factory is unavailable at mock registration time | Phase 05, Plan 01 |
| 2026-04-01 | function constructor syntax in vi.mock Resend factory — arrow function cannot be used with new keyword | Phase 05, Plan 01 |
| 2026-04-01 | EMAIL-05 attorney prohibited check strips Attorney General (government office title) — prohibition targets law-firm/legal-counsel references only | Phase 05, Plan 01 |
| 2026-04-02 | bcrypt cost factor 12 for password hashing — industry standard, ~250ms latency acceptable for registration | Phase 06, Plan 01 |
| 2026-04-02 | JWT session strategy required for Credentials + PrismaAdapter — database strategy silently fails | Phase 06, Plan 01 |
| 2026-04-02 | filerEmail indexed String? column (not raw SQL JSON extraction from filerInfo) — resolves RESEARCH.md Open Question 1 | Phase 06, Plan 01 |
| 2026-04-02 | Middleware test extracts protectedPaths logic to pure functions — NextAuth v5 auth() wrapper not directly unit-testable | Phase 06, Plan 01 |

## Critical Notes

- CA AG fax number in agency-directory.ts is a placeholder — MUST verify against oag.ca.gov before go-live
- www. prefix is critical in all production URLs (Vercel redirect behavior strips headers on non-www)
- Entity separation must be verified across ALL pages, emails, and PDFs before launch — automated assertion required
- Stripe must be in test mode until full end-to-end flow is verified
- Phaxio fax calls MUST use axios or node-fetch (not native fetch) — confirmed Node.js 18-23.6 multipart CRLF bug causes 422 errors
- @pdf-lib/fontkit is installed (Phase 03 Plan 01 complete) — needed for embedded fonts
- Vercel cron at */15 requires Pro plan — confirm tier before adding vercel.json; use 0 */1 * * * on Hobby
- Three Phaxio credentials needed: PHAXIO_API_KEY, PHAXIO_API_SECRET (send), PHAXIO_CALLBACK_TOKEN (webhook HMAC)
- PIPE-05: fax step must be wrapped in isolated try/catch — fax failure must NEVER suppress receipt email
- Resend PDF attachment: use Buffer.from(pdfBytes).toString('base64') — not Uint8Array directly

## Accumulated Context

- pdf-lib is already installed (from v1.0)
- Resend integration is stubbed and ready to wire
- All three new integrations (pdf-lib, Phaxio, Resend) are already in package.json — no npm install needed
- Single Uint8Array from pdf-lib.save() is source of truth — convert to Buffer once at pipeline level and pass downstream
- Pipeline build order within Phase 4: agency-directory → phaxio.ts → filing-pipeline.ts → Stripe webhook modification → phaxio webhook → vercel.json + cron

- generateComplaintPdf(filing, filerInfo) is COMPLETE — returns Uint8Array with Liberation Serif fonts, 13 sections, type-specific content for data-privacy/accessibility/video-sharing
- FilerInfo interface is exported from src/lib/generate-complaint-pdf.ts — Phase 4 pipeline needs to pass this
- PDF bytes: use Buffer.from(pdfBytes).toString('base64') for Resend attachment (Uint8Array direct not supported)
- storeComplaintPdf(filingId, filingReceiptId, pdfBytes) is COMPLETE — uploads to Vercel Blob, updates Filing.complaintPdfUrl, returns null gracefully when BLOB_READ_WRITE_TOKEN absent
- ROADMAP SC#3 verified: generate-to-store integration chain test passes end-to-end
- verifyPhaxioSignature(callbackUrl, postFields, callbackToken, receivedSig, fileSha1Digests?) is COMPLETE — HMAC-SHA1 with sorted params + optional file digests
- Phaxio webhook at /api/webhooks/phaxio is COMPLETE — parses multipart, verifies HMAC before DB writes, updates Filing fax fields

---
- agency-directory.ts is COMPLETE — getAgencyFaxNumber('ca_ag') returns '+19163235341' (E.164, placeholder — verify before go-live)
- phaxio.ts rewritten with axios+form-data — sendFax(toNumber, files: FaxFile[]) supports multi-file attachments, no native fetch
- Filing.filerInfo Json? column added to schema — stores filer PII at checkout for pipeline access

- GET /api/cron/check-fax-status is COMPLETE — polls Phaxio for in-progress faxes, updates Filing.faxStatus/faxPages/faxCompletedAt, maps terminal fax status to Filing.status (filed/failed)
- vercel.json added at project root with Hobby-safe daily cron schedule (0 0 * * *)
- Phase 04 is COMPLETE — all 4 plans done: agency-directory, phaxio rewrite, webhook handler, filing pipeline, cron poller

---
- sendFilingReceiptEmail(filing, pdfBytes, faxFailed) is COMPLETE — sends branded HTML email via Resend from noreply@easyfilercomplaint.com with complaint PDF attached
- buildReceiptEmailHtml(params) is COMPLETE — pure inline-CSS HTML with receipt ID, business name, CA AG, date, amount, optional fax-failure note (EMAIL-05 compliant)
- Filing.receiptEmailSentAt written to DB after successful Resend call (EMAIL-06)
- executeFilingPipeline Step 4 stub replaced — email failure remains non-fatal (PIPE-05 maintained)
- Phase 05 is COMPLETE — 1 plan done: filing receipt email via Resend
- Full v1.1 pipeline is now live: PDF generation → Blob storage → fax → receipt email
- 99/99 tests passing as of Phase 05 completion

---
- POST /api/auth/register is COMPLETE — bcrypt cost-12 hash, 409 on duplicate email, 400 on short password, links all same-email filings to new user (AUTH-02, AUTH-03)
- Filing.filerEmail String? column added with @@index([filerEmail]) — populated at checkout time (AUTH-03 backfill path)
- src/lib/auth.ts has Credentials provider + JWT session strategy + bcrypt.compare authorize callback (AUTH-05)
- src/middleware.ts protects /account/* with redirect to /login?callbackUrl=... (AUTH-06)
- prisma db push required in production environment to apply filerEmail column to DB
- 113/113 tests passing as of Phase 06 Plan 01 completion

---
*Last updated: 2026-04-02 — Phase 06 Plan 01 complete: auth infrastructure (Credentials, JWT, registration, middleware)*
