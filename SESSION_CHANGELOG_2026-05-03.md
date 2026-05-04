# SESSION CHANGELOG — 2026-05-03

## Project: EasyFilerComplaint
## Duration: Full session
## Milestone Completed: v2.0 Triple-Filing (CPPA + CA AG + PDF)

---

## Infrastructure Setup (from zero)

### Neon Database
- Discovered EFC had no database — code was deployed but all DB operations failed
- Created new Neon project: `easyfilercomplaint` (ep-proud-scene-a42ep5hb)
- Connection string added to Vercel + local .env
- Removed `channel_binding=require` from local connection string (Prisma CLI incompatible, Vercel runtime handles it fine)
- Ran `prisma db push` — created all tables from scratch
- Old mystery `ep-wandering-wave` connection string in Vercel replaced

### Stripe
- EFC shares Stripe account with APFCompliant (entity separation OK — both defense/compliance side)
- Created $1.99 "Complaint Filing Fee" product
- Set `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_ID` in Vercel
- Created Stripe webhook endpoint: `https://www.easyfilercomplaint.com/api/webhooks/stripe`
- Events: `checkout.session.completed`
- Added `STRIPE_WEBHOOK_SECRET` to Vercel

### Sinch (Fax — replacing Phaxio)
- Phaxio acquired by Sinch — new accounts redirect to Sinch Build
- Created Sinch account, selected Fax product
- Project ID: `5aa6eabc-b6b3-4513-a73e-e1bbcbbc91f2`
- Access Key + Secret generated and added to Vercel as `SINCH_PROJECT_ID`, `SINCH_ACCESS_KEY`, `SINCH_ACCESS_SECRET`
- No fax number purchase needed — outbound-only faxing doesn't require a "from" number
- Test fax number: `+19898989898` (simulates without charging)
- Sinch pricing: $0.045/page, no monthly fee, pay-as-you-go
- $2.00 test credits, 30 days trial

