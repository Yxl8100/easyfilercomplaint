# Phase 2: Stripe Payment Integration - Research

**Researched:** 2026-03-31
**Domain:** Stripe Checkout (one-time payment), Next.js App Router API routes, Prisma FilingStatus lifecycle
**Confidence:** HIGH

---

## Summary

Phase 2 wires Stripe Checkout into the existing EasyFilerComplaint wizard so a consumer pays $1.99 and their `Filing` record is updated on confirmed payment. The schema from Phase 1 is fully in place — `stripeSessionId`, `stripePaymentId`, `paymentStatus`, `paidAt`, `filingReceiptId`, and `FilingStatus` enum are all live. This phase is pure application code: three API routes, wizard wiring, and a success page.

The existing codebase already has stub routes at `src/app/api/stripe/checkout/route.ts` and `src/app/api/stripe/webhook/route.ts` that implement a **subscription** flow for a different product. Both must be **replaced** with one-time payment logic. The routes also live under `/api/stripe/*` rather than the spec path `/api/checkout` and `/api/webhooks/stripe` — the planner must decide whether to rename the directory or alias via new files.

The key technical constraint is that Stripe's `stripe.webhooks.constructEvent()` requires the **raw request body** (not parsed JSON). In Next.js App Router `route.ts` files, `await request.text()` returns the raw body without any extra configuration — no `bodyParser: false` export is needed (that is a Pages Router pattern). The existing webhook stub already uses `request.text()` correctly.

**Primary recommendation:** Replace the existing subscription stubs with one-time checkout logic, map `checkout.session.completed` to the Filing lifecycle, and add `checkout.session.expired` handling to reset draft status. No new npm packages are needed — `stripe@20.4.1` is already installed and sufficient.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PAY-01 | Stripe Checkout Session created for $1.99 per filing | Covered by `stripe.checkout.sessions.create()` with `mode: 'payment'`, `amount: 199`, `currency: 'usd'` |
| PAY-02 | POST /api/checkout accepts filingId, returns Stripe session URL | New route at `src/app/api/checkout/route.ts` (separate from existing `/api/stripe/checkout`) |
| PAY-03 | Stripe webhook handler at /api/webhooks/stripe verifies signature | `request.text()` + `stripe.webhooks.constructEvent()` — Next.js App Router native, no config needed |
| PAY-04 | On checkout.session.completed: Filing updated with paymentStatus=paid, filingReceiptId generated | Use `generateFilingReceiptId()` from Phase 1; update Filing via Prisma with `stripeSessionId`, `stripePaymentId`, `paymentAmount`, `paidAt`, `status: paid` |
| PAY-05 | On checkout.session.expired: Filing reset to draft status (allows retry) | Handle `checkout.session.expired` webhook event; set `status: draft`, clear `stripeSessionId` |
| PAY-06 | Filing wizard final step redirects to Stripe Checkout URL | Replace `handleSubmit` in wizard to call `/api/checkout` and `window.location.href = url` |
| PAY-07 | Success page at /filing/[id]/success shows receipt ID, filing details, PDF download link | New page at `src/app/filing/[id]/success/page.tsx`; fetches Filing by id, shows filingReceiptId |
| PAY-08 | Success page shows account creation CTA for guest filers | Check `Filing.userId === null`; show CTA form if no account linked |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe | 20.4.1 (installed) | Stripe Node.js SDK — Checkout Session creation, webhook signature verification | Already installed; sufficient for all Phase 2 requirements |
| @prisma/client | 5.22.0 (installed) | Database — update Filing record on payment events | Already in use from Phase 1 |
| next | 14.2.35 (installed) | App Router route handlers for API endpoints | Project foundation |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @stripe/stripe-js | 8.11.0 (installed) | Client-side Stripe.js (not needed for Phase 2) | Only needed if building custom card elements — Stripe Checkout is server-redirected |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Stripe Checkout (hosted) | Stripe Payment Element (embedded) | Checkout is simpler and quicker for one-time flow; no custom UI needed for v1 |
| webhook `checkout.session.completed` | polling Checkout Session status | Webhooks are reliable; polling is fragile and adds complexity |

**Installation:** No new packages required. `stripe@20.4.1` is already installed.

