# EasyFilerComplaint — CLAUDE.md
## Last Updated: May 8, 2026

## Project Overview
Consumer complaint filing platform. Users pay $1.99 to file privacy/accessibility complaints against websites via three channels: CPPA online (guided), CPPA paper (PDF), and CA Attorney General (auto-faxed). Live at **easyfilercomplaint.com**.

- **Framework:** Next.js 14 (App Router) on Vercel
- **Database:** Neon Postgres (ep-proud-scene-a42ep5hb) via Prisma
- **Auth:** NextAuth.js
- **Email:** Resend (receipts + notifications)
- **Payments:** Stripe ($1.99/filing) — shares account with APFCompliant
- **Fax:** Sinch (replaced Phaxio) — $0.045/page, pay-as-you-go
- **PDF:** pdf-lib for complaint PDFs
- **Blob Storage:** Vercel Blob (easyfilercompliant-blob) for complaint PDFs
- **Repo:** https://github.com/Yxl8100/easyfilercomplaint → branch **master**
- **Deploy:** Vercel auto-deploy from master

---

## Key Rules (MUST FOLLOW)

- **Entity separation:** No references to PV, DPW, APFC, IV, or ComplianceSweep anywhere
- **Not a law firm:** EFC generates complaint text — user submits it themselves. No legal advice given.
- **Fax is filed on behalf of the user**, not on behalf of any law firm
- **Spelling:** easy**filer**complai**nt**.com (not "compliant")
- **Git:** Push to **master**. `git config user.email "wiylee@gmail.com" && git config user.name "Yxl8100"`
- **Webhook URLs** must use www. prefix

---

## Current Version: v2.0 Triple-Filing (May 3, 2026)

### Three Filing Channels
1. **CPPA Online** (★ Recommended) — guided copy-paste flow to cppa.ca.gov complaint form. Highest enforcement impact.
2. **CPPA Paper PDF** — downloadable 10-section PDF complaint with perjury attestation, embedded LiberationSerif fonts.
3. **CA AG Fax** (auto-filed) — Sinch fax to +19163235341 (2 pages). Status: QUEUED → may error (code 22 on AG fax machine).

### Filing Flow
1. User completes wizard (target website, visit details, complaint type)
2. Stripe checkout ($1.99)
3. Stripe webhook fires → triggers filing pipeline
4. Pipeline generates: complaint narrative (CPPA answers), AG PDF, Sinch fax
5. Success page shows all three channels with status
6. Receipt email sent via Resend