### Vercel Blob Storage
- Created `easyfilercomplaint-blob` store (separate from IV's blob — entity separation)
- `BLOB_READ_WRITE_TOKEN` auto-added by Vercel
- Stores complaint PDFs for user download

### Vercel Environment Variables
- Discovered Vercel now defaults to "sensitive" vars — values hidden in dashboard, can't be pulled back via CLI
- Workaround: values are stored and available at runtime even though they show as `••••••••••`
- Added hardcoded fallback URLs in code to avoid dependency on env vars that might be empty

---

## Bug Fixes

### Signup "Create one free" link broken
- **Root cause:** Middleware protected all `/account/*` routes including `/account/create`
- **Fix:** Added `publicPaths = ['/account/create']` bypass in `src/middleware.ts`
- Updated corresponding test
- 159/159 tests passing

### Stripe checkout "Failed to create checkout session"
- **Root cause 1:** Code used `process.env.NEXT_PUBLIC_APP_URL` for `success_url` — env var was empty
- **Fix:** Added fallback: `process.env.NEXT_PUBLIC_APP_URL || 'https://www.easyfilercomplaint.com'`
- **Root cause 2:** Domain spelling — code had `easyfilercompliant.com` (compliant) instead of `easyfilercomplaint.com` (complaint)
- **Fix:** Corrected spelling in checkout route

### Sinch fax TypeScript build error
- **Root cause:** `Buffer` not assignable to `BlobPart` in `sinch-fax.ts`
- **Fix:** Wrapped in `new Uint8Array(f.buffer)` before passing to `Blob` constructor

### Auth session not persisting (nav shows "Sign In" when logged in)
- **Root cause:** `Masthead.tsx` was static — never checked auth state
- **Fix:** Made Masthead async, calls `auth()`, renders conditionally (Sign Out when logged in, Sign In when not)
- Also extracted `signOutAction` to separate `src/lib/actions.ts` file (inline `"use server"` not allowed in client components)

### Guest filings not linking to accounts on sign-in
- **Fix:** Added `signIn` callback in `auth.ts` that links unattached filings (matching `filerEmail`, null `userId`) to the signing-in user

### PDF template issues
- Visit date showing "N/A" → now formats as "March 2026"; falls back to "a recent date"
- Orphaned description text → integrated with `{{#if description}}Specifically, I observed: {{description}}{{/if}}`
- Company address/phone/county "N/A" → `__OMIT__` sentinel removes entire lines with empty fields
- Redundant "various tracking technologies" → rewritten to static descriptive text

---

## Phaxio → Sinch Migration

- Deleted: `src/lib/phaxio.ts` and tests
- Created: `src/lib/sinch-fax.ts` — Sinch Fax v3 client using native fetch
- Basic auth from `SINCH_ACCESS_KEY:SINCH_ACCESS_SECRET` (Base64 encoded)
- Endpoint: `https://fax.api.sinch.com/v3/projects/{projectId}/faxes`
- Status normalization: Sinch uppercase (SUCCEEDED, FAILED, IN_PROGRESS, QUEUED) → app lowercase (success, failure, inprogress, queued)
- Fax IDs changed from number (Phaxio) to UUID string (Sinch)
- Updated: `submit-fax.ts`, `filing-pipeline.ts`, `check-fax-status/route.ts`, `fax-status/[faxId]/route.ts`, `privacy/page.tsx`
- 164/164 tests passing after migration

---

## End-to-End Test Results

### First successful filing: EFC-20260503-SB8LL
- Wizard → Stripe ($1.99 test payment) → PDF generated → Sinch fax sent → Receipt email delivered
- Fax sent to CA AG: +19163235341 (2 pages)
- Fax status: QUEUED → Error code 22 ("bad response to DCS or training") — likely AG fax machine protocol issue, not code bug
- Receipt email sent to wiylee@gmail.com via Resend
- Stripe webhook fired correctly: `/api/webhooks/stripe` returned 200
- External API calls confirmed: `fax.api.sinch.com` 200, `api.resend.com` 200
- Warning: `BLOB_READ_WRITE_TOKEN not set` (fixed later by connecting blob store)

---

## Milestone v2.0: Triple-Filing (CPPA + CA AG + PDF)

### Strategic Pivot
- Discovered CPPA (California Privacy Protection Agency) is now the primary privacy enforcer, not the CA AG
- CA AG website directs consumers to file privacy complaints with CPPA
- Faxed complaints are paper → manual data entry → lowest priority
- CPPA online complaints go directly into digital enforcement database → highest impact
- Pivot: from single-channel fax to triple-filing approach

### Phase 9: Complaint Narrative Engine + AG PDF + Success Page (4 plans)
- `cppa-complaint-generator.ts` — generates all 7 CPPA question answers; natural first-person narrative, ≤2000 chars, no statute citations
- `generate-complaint-pdf.ts` — restructured from 13-section legal letter to 6-section consumer form (Your Info, Business Info, Complaint, Resolution, Prior Contact, Affirmation)
- `success/page.tsx` — three-channel layout: CPPA Online (★ Recommended), CPPA Paper PDF, CA AG (✓ Auto-Filed)
- ADA complaints show only CA AG channel (CPPA doesn't handle ADA)
- Fax status uses normalized labels (Delivered / Delivery Failed / Pending)
- Code review fix: WR-02 fax status normalization

### Phase 10: CPPA Guided Filing Page (2 plans)
- `CopyButton.tsx` — client component with clipboard API, "Copied!" feedback, timer cleanup
- `/filing/[id]/cppa-guide/page.tsx` — server component with 4 copy sections (Q2 business name, Q4 complaint description, Q5 supporting materials, Q7 contact info)
- Q1 shows checkbox checklist (visual only, no copy)
- "Open CPPA Complaint Form" button links to cppa.ca.gov
- UUID-as-access-token model (no auth required — same as success page)
- 11 tests (4 CopyButton + 7 page)

### Phase 11: CPPA Paper Complaint PDF (3 plans)
- `cppa-pdf-generator.ts` — 244-line 10-section CPPA form PDF with embedded LiberationSerif fonts
- Perjury attestation with blank signature line
- Filing ID in footer
- `GET /api/filings/[id]/cppa-pdf` — UUID-only access, Vercel Blob storage, graceful token fallback
- Code review fixes: try/catch on PDF generation, category-specific evidence text, font caching, Content-Length header, null guards

### Final Stats
- 3 phases, 9 plans, 25 requirements — all complete
- 206/206 tests passing
- v2.0 tag created and pushed

---

## Vercel Environment Variables (Final State)

| Variable | Status | Sensitive |
|---|---|---|
| DATABASE_URL | ✅ Set (all envs) | No |
| STRIPE_SECRET_KEY | ✅ Set (production) | Yes |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | ✅ Set (production) | Yes |
| STRIPE_PRICE_ID | ✅ Set (production) | Yes |
| STRIPE_WEBHOOK_SECRET | ✅ Set (production) | Yes |
| SINCH_PROJECT_ID | ✅ Set (production) | Yes |
| SINCH_ACCESS_KEY | ✅ Set (production) | Yes |
| SINCH_ACCESS_SECRET | ✅ Set (production) | Yes |
| RESEND_API_KEY | ✅ Set (all envs) | No |
| NEXTAUTH_URL | ✅ Set (all envs) | No |
| NEXTAUTH_SECRET | ✅ Set (all envs) | No |
| BLOB_READ_WRITE_TOKEN | ✅ Auto-added | Yes |

---

## Remaining Items / Next Session

### Pre-Launch Blockers
- [ ] Verify CA AG fax number (+19163235341) against oag.ca.gov — fax error code 22 may indicate wrong number
- [ ] Test full triple-filing flow on live site after v2.0 deploy
- [ ] Verify Masthead shows "Sign Out" when logged in (auth fix deployed but not confirmed)
- [ ] Clean up "PENDING PAYMENT" test filings in Neon database

### Sinch Account
- [ ] Upgrade from trial when ready for live faxes ($0.045/page, no monthly fee)
- [ ] Current: $2.00 test credits, 30 days trial remaining

### Deferred
- [ ] Phase 8 Wizard UX improvements (deferred twice — v1.0 and v2.0)
- [ ] Evidence-to-fax attachment (evidence stored in Blob but not passed to fax)
- [ ] UI UX Pro Max design pass
- [ ] FCC/FTC complaint channels (future)
- [ ] Spec review with James (open questions: sworn vs unsworn default, tracker specificity, pricing)

---

## Key Learnings

1. **Vercel sensitive env vars** — values are stored but hidden. Can't view, edit, or pull them. Delete and re-add to change. Code should always have hardcoded fallbacks for critical URLs.
2. **Phaxio is now Sinch** — Phaxio v2 API is still live but new signups go to Sinch. v3 API is not backwards compatible (different auth, endpoints, field names).
3. **No fax number needed for outbound** — Sinch handles originating number for outbound-only faxing.
4. **CPPA is the primary privacy enforcer** — CA AG directs consumers to CPPA for CCPA violations since July 2023. CPPA online complaints have highest enforcement impact.
5. **`channel_binding=require`** — Neon's newer security feature; Prisma CLI locally doesn't support it, but Vercel's Node.js runtime handles it fine. Remove from local connection strings only.
6. **EFC repo deploys from master** (not main).