**Version note:** `stripe@21.0.1` is the current latest (published ~4 days ago, uses `apiVersion: '2026-03-25.dahlia'`). The installed `20.4.1` uses `apiVersion: '2026-02-25.clover'`. Both work for one-time Checkout. Do not upgrade mid-phase to avoid breaking the existing stub code's apiVersion reference. Use the installed version.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   └── stripe.ts                        # Lazy-init Stripe client (new)
├── app/
│   ├── api/
│   │   ├── checkout/
│   │   │   └── route.ts                 # POST — create Checkout Session (new)
│   │   └── webhooks/
│   │       └── stripe/
│   │           └── route.ts             # POST — verify + handle events (new)
│   └── filing/
│       └── [id]/
│           └── success/
│               └── page.tsx             # Success page (new)
```

**Note on existing stubs:** `src/app/api/stripe/checkout/route.ts` and `src/app/api/stripe/webhook/route.ts` implement a subscription flow unrelated to the filing payment. They should NOT be modified — the new routes live at different paths (`/api/checkout` and `/api/webhooks/stripe`) per the spec. The existing stubs can be left in place or removed if they conflict.

### Pattern 1: Lazy-Init Stripe Client (src/lib/stripe.ts)

**What:** A module-level singleton that initializes once and validates `STRIPE_SECRET_KEY` at startup.
**When to use:** Prevents creating a new Stripe instance per request; surfaces missing env var early.

```typescript
// Source: Stripe Node.js docs + existing codebase pattern
import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-02-25.clover',
})
```

### Pattern 2: Checkout Session Creation (POST /api/checkout)

**What:** Accepts `filingId` in request body, creates Stripe Checkout Session in `payment` mode, updates Filing with `stripeSessionId` + `status: pending_payment`, returns `{ url }`.
**When to use:** Called by wizard final step before redirect.

```typescript
// Source: Stripe official docs — checkout sessions create
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: [
    {
      price_data: {
        currency: 'usd',
        unit_amount: 199,           // $1.99 in cents
        product_data: {
          name: 'Privacy Complaint Filing',
          description: 'File a formal privacy complaint with a government agency',
        },
      },
      quantity: 1,
    },
  ],
  metadata: {
    filingId: filingId,             // Critical: needed in webhook to find Filing
  },
  success_url: `${process.env.NEXT_PUBLIC_APP_URL}/filing/${filingId}/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/file/${category}`,
  customer_email: filerEmail,       // Pre-fill email in Stripe Checkout
})
```

### Pattern 3: Webhook Signature Verification (POST /api/webhooks/stripe)

**What:** Raw body via `request.text()`, signature from header, `constructEvent()` — no bodyParser config needed in App Router.
**When to use:** The ONLY correct pattern for Next.js App Router webhook handlers.

```typescript
// Source: Next.js App Router docs — webhooks section
// Source: Stripe webhooks docs — constructEvent
export async function POST(request: NextRequest) {
  const body = await request.text()           // raw body — critical for signature
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const filingId = session.metadata?.filingId
      // update Filing: status=paid, stripeSessionId, stripePaymentId (session.payment_intent),
      // paymentAmount=1.99, paidAt=now(), filingReceiptId=generateFilingReceiptId()
      break
    }
    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session
      const filingId = session.metadata?.filingId
      // reset Filing: status=draft, clear stripeSessionId
      break
    }
  }

  return NextResponse.json({ received: true })
}
```

**CRITICAL:** Do NOT export `export const config = { api: { bodyParser: false } }` in App Router files. That is Pages Router syntax and will be silently ignored or cause errors. `request.text()` works natively.

### Pattern 4: Filing Lifecycle Updates via Prisma

**What:** Two Prisma update calls triggered by webhook events.

```typescript
// On checkout.session.completed — PAY-04
await prisma.filing.update({
  where: { id: filingId },
  data: {
    status: 'paid',
    stripeSessionId: session.id,
    stripePaymentId: session.payment_intent as string,
    paymentStatus: 'paid',
    paymentAmount: new Decimal('1.99'),
    paidAt: new Date(),
    filingReceiptId: generateFilingReceiptId(),
  },
})

