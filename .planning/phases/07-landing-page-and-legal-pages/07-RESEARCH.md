# Phase 7: Landing Page & Legal Pages - Research

**Researched:** 2026-04-01
**Domain:** Next.js App Router static pages, Tailwind CSS, @base-ui/react Accordion, legal copy for filing services
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MKTG-01 | Homepage hero with "File a Privacy Complaint in 5 Minutes" + CTA | Existing page.tsx scaffold; hero section exists and needs copy replacement + CTA re-routing to /file |
| MKTG-02 | "How It Works" 3-step section on homepage | Existing "Four Steps" section exists and needs to be reduced to 3 steps matching the current product |
| MKTG-03 | FAQ section on homepage (collapsible, 5 questions) | @base-ui/react Accordion confirmed installed; pattern documented below |
| MKTG-04 | Privacy policy page at /privacy (CCPA section included) | New static page; App Router pattern documented |
| MKTG-05 | Terms of Service at /terms (filing service, not law firm) | New static page; Arizona governing law required |
| MKTG-06 | About page at /about (no references to other entities) | New static page |
| MKTG-07 | All pages pass entity separation check (zero prohibited references) | Automated test covering homepage + all three legal pages |
</phase_requirements>

---

## Summary

Phase 7 is a content and static-page phase built entirely on the existing Next.js 14 App Router scaffold. No new packages are needed. The homepage (`src/app/page.tsx`) already exists with structural sections (hero, "how it works", pricing) but with stale copy that references the old multi-agency product model, wrong pricing ($0.50/filing vs $1.99), and wrong CTA routes (`/auth/signin` instead of `/file`). The work is: rewrite homepage copy to match the current single-agency $1.99 filing product, add a FAQ accordion section (using the already-installed `@base-ui/react` Accordion), and create three new static route pages (`/privacy`, `/terms`, `/about`).

The entity separation constraint is the most critical operational concern. A test must assertively scan the rendered output of all four pages (homepage, privacy, terms, about) for the five prohibited strings. This test does not require mocking and runs entirely in the vitest environment via JSON.stringify of the server component result — the same pattern used throughout Phases 5 and 6.

The FAQ accordion requires a `'use client'` wrapper component because `@base-ui/react` components use React hooks and browser-side interaction. The legal pages are purely static text and can be Server Components with zero client overhead.

**Primary recommendation:** Three plans — Plan 01 (homepage copy rewrite + FAQ accordion), Plan 02 (legal pages: /privacy, /terms, /about), Plan 03 (entity separation test covering all pages). The Footer and Masthead components also need updates (Footer links are currently `href="#"` placeholders pointing to legal pages).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 14.2.35 (installed) | Static page routing at /privacy, /terms, /about | Already the project framework |
| @base-ui/react Accordion | ^1.3.0 (installed) | Collapsible FAQ section | Already in package.json; headless, accessible, no additional deps |
| Tailwind CSS | ^3.4.1 (installed) | Styling via existing token system | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^1.0.1 (installed) | Chevron icon for accordion trigger | If visual expand/collapse arrow needed in FAQ |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @base-ui/react Accordion | HTML `<details>/<summary>` | details/summary requires no JS but offers no animation; @base-ui is already installed and provides smooth height transitions |
| @base-ui/react Accordion | shadcn/ui Accordion | shadcn not installed as accordion component; @base-ui already present |

**Installation:** No new packages required. All dependencies already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/app/
├── page.tsx                    # MODIFY: rewrite copy, add FAQ section
├── privacy/
│   └── page.tsx                # NEW: static privacy policy page
├── terms/
│   └── page.tsx                # NEW: static ToS page
└── about/
    └── page.tsx                # NEW: about page

src/components/
├── HomeFaq.tsx                 # NEW: 'use client' FAQ accordion wrapper
├── Masthead.tsx                # MODIFY: add /about nav link
└── Footer.tsx                  # MODIFY: wire href="#" links to real routes
```

### Pattern 1: Server Component static legal page
**What:** Pure Server Component with inline JSX, no data fetching, no interactivity.
**When to use:** /privacy, /terms, /about
**Example:**
```typescript
// src/app/privacy/page.tsx
import { Masthead } from '@/components/Masthead'
import { Footer } from '@/components/Footer'

