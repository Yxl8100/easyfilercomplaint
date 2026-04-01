---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
last_updated: "2026-04-01T19:07:30.241Z"
last_activity: 2026-04-01
progress:
  total_phases: 8
  completed_phases: 3
  total_plans: 13
  completed_plans: 10
---

# State: EasyFilerComplaint

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-01)

**Core value:** A consumer can pay $1.99 and have a formal privacy complaint filed with a government agency in under 5 minutes.
**Current focus:** Phase 04 — phaxio-fax-integration-filing-pipeline

## Current Position

Phase: 04 (phaxio-fax-integration-filing-pipeline) — EXECUTING
Plan: 2 of 4 (completed)
Status: Executing Phase 04
Last activity: 2026-04-01 — Phase 04 Plan 02 complete: Phaxio webhook handler with HMAC-SHA1 verification

```
v1.1 Progress: [███░░░░░░░] 1/3 phases complete
```

## Phase Status

| Phase | Name | Plans | Status |
|-------|------|-------|--------|
| 3 | Complaint PDF Generation | 0/? | Not started |
| 4 | Phaxio Fax Integration + Filing Pipeline | 0/? | Not started |
| 5 | Filing Receipt Email | 0/? | Not started |

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
| 2026-04-01 | Used crypto.timingSafeEqual wrapped in try/catch to handle HMAC length-mismatch edge case without throwing | Phase 04, Plan 02 |
| 2026-04-01 | verifyPhaxioSignature() extracted as standalone utility for testability — webhook route imports it | Phase 04, Plan 02 |
| 2026-04-01 | NEXT_PUBLIC_APP_URL used to construct callbackUrl — webhook URL must match what Phaxio was configured with | Phase 04, Plan 02 |

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
*Last updated: 2026-04-01 — Phase 04 Plan 02 complete: Phaxio webhook handler with HMAC-SHA1 verification implemented*