// On checkout.session.expired — PAY-05
await prisma.filing.update({
  where: { id: filingId },
  data: {
    status: 'draft',
    stripeSessionId: null,
    paymentStatus: null,
  },
})
```

### Pattern 5: Wizard Final Step → Checkout Redirect

**What:** Replace existing `handleSubmit` (which calls `/api/submit`) with a two-step flow: (1) create Filing record via POST, (2) call `/api/checkout` with `filingId`, (3) redirect to Stripe URL.

```typescript
// In wizard final step
const response = await fetch('/api/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ filingId, category, email }),
})
const { url } = await response.json()
window.location.href = url   // hard redirect to Stripe-hosted checkout
```

**Note:** The wizard currently calls `/api/submit` which does full filing + email. That flow must be gated behind payment. The wizard should create a `draft` Filing record first, then redirect to Stripe. The webhook completes the lifecycle.

### Anti-Patterns to Avoid

- **Using `request.json()` in the webhook handler:** This parses the body, destroying the exact bytes Stripe needs for signature verification. Always use `request.text()`.
- **Using `export const config = { api: { bodyParser: false } }`:** Pages Router pattern — does nothing in App Router, may cause confusion.
- **Storing sensitive Stripe data client-side:** Never expose `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` to the browser. `NEXT_PUBLIC_` prefix must NOT be applied to these.
- **Trusting webhook data without signature verification:** Always call `constructEvent()` before using any event data.
- **Creating filingReceiptId before payment confirmation:** Must only be set in the `checkout.session.completed` handler, not during session creation.
- **Duplicate event processing:** Stripe may deliver the same webhook multiple times. Check if Filing already has `status: paid` before re-applying the update.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Webhook signature verification | Custom HMAC logic | `stripe.webhooks.constructEvent()` | Handles timing attacks, encoding edge cases |
| Stripe Checkout UI | Custom payment form | Stripe-hosted Checkout | PCI compliance, mobile-optimized, handles 3DS |
| Filing receipt ID generation | New utility | `generateFilingReceiptId()` from Phase 1 | Already built + tested in `src/lib/filing-receipt-id.ts` |
| Idempotent webhook handling | Complex state machine | Check `Filing.status !== 'paid'` before update | Simple guard is sufficient for this volume |
| Session expiry handling | Cron/polling | `checkout.session.expired` webhook event | Stripe delivers this reliably |

**Key insight:** Stripe Checkout handles PCI compliance, 3D Secure authentication, card validation, and mobile UX. Any custom implementation would need to handle all of this — use hosted Checkout unconditionally.

---

## Common Pitfalls

### Pitfall 1: Raw Body Destroyed Before Signature Verification

**What goes wrong:** Webhook returns 400 "Invalid signature" even with correct `STRIPE_WEBHOOK_SECRET`.
**Why it happens:** `request.json()` or a middleware parses the body before `constructEvent()` sees it. Stripe's signature is computed over the exact original bytes.
**How to avoid:** Always use `await request.text()` in the webhook route handler. Never `request.json()`.
**Warning signs:** Consistent 400 errors from Stripe when testing with `stripe listen`.

### Pitfall 2: Wrong Webhook URL (Missing www. Prefix)

**What goes wrong:** Stripe sends events to `https://easyfilercomplaint.com/api/webhooks/stripe` but Vercel redirects non-www to www, stripping the request body (302 redirect loses POST body). Webhook fails with 302 or empty body error.
**Why it happens:** Vercel's www redirect is a 308 for HTML but the stripe CLI / dashboard webhook fires a raw POST.
**How to avoid:** Register webhook endpoint as `https://www.easyfilercomplaint.com/api/webhooks/stripe` in Stripe Dashboard. This is a project-wide constraint from STATE.md.
**Warning signs:** Webhook deliveries show 3xx responses in Stripe Dashboard.

### Pitfall 3: Missing filingId in Session Metadata

**What goes wrong:** Webhook receives `checkout.session.completed` but cannot find which Filing to update.
**Why it happens:** `metadata.filingId` was not set when creating the Checkout Session.
**How to avoid:** Always set `metadata: { filingId }` in `stripe.checkout.sessions.create()`. This is the only reliable way to correlate the event to a Filing.
**Warning signs:** Webhook handler logs "filingId not found in metadata".

### Pitfall 4: Wizard Creates No Filing Before Checkout

