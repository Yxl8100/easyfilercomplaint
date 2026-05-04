# Milestones: EasyFilerComplaint

---

## v2.0 — Triple-Filing (CPPA + CA AG + PDF)

**Shipped:** 2026-05-03
**Phases:** 9–11 (3 phases, 9 plans)
**Files:** 14 source files (+1,513 net LOC)
**Tests:** 206 passing

### Delivered

Every $1.99 filing now has three government submission channels: consumers get a guided CPPA online form walkthrough with pre-written copy-paste answers, a downloadable CPPA paper complaint PDF matching the official form layout, and an auto-faxed complaint to the CA Attorney General — all generated from a single natural-language narrative engine.

### Key Accomplishments

1. **CPPA Narrative Generator** (`src/lib/cppa-complaint-generator.ts`) — `generateCPPAComplaint(filing)` produces all 7 CPPA form question answers as natural first-person text ≤2000 chars with no statute citations; drives all three filing channels
2. **CA AG PDF Restructured** (`src/lib/generate-complaint-pdf.ts`) — rebuilt from legal-letter style to 6-section form layout (Your Information, Business Information, Complaint, Resolution, Prior Contact, Affirmation) with zero statute citations or "N/A" placeholders
3. **3-Channel Success Page** (`src/app/filing/[id]/success/page.tsx`) — redesigned with CPPA Online (★ Recommended), CPPA Paper Mail, and CA AG (Auto-Filed ✓) sections; ADA filings show CA AG only
4. **CPPA Guided Filing Page** (`src/app/filing/[id]/cppa-guide/page.tsx`) — server-side RSC with CopyButton component; UUID-only access (no login wall); links to cppa.ca.gov in new tab
5. **CPPA Paper PDF Generator** (`src/lib/cppa-pdf-generator.ts`) — 10-section form PDF mirroring official CPPA paper layout; embedded LiberationSerif fonts; perjury attestation with blank signature line
6. **CPPA PDF Download Route** (`src/app/api/filings/[id]/cppa-pdf/route.ts`) — on-demand generation; Blob storage at `complaints/cppa/`; graceful BLOB_READ_WRITE_TOKEN fallback; UUID-only access

### Stats

- Requirements: 25/25 v2.0 requirements complete
- Test suite: 206/206 passing (0 regressions across all 3 phases)
- Code reviews: 3 phases reviewed; 9/11 findings fixed in Phase 11
- Deferred: 3 Phase 9 human UAT items (visual layout, fax label UX, now-moot Phase 10/11 404s)

### Known Deferred Items at Close: 3 (see STATE.md Deferred Items)

### Archive

- Roadmap: `.planning/milestones/v2.0-ROADMAP.md`
- Requirements: `.planning/milestones/v2.0-REQUIREMENTS.md`

---

## v1.0 — Live Filing Pipeline

**Shipped:** 2026-04-02 (Phases 1–7 complete; Phase 8 deferred)
**Phases:** 1–7 (7 phases, ~19 plans)

### Delivered

Stripe $1.99 checkout → complaint PDF generation → CA AG fax via Sinch → filing receipt email via Resend → guest-to-account conversion → landing page + legal pages. Full end-to-end pipeline for consumer privacy complaint filing.

### Key Accomplishments

1. Prisma schema for full filing lifecycle (Stripe + fax + receipt fields)
2. Stripe Checkout + webhook integration — payment confirmation triggers pipeline
3. Complaint PDF generation with embedded fonts (pdf-lib + @pdf-lib/fontkit)
4. Sinch fax pipeline to CA AG with HMAC-SHA1 webhook verification
5. Resend receipt email with PDF attachment
6. Guest-to-account conversion with filing history at /account/filings
7. Landing page with "How It Works" + FAQ + legal pages (privacy, terms, about)

### Known Gaps

- Phase 8 (WIZ-01–07: Wizard UX adjustments) — planned but not executed; carried into v3.0 planning

---

_Last updated: 2026-05-03_