### ADA Complaints
- Show only CA AG channel (CPPA doesn't handle ADA)

---

## Infrastructure (all set up May 3, 2026)

### Sinch Fax (replaced Phaxio)
- **Project ID:** 5aa6eabc-b6b3-4513-a73e-e1bbcbbc91f2
- **API:** `https://fax.api.sinch.com/v3/projects/{projectId}/faxes`
- **Auth:** Basic auth (SINCH_ACCESS_KEY:SINCH_ACCESS_SECRET, Base64)
- **Status normalization:** Sinch SUCCEEDED/FAILED/IN_PROGRESS/QUEUED → app success/failure/inprogress/queued
- **Fax IDs:** UUID strings (not numbers like Phaxio)
- **Test number:** +19898989898
- **Trial:** $2.00 credits, 30 days. Upgrade when ready for live faxes.

### Stripe
- $1.99 "Complaint Filing Fee" product
- Webhook: `https://www.easyfilercomplaint.com/api/webhooks/stripe`
- Events: checkout.session.completed

### Neon Database
- Project: ep-proud-scene-a42ep5hb (created May 3 — had no DB before)
- Note: `channel_binding=require` removed from local connection string (Prisma CLI incompatible, Vercel runtime handles it fine)

---

## Key Files
- `src/lib/sinch-fax.ts` — Sinch Fax v3 client (native fetch, basic auth)
- `src/lib/cppa-complaint-generator.ts` — generates all 7 CPPA question answers
- `src/lib/generate-complaint-pdf.ts` — 6-section AG consumer form PDF
- `src/lib/cppa-pdf-generator.ts` — 10-section CPPA paper complaint PDF with embedded fonts
- `src/lib/filing-pipeline.ts` — orchestrates PDF generation + fax + receipt email
- `src/lib/actions.ts` — signOutAction (extracted for client component compatibility)
- `src/middleware.ts` — route protection; `publicPaths = ['/account/create']`
- `app/api/webhooks/stripe/route.ts` — Stripe webhook handler
- `app/filing/[id]/cppa-guide/page.tsx` — guided CPPA copy-paste page with CopyButton
- `app/success/page.tsx` — three-channel layout showing filing status

---

## CPPA Guide Page
- 4 copy sections (Q2 business name, Q4 complaint description, Q5 supporting materials, Q7 contact info)
- Q1 shows checkbox checklist (visual only)
- "Open CPPA Complaint Form" button → cppa.ca.gov
- UUID-as-access-token model (no auth required)
- CopyButton.tsx — client component with clipboard API, "Copied!" feedback

---

## Auth
- NextAuth.js with email/password
- Guest filings link to accounts on sign-in (signIn callback matches by filerEmail + null userId)
- Masthead is async server component — shows Sign Out when logged in

---

## Environment Variables (Vercel)
```
DATABASE_URL=<Neon ep-proud-scene>
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRICE_ID=
STRIPE_WEBHOOK_SECRET=
SINCH_PROJECT_ID=5aa6eabc-b6b3-4513-a73e-e1bbcbbc91f2
SINCH_ACCESS_KEY=
SINCH_ACCESS_SECRET=
RESEND_API_KEY=
NEXTAUTH_URL=
NEXTAUTH_SECRET=
BLOB_READ_WRITE_TOKEN=  (auto-added by Vercel)
```

**Note:** Vercel "sensitive" vars are hidden in dashboard and can't be pulled back. Delete and re-add to change. Code has hardcoded fallback URLs for critical values.

---

## Tests
- 206/206 passing as of v2.0
- Covers: CopyButton (4), CPPA guide page (7), Sinch fax client, filing pipeline, auth, middleware

---

## Cost Structure
- Sinch fax: ~$0.09/filing (2 pages × $0.045)
- Resend receipt: ~$0.001
- Vercel Blob: negligible
- **Total cost per filing: ~$0.10**
- **Revenue per filing: $1.99**
- **Margin after Stripe (2.9% + $0.30): ~$1.53 (77%)**

---

## First Filing
- **Ref:** EFC-20260503-SB8LL
- Wizard → Stripe ($1.99 test) → PDF → Sinch fax → Receipt email
- Fax sent to CA AG: +19163235341 (2 pages)
- Fax error code 22 ("bad response to DCS or training") — likely AG fax machine protocol issue

---

## Pending

### Pre-Launch Blockers
- [ ] Verify CA AG fax number (+19163235341) against oag.ca.gov
- [ ] Test full triple-filing flow on live site after v2.0 deploy
- [ ] Verify Masthead auth state display
- [ ] Clean up test filings in Neon database
- [ ] Upgrade Sinch from trial when ready ($0.045/page, no monthly fee)

### Deferred
- [ ] Phase 6: Guest-to-account conversion improvements
- [ ] Phase 7: Landing pages + legal pages
- [ ] Phase 8: Wizard UX improvements (deferred from v1.0 and v2.0)
- [ ] Evidence-to-fax attachment (evidence in Blob but not passed to fax)
- [ ] UI UX Pro Max design pass
- [ ] FCC/FTC complaint channels
- [ ] Spec review with James (sworn vs unsworn default, tracker specificity, pricing)

---

## Key Learnings
1. **Vercel sensitive env vars** — stored but hidden. Can't view/edit/pull. Delete and re-add to change.
2. **Phaxio → Sinch** — v3 API not backwards compatible (different auth, endpoints, field names).
3. **No fax number needed for outbound** — Sinch handles originating number.
4. **CPPA is primary privacy enforcer** — CA AG directs consumers to CPPA for CCPA violations since July 2023.
5. **`channel_binding=require`** — Neon security feature. Prisma CLI locally doesn't support it; remove from local connection strings only.

---

*This file is the single source of truth for this repo. Updated after each session alongside PROJECT_STATUS_CURRENT.md in Claude project knowledge.*