**What goes wrong:** User completes wizard, gets to Stripe, pays, webhook fires — but there is no Filing record in the DB to update.
**Why it happens:** The Filing record must be created (status: draft) before the redirect to Stripe, so the webhook can find it by `filingId`.
**How to avoid:** The checkout endpoint must either (a) receive full FilingData and create the Filing itself, or (b) accept a pre-created `filingId`. Option (b) requires the wizard to first create a Filing draft via a `/api/filings` POST before calling `/api/checkout`.
**Warning signs:** Webhook logs Prisma record-not-found errors.

### Pitfall 5: Duplicate Webhook Processing

**What goes wrong:** Filing `filingReceiptId` generated twice for the same payment; status toggled back and forth.
**Why it happens:** Stripe retries webhook delivery if it does not receive a 2xx within 30 seconds. Under load or cold starts, the same event may be processed twice concurrently.
**How to avoid:** In `checkout.session.completed` handler, check `Filing.status === 'paid'` before applying updates. If already paid, return 200 immediately without re-updating.
**Warning signs:** Duplicate `filingReceiptId` collisions hitting the `@unique` Prisma constraint.

### Pitfall 6: Stripe Test Mode Keys in Production

**What goes wrong:** Live payments attempted with `sk_test_` key or vice versa.
**Why it happens:** Environment variables not set correctly on Vercel.
**How to avoid:** STATE.md decision: stay in test mode until full end-to-end is verified. Verify `STRIPE_SECRET_KEY` starts with `sk_test_` in Vercel preview/production settings until explicitly switched.
**Warning signs:** Stripe Dashboard shows test events in production environment.

### Pitfall 7: apiVersion Mismatch Between SDK and Stripe Account

**What goes wrong:** TypeScript type errors or runtime errors because Stripe account is pinned to a different API version than the SDK.
**Why it happens:** `stripe@20.4.1` pins `2026-02-25.clover`; if the Stripe account is set to a newer version, event shapes may differ.
**How to avoid:** Accept the default from the SDK — it pins the version. The existing codebase already uses `2026-02-25.clover` consistently.
**Warning signs:** TypeScript errors on Stripe event object shapes.

---

## Code Examples

### Verified: Lazy-Init Stripe Client

```typescript
// src/lib/stripe.ts
// Source: Pattern from existing src/app/api/stripe/checkout/route.ts + Stripe docs
import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-02-25.clover',
})
```

### Verified: Checkout Session for One-Time $1.99 Payment

```typescript
// Source: https://docs.stripe.com/checkout/quickstart?lang=node
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: [
    {
      price_data: {
        currency: 'usd',
        unit_amount: 199,
        product_data: { name: 'Privacy Complaint Filing' },
      },
      quantity: 1,
    },
  ],
  metadata: { filingId },
  customer_email: email,
  success_url: `${process.env.NEXT_PUBLIC_APP_URL}/filing/${filingId}/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/file/${category}`,
})
// session.url is the Stripe-hosted checkout page URL
// session.id is stored on Filing.stripeSessionId
```

### Verified: Webhook Raw Body in App Router

```typescript
// Source: https://nextjs.org/docs/app/building-your-application/routing/route-handlers (Webhooks section)
export async function POST(request: NextRequest) {
  const body = await request.text()   // raw string — do NOT use request.json()
  const sig = request.headers.get('stripe-signature')!
  const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  // ...
}
```

### Verified: Success Page Dynamic Route

```typescript
// src/app/filing/[id]/success/page.tsx
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/route (dynamic segments)
export default async function SuccessPage({
  params,
}: {
  params: Promise<{ id: string }>   // Note: params is a Promise in Next.js 15+, but project uses 14.2.35
}) {
  const { id } = await params
  const filing = await prisma.filing.findUnique({ where: { id } })
  // ...
}
```

**Note on params type:** Project uses Next.js 14.2.35. In v14, `params` is NOT a Promise — use `{ params }: { params: { id: string } }` directly. The Promise wrapping applies only to v15+.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `export const config = { api: { bodyParser: false } }` | `await request.text()` natively | Next.js 13 (App Router) | Pages Router pattern no longer applies |
| `stripe.checkout.sessions.create({ mode: 'payment', price: 'price_xxx' })` | `price_data` inline object (no pre-created price) | Stripe API (always supported) | No need to create a Price object in Stripe Dashboard for one-time $1.99 |
| Stripe Payment Intent API | Stripe Checkout Session API | ~2019, widely adopted | Checkout handles PCI, 3DS, mobile automatically |
| Webhook `customer.subscription.updated` | `checkout.session.completed` | N/A — different product type | Existing stubs handle subscriptions; Phase 2 is one-time payment |