export const metadata = {
  title: 'Privacy Policy — EasyFilerComplaint',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg">
      <Masthead />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-serif text-4xl font-bold text-text mb-8">Privacy Policy</h1>
        {/* sections */}
      </main>
      <Footer />
    </div>
  )
}
```

### Pattern 2: Client Component FAQ accordion using @base-ui/react
**What:** `'use client'` component wrapping @base-ui Accordion for collapsible FAQ items.
**When to use:** Homepage FAQ section (MKTG-03)
**Example:**
```typescript
// src/components/HomeFaq.tsx
'use client'

import { Accordion } from '@base-ui/react'

const FAQ_ITEMS = [
  { id: 'q1', question: '...', answer: '...' },
  // ...
]

export function HomeFaq() {
  return (
    <Accordion.Root>
      {FAQ_ITEMS.map((item) => (
        <Accordion.Item key={item.id} value={item.id}>
          <Accordion.Header>
            <Accordion.Trigger className="...">
              {item.question}
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Panel className="...">
            <p>{item.answer}</p>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  )
}
```

### Pattern 3: Entity separation test — JSON.stringify server component
**What:** Call server component function directly, JSON.stringify result, assert no prohibited strings.
**When to use:** MKTG-07 automated audit
**Example:**
```typescript
// src/app/page.test.tsx
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/components/Masthead', () => ({ Masthead: () => null }))
vi.mock('@/components/Footer', () => ({ Footer: () => null }))
vi.mock('@/components/HomeFaq', () => ({ HomeFaq: () => null }))

describe('homepage entity separation', () => {
  it('contains zero prohibited strings', async () => {
    const { default: HomePage } = await import('./page')
    const html = JSON.stringify(await HomePage())
    const prohibited = ['DPW', 'Pro Veritas', 'APFC', 'ComplianceSweep', 'IdentifiedVerified']
    for (const term of prohibited) {
      expect(html).not.toContain(term)
    }
  })
})
```

### Anti-Patterns to Avoid
- **`href="#"` in Footer/Masthead for legal links:** Footer currently uses `href="#"` for Privacy Policy, Terms of Service, Refund Policy links. Wire these to real routes in this phase.
- **Hardcoded old pricing ($0.50) in homepage:** page.tsx "By The Numbers" sidebar shows `$0.50` per filing and `$2` annual membership — this model was the original concept; the current product is $1.99 flat per filing with no subscription.
- **Wrong CTA routes:** Existing hero and pricing CTA links point to `/auth/signin` — must change to `/file` (the complaint wizard entry point).
- **Attorney-adjacent language in ToS:** Phrases like "legal advice", "attorney-client", "we represent you" must be absent. EFC is a filing service not a law firm.
- **Importing @base-ui Accordion in a Server Component:** Accordion uses hooks — must be wrapped in a `'use client'` component before use in page.tsx.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Collapsible FAQ | Custom CSS toggle with JS state | @base-ui/react Accordion | Already installed; handles keyboard nav, ARIA expanded, animation |
| Legal page routing | Manual router config | Next.js App Router folder convention | `src/app/privacy/page.tsx` auto-routes to `/privacy` |

---

## Existing Homepage Analysis (Critical for Planner)

The current `src/app/page.tsx` was built for a different product model. The following sections need to change:

| Section | Current State | Required State |
|---------|---------------|----------------|
| Hero heading | "You Have the Right to File a Complaint. We Make It Easy." | "File a Privacy Complaint in 5 Minutes" |
| Hero body | References 7 agencies, FCC/FTC/CFPB/FDA/EPA/DOJ, hours of research | CA AG privacy complaint, $1.99, 5 minutes |
| Primary CTA | `href="/auth/signin"` — "File a Complaint" | `href="/file"` — "File a Privacy Complaint" |
| "By The Numbers" sidebar | $0.50/filing, $2/year, 7 agencies, 6 categories | $1.99/filing, 5 minutes, one simple form |
| "How It Works" | 4-step process (I, II, III, IV) | 3-step process matching MKTG-02 |
| FAQ section | ABSENT | NEW — 5 collapsible questions (MKTG-03) |
| Categories grid | 6 complaint categories (non-EFC product) | Remove or replace — current product only handles privacy complaints |
| Pricing section | $2/year + $0.50/filing model | $1.99 per filing, flat fee |

### Footer current state
Footer links for "Privacy Policy", "Terms of Service", "Refund Policy" all have `href="#"` (dead links). This phase must wire them to `/privacy`, `/terms`, and — if no refund page is built — remove or alias refund policy to the terms page.

The Footer "Agencies" column lists FCC, FTC, CFPB, FDA, EPA, DOJ/ADA — none of which are active in v1. Should be updated to reflect CA AG only, or simplified.

### Masthead current state
Nav links: "How It Works", "Pricing", "Sign In". 
- "Pricing" anchor `/#pricing` — if pricing section is simplified, this still works
- "Sign In" link goes to `/auth/signin` — separate from `/login` page added in Phase 6. Verify which is canonical auth entry point.

---

## Common Pitfalls

### Pitfall 1: Accordion is client-only but page.tsx is a Server Component
**What goes wrong:** Importing @base-ui Accordion directly into `page.tsx` fails with "You're importing a component that needs `useState`..." Next.js error.
**Why it happens:** @base-ui React components use hooks internally; Server Components cannot use hooks.
**How to avoid:** Extract FAQ into a separate `HomeFaq.tsx` with `'use client'` directive at top. Import `HomeFaq` from `page.tsx` — Next.js handles the server/client boundary automatically.
**Warning signs:** Build error mentioning useState, useContext during `next build`.

### Pitfall 2: Prohibited strings in legal copy
**What goes wrong:** Legal page boilerplate references "attorneys", "law firm", "legal counsel", or worse — an affiliated entity name gets pasted in accidentally.
**Why it happens:** Standard ToS/Privacy templates are drafted for law firms. Entity separation means standard templates cannot be used verbatim.
**How to avoid:** Write copy from scratch with explicit "not a law firm" framing. Run the entity-separation test (MKTG-07) before marking plans complete. Prohibit: DPW, Pro Veritas, APFC, ComplianceSweep, IdentifiedVerified. Note: "Attorney General" is an allowed government-office reference (this exception was established in Phase 5 for EMAIL-05).
**Warning signs:** Test failure citing any of the five prohibited strings.

### Pitfall 3: Vitest cannot render interactive components in server component tests
**What goes wrong:** Test tries to JSON.stringify a page that contains HomeFaq (client component) and fails due to hook execution.
**Why it happens:** vitest runs in Node, not browser; React hooks fail outside browser context unless mocked.
**How to avoid:** Mock `HomeFaq` in page.test.tsx just like Masthead and Footer are mocked in other test files. The entity-separation test for HomeFaq content should be in a separate `HomeFaq.test.tsx` that inspects the static FAQ_ITEMS array directly (no rendering needed).
**Warning signs:** "React hooks can only be called inside a function component" error in tests.

### Pitfall 4: `/auth/signin` vs `/login` CTA routing
**What goes wrong:** Hero CTA links to `/auth/signin` (old pre-Phase-6 auth path) but the canonical login page added in Phase 6 is `/login`.
**Why it happens:** Masthead and page.tsx were written before Phase 6 built the new auth pages.
**How to avoid:** Update all auth-related CTAs to point to `/file` (start filing) or `/login` (returning user). The `/auth/signin` route still exists but is the NextAuth.js default page — not the custom Phase 6 login page.
**Warning signs:** Users clicking "Sign In" landing on a bare NextAuth form rather than the styled `/login` page.

### Pitfall 5: Old product copy left in metadata
**What goes wrong:** `layout.tsx` `<Metadata>` title says "File Official Complaints With One Form" with description mentioning FCC, FTC, CFPB, FDA, EPA, DOJ/ADA.
**Why it happens:** Metadata was written for the original multi-agency concept.
**How to avoid:** Update `layout.tsx` metadata (or add page-level metadata exports on each new page) to match the current privacy-complaint-only product.
**Warning signs:** Search engine snippet or browser tab shows old product description.

---

## Code Examples

### @base-ui/react Accordion import pattern (verified from installed package)
```typescript
// Confirmed export structure from node_modules/@base-ui/react/accordion/index.parts.d.ts
import { Accordion } from '@base-ui/react'
// Parts: Accordion.Root, Accordion.Item, Accordion.Header, Accordion.Trigger, Accordion.Panel
```

### Next.js App Router page-level metadata
```typescript
// Works in both Server and async Server Components
export const metadata = {
  title: 'Privacy Policy — EasyFilerComplaint',
  description: 'How EasyFilerComplaint collects, uses, and protects your personal information.',
}
```

### Legal page disclaimer pattern (required on all pages)
```typescript
// Must appear on every legal page and maintained on homepage
// Current homepage already has this in "By The Numbers" footer:
// "Not a law firm. Filing assistance only. Results not guaranteed."
// Legal pages should reinforce this in their first paragraph.
```

---

## Legal Page Content Requirements

### /privacy (MKTG-04) — Required sections
1. **What information we collect** — email, name, complaint details, payment info (via Stripe, not stored by EFC)
2. **How we use it** — to file your complaint, send receipt email, link to account
3. **CCPA section** — required per requirements; California residents' rights to know, delete, opt-out
4. **Data retention** — how long filings/PII are kept
5. **Third-party services** — Stripe (payment), Resend (email), Phaxio (fax), Vercel (hosting), Neon (database)
6. **Contact** — support email
7. **"Not a law firm"** disclaimer

### /terms (MKTG-05) — Required sections
1. **Service description** — EFC prepares and transmits complaints; does not provide legal advice
2. **"Not a law firm" language** — prominent, explicit
3. **No attorney-client relationship** — explicitly disclaimed
4. **No guarantee of outcome** — filings submitted; agency action not guaranteed
5. **Acceptable use** — complaints must be truthful; fraudulent filings prohibited
6. **Payment terms** — $1.99 per filing, non-refundable after submission
7. **Governing law** — **Arizona** (LLC filed in Arizona per project constraint)
8. **Limitation of liability**
9. **Dispute resolution**

### /about (MKTG-06) — Required content
1. What EasyFilerComplaint is
2. How the service works (brief)
3. Who it's for (California residents with privacy complaints for now; expanding)
4. **No references to any affiliated entity** (DPW, PV Law, APFC, ComplianceSweep, IV, attorneys)
5. Contact information

---

## FAQ Content (5 Questions for MKTG-03)

Recommended questions matching the product:
1. **"What happens after I file?"** — Complaint is faxed to CA AG; you receive a PDF copy by email; government processes vary.
2. **"Is EasyFilerComplaint a law firm?"** — No. We are a complaint filing service. We do not provide legal advice.
3. **"What types of complaints can I file?"** — Currently: privacy violations (CCPA), website accessibility, and video sharing privacy.
4. **"Will I get a refund if my complaint is rejected?"** — The $1.99 fee covers filing service; agency outcomes are not guaranteed.
5. **"How do I know my complaint was filed?"** — You receive a filing receipt email with a complaint PDF and a unique receipt ID (EFC-YYYYMMDD-XXXXX).

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — this phase is purely code/content changes using already-installed packages).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | vitest.config.ts (project root) |
| Quick run command | `rtk vitest run src/app/page.test.tsx` |
| Full suite command | `rtk vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MKTG-01 | Hero heading contains "File a Privacy Complaint in 5 Minutes" | unit | `rtk vitest run src/app/page.test.tsx` | ❌ Wave 0 |
| MKTG-01 | Hero CTA links to /file | unit | `rtk vitest run src/app/page.test.tsx` | ❌ Wave 0 |
| MKTG-02 | "How It Works" section renders 3 steps | unit | `rtk vitest run src/app/page.test.tsx` | ❌ Wave 0 |
| MKTG-03 | FAQ section renders 5 questions | unit | `rtk vitest run src/components/HomeFaq.test.tsx` | ❌ Wave 0 |
| MKTG-04 | /privacy page renders and includes CCPA section | unit | `rtk vitest run src/app/privacy/page.test.tsx` | ❌ Wave 0 |
| MKTG-05 | /terms page renders and mentions Arizona governing law | unit | `rtk vitest run src/app/terms/page.test.tsx` | ❌ Wave 0 |
| MKTG-06 | /about page renders | unit | `rtk vitest run src/app/about/page.test.tsx` | ❌ Wave 0 |
| MKTG-07 | All pages: zero prohibited strings (DPW, Pro Veritas, APFC, ComplianceSweep, IdentifiedVerified) | unit | `rtk vitest run` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `rtk vitest run src/app/page.test.tsx src/components/HomeFaq.test.tsx`
- **Per wave merge:** `rtk vitest run`
- **Phase gate:** Full suite (130+ tests) green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/app/page.test.tsx` — covers MKTG-01, MKTG-02, MKTG-07 (homepage)
- [ ] `src/components/HomeFaq.test.tsx` — covers MKTG-03
- [ ] `src/app/privacy/page.test.tsx` — covers MKTG-04, MKTG-07
- [ ] `src/app/terms/page.test.tsx` — covers MKTG-05, MKTG-07
- [ ] `src/app/about/page.test.tsx` — covers MKTG-06, MKTG-07

**Important:** `src/app/page.test.tsx` does not exist yet (no prior test for the homepage). All 5 test files are new.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `<details>/<summary>` for accordion | @base-ui/react Accordion | @base-ui 1.x (2024) | Accessible, animatable, keyboard navigable |
| MDX for legal pages | Plain TSX Server Components | — | No MDX installed or needed; TSX is simpler |
| Separate markdown files + gray-matter | Inline JSX content in page.tsx | — | No CMS needed for 3 static pages |

---

## Open Questions

1. **Should the Categories grid be removed or kept?**
   - What we know: page.tsx has a 6-category grid (Data Privacy, Consumer Protection, FDA, Environmental, City Code, Accessibility/ADA) that represents the original multi-agency concept, not the current product.
   - What's unclear: Whether to remove entirely, replace with a single "Privacy Complaints" description, or keep as a future-roadmap teaser.
   - Recommendation: Replace with a focused "What kinds of privacy violations can I report?" section scoped to the 3 current complaint types (privacy tracking, accessibility, video sharing). This avoids misleading consumers about FTC/FDA/EPA capabilities that don't exist.

2. **Should /about link appear in Masthead nav?**
   - What we know: Masthead currently has "How It Works", "Pricing", "Sign In" links.
   - What's unclear: Whether "About" warrants top-nav prominence vs. footer-only.
   - Recommendation: Footer-only for About is standard for utility-first products. Keep Masthead nav unchanged unless explicitly requested.

3. **Refund Policy footer link**
   - What we know: Footer currently lists "Refund Policy" as a third legal link.
   - What's unclear: No MKTG requirement covers a standalone refund page.
   - Recommendation: Either remove the Refund Policy link from the footer or point it to /terms (which should include a non-refundable policy section). Do NOT create a new /refund-policy route without a requirement.

---

## Project Constraints (from CLAUDE.md)

No project-level CLAUDE.md exists in the repository root. The following constraints are drawn from PROJECT.md and REQUIREMENTS.md:

- **Tech stack is locked:** Next.js 14 + Prisma + Neon + Vercel — do not introduce new frameworks or packages
- **Entity separation (enforced):** Zero references to DPW, Pro Veritas Law, APFC, ComplianceSweep, IdentifiedVerified anywhere in copy, code, or metadata
- **Legal positioning:** EFC is a filing SERVICE, NOT a law firm — no attorney-client language
- **Governing law:** Arizona (where LLC is filed) — Terms of Service must specify Arizona
- **URL prefix:** All production URLs must use `www.` prefix — not relevant to static page content but relevant to any absolute URLs written in legal page copy
- **Test preservation:** 130/130 tests currently passing — all new work must maintain this baseline; do not modify existing test files in ways that break passing tests
- **RTK prefix:** All bash commands in plans must use `rtk` prefix per global CLAUDE.md

---

## Sources

### Primary (HIGH confidence)
- `src/app/page.tsx` — current homepage scaffold, all sections inspected directly
- `src/components/Footer.tsx` — confirmed dead links needing update
- `src/components/Masthead.tsx` — current nav structure
- `package.json` — confirmed @base-ui/react ^1.3.0 installed
- `node_modules/@base-ui/react/accordion/` — confirmed Accordion component API (Root, Item, Header, Trigger, Panel)
- `node_modules/@base-ui/react/collapsible/` — confirmed Collapsible component also available
- `tailwind.config.ts` — full design token system confirmed
- `.planning/REQUIREMENTS.md` — MKTG-01 through MKTG-07 inspected
- `src/app/account/filings/page.test.tsx` — JSON.stringify server component test pattern confirmed
- `.planning/STATE.md` — EMAIL-05 decision: "Attorney General" is allowed (government office title)

### Secondary (MEDIUM confidence)
- `src/app/layout.tsx` — metadata needs update (current description references FCC/FTC/FDA/EPA)
- Phase 5 EMAIL-05 decision note — "Attorney General" exclusion from prohibited strings

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages confirmed installed, versions verified from package.json
- Architecture: HIGH — all patterns derived from existing project code (pages/tests in Phases 5–6)
- Legal content requirements: MEDIUM — content structure is well-established for filing services; specific wording is the planner's/author's responsibility
- Pitfalls: HIGH — derived from actual project code inspection and Phase 6 test patterns

**Research date:** 2026-04-01
**Valid until:** Stable phase (no external service changes) — valid for 30+ days