**Deprecated/outdated in this codebase:**
- Existing `src/app/api/stripe/checkout/route.ts`: Uses `mode: 'subscription'` and `STRIPE_PRICE_MEMBERSHIP`. Irrelevant to Phase 2 — must not be modified or re-used.
- Existing `src/app/api/stripe/webhook/route.ts`: Handles `customer.subscription.updated` and `customer.subscription.deleted`. Irrelevant to Phase 2 — Phase 2 routes live at different paths.

---

## Open Questions

1. **Where does the Filing record get created?**
   - What we know: The spec says "final wizard step creates Filing record + calls /api/checkout + redirects" (ROADMAP.md, Plan 4). Currently `handleSubmit` in the wizard calls `/api/submit` directly.
   - What's unclear: Should `/api/checkout` accept raw FilingData and create the Filing internally, or should the wizard call a separate `/api/filings` POST first, get back a `filingId`, then call `/api/checkout` with that ID?
   - Recommendation: Have `/api/checkout` accept the full `FilingData` and create the Filing (status: draft) atomically before creating the Stripe Session. This is a single round-trip and ensures the Filing always exists when the webhook fires.

2. **What happens to the existing `/api/submit` flow?**
   - What we know: The current wizard calls `/api/submit` which submits complaints without payment. Phase 2 gates filing behind payment.
   - What's unclear: Should `/api/submit` be disabled, or left for the old flow?
   - Recommendation: The wizard wiring (Plan 4) replaces `handleSubmit` to call `/api/checkout` instead. `/api/submit` can remain but becomes unreachable from the wizard UI.

3. **Cancel URL: which wizard step to return to?**
   - What we know: Cancel URL should return user to the wizard to retry.
   - What's unclear: The wizard is at `/file/[category]` — the category comes from `Filing.category`. The wizard has no stateful URL for each step.
   - Recommendation: Cancel URL = `${NEXT_PUBLIC_APP_URL}/file/${filing.category}` — returns to step 0 of the correct category wizard.

4. **Success page: PDF download link (PAY-07)**
   - What we know: PAY-07 requires a PDF download link on the success page. But PDF generation is Phase 3.
   - What's unclear: Should the PDF link be shown conditionally (only if `Filing.complaintPdfUrl` is set), or always shown with a "pending" state?
   - Recommendation: Show PDF link conditionally — "Your complaint PDF will be available shortly" if `complaintPdfUrl` is null, show the download link when populated. This avoids hardcoding Phase 3 dependency.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| stripe npm package | All Phase 2 routes | Yes | 20.4.1 (installed) | — |
| STRIPE_SECRET_KEY env var | stripe.ts, /api/checkout | Unknown (not in repo) | — | Must be set in .env.local for dev, Vercel env for production |
| STRIPE_WEBHOOK_SECRET env var | /api/webhooks/stripe | Unknown (not in repo) | — | Must be obtained from Stripe Dashboard webhook setup |
| NEXT_PUBLIC_APP_URL env var | success_url / cancel_url | Check in .env.local | — | Must be `https://www.easyfilercomplaint.com` in production |
| Stripe CLI (local webhook testing) | Dev testing | Unknown | — | Can use Stripe Dashboard webhook log for debugging |
| Node.js | Runtime | Yes | v24.12.0 | — |

**Missing dependencies with no fallback:**
- `STRIPE_SECRET_KEY` — blocks all Phase 2 functionality. Must be set in `.env.local` (test key: `sk_test_...`) before any testing.
- `STRIPE_WEBHOOK_SECRET` — blocks webhook verification. Must be obtained by running `stripe listen` locally or from Stripe Dashboard.
- `NEXT_PUBLIC_APP_URL` — blocks correct success/cancel URL generation. Must be `https://www.easyfilercomplaint.com` in production (with www. prefix per STATE.md constraint).

**Missing dependencies with fallback:**
- Stripe CLI: Can test webhooks manually via Stripe Dashboard "Send test webhook" feature, or use `stripe listen --forward-to localhost:3000/api/webhooks/stripe` for local development.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 |
| Config file | `vitest.config.ts` (exists, `globals: true`) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PAY-01 | Checkout Session created with correct amount/currency/metadata | unit | `npx vitest run src/lib/__tests__/stripe.test.ts` | No — Wave 0 |
| PAY-02 | POST /api/checkout validates filingId, returns url | unit | `npx vitest run src/app/api/checkout/__tests__/route.test.ts` | No — Wave 0 |
| PAY-03 | Webhook rejects invalid signatures with 400 | unit | `npx vitest run src/app/api/webhooks/stripe/__tests__/route.test.ts` | No — Wave 0 |
| PAY-04 | checkout.session.completed updates Filing to paid + sets filingReceiptId | unit | `npx vitest run src/app/api/webhooks/stripe/__tests__/route.test.ts` | No — Wave 0 |
| PAY-05 | checkout.session.expired resets Filing to draft | unit | `npx vitest run src/app/api/webhooks/stripe/__tests__/route.test.ts` | No — Wave 0 |
| PAY-06 | Wizard final step calls /api/checkout and redirects | manual-only | N/A — requires browser + Stripe redirect | — |
| PAY-07 | Success page renders filingReceiptId and filing details | unit | `npx vitest run src/app/filing/__tests__/success.test.ts` | No — Wave 0 |
| PAY-08 | Success page shows account CTA when Filing.userId is null | unit | `npx vitest run src/app/filing/__tests__/success.test.ts` | No — Wave 0 |

**PAY-06 manual-only justification:** Wizard-to-Stripe redirect requires a real browser session and Stripe-hosted page. Cannot be automated in unit tests. Test by running dev server + `stripe listen` + walking through the wizard.

### Sampling Rate

- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/__tests__/stripe.test.ts` — covers PAY-01 (mock Stripe client, verify session params)
- [ ] `src/app/api/checkout/__tests__/route.test.ts` — covers PAY-02 (mock Prisma + Stripe)
- [ ] `src/app/api/webhooks/stripe/__tests__/route.test.ts` — covers PAY-03, PAY-04, PAY-05 (mock `constructEvent`)
- [ ] `src/app/filing/__tests__/success.test.ts` — covers PAY-07, PAY-08 (mock Prisma Filing query)
- [ ] `src/test/setup.ts` or vitest mock setup for Prisma and Stripe — shared fixtures

---

## Sources

### Primary (HIGH confidence)

- Next.js official docs (https://nextjs.org/docs/app/building-your-application/routing/route-handlers) — webhooks section, raw body via `request.text()`, params in v14 vs v15
- Stripe Checkout Sessions Create API (https://docs.stripe.com/api/checkout/sessions/create) — `mode: 'payment'`, `price_data`, `metadata`, `success_url` with `{CHECKOUT_SESSION_ID}` template
- Stripe Checkout Session object (https://docs.stripe.com/api/checkout/sessions/object) — `payment_intent`, `customer_email`, `amount_total`, `metadata` fields
- Stripe webhooks docs (https://docs.stripe.com/webhooks) — `constructEvent`, 2xx response requirement, idempotency via event ID logging
- Existing codebase `src/app/api/stripe/webhook/route.ts` — confirms `request.text()` pattern is already in use
- npm registry — stripe@21.0.1 is current latest; 20.4.1 installed in project

### Secondary (MEDIUM confidence)

- WebSearch results confirming `checkout.session.expired` event exists and fires when Stripe Checkout session expires (https://docs.stripe.com/api/events/types)
- WebSearch confirming `2026-02-25.clover` is not the latest Stripe apiVersion; `2026-03-25.dahlia` is current as of stripe@21.0.1

### Tertiary (LOW confidence)

- magicbell.com webhook reference (https://www.magicbell.com/workflows/stripe/checkout-session-expired) — `checkout.session.expired` event description (not an official Stripe source, consistent with official docs)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `stripe@20.4.1` already installed, versions verified against npm registry
- Architecture: HIGH — Next.js App Router `request.text()` pattern verified in official docs; Stripe Checkout Session API verified in official docs
- Pitfalls: HIGH — www. prefix constraint from STATE.md; raw body pitfall verified by Next.js + Stripe docs; duplicate processing is a documented Stripe concern
- Validation: MEDIUM — vitest infrastructure exists from Phase 1, test files for Phase 2 do not yet exist

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (Stripe API is stable; Next.js 14 patterns are stable until project upgrades)
