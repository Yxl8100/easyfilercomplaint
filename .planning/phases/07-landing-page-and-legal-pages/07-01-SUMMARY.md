---
phase: 07-landing-page-and-legal-pages
plan: "01"
subsystem: frontend/marketing
tags: [homepage, landing-page, faq, navigation, masthead, footer]
dependency_graph:
  requires: []
  provides: [homepage-rewrite, HomeFaq-component, masthead-login-link, footer-real-links]
  affects: [src/app/page.tsx, src/components/HomeFaq.tsx, src/components/Masthead.tsx, src/components/Footer.tsx, src/app/layout.tsx]
tech_stack:
  added: []
  patterns: [@base-ui/react Accordion for FAQ, exported FAQ_ITEMS array for testability]
key_files:
  created:
    - src/components/HomeFaq.tsx
  modified:
    - src/app/page.tsx
    - src/app/layout.tsx
    - src/components/Masthead.tsx
    - src/components/Footer.tsx
decisions:
  - Import path for @base-ui/react Accordion is @base-ui/react/accordion (not @base-ui-components)
  - FAQ_ITEMS exported as const (not only via export { FAQ_ITEMS }) for testability
  - HomeFaq component must be 'use client' — @base-ui/react Accordion uses React hooks internally
metrics:
  duration: "4m 21s"
  completed: "2026-04-02"
  tasks_completed: 3
  files_modified: 5
---

# Phase 07 Plan 01: Homepage Rewrite and Navigation Update Summary

**One-liner:** Full homepage rewrite from old multi-agency $0.50+$2/year model to current $1.99 single-agency privacy filing product with HomeFaq accordion component and fixed navigation links.

## What Was Built

### Task 1: Homepage copy + layout metadata (0b8efab)

Rewrote `src/app/page.tsx` with entirely new product copy:
- Hero h1: "File a Privacy Complaint in 5 Minutes" with `<em className="text-accent">in 5 Minutes</em>`
- Primary CTA: `href="/file"` text "File a Privacy Complaint →"
- Stats sidebar: $1.99/Per Filing, 5 min/Average Time, 1/Government Agency, 3/Complaint Types
- Replaced 6-category grid with 3-card "What You Can File" section (privacy tracking, accessibility, video sharing)
- "How It Works" reduced from 4 steps to 3 steps; heading updated to "Three Steps to an Official Filing"
- Pricing card: $1.99 flat fee; removed subscription model, Annual Membership label, and $0.50 reference
- FAQ section added with `<HomeFaq />` import

Updated `src/app/layout.tsx` metadata title and description to current product.

### Task 2: HomeFaq client component (456cfc1)

Created `src/components/HomeFaq.tsx`:
- `'use client'` directive (required for @base-ui/react Accordion hooks)
- Import path: `@base-ui/react/accordion`
- 5 FAQ items (q1–q5) per MKTG-03 verbatim copy
- `Accordion.Root / Item / Header / Trigger / Panel` structure
- `ChevronDown` from lucide-react rotating 180deg on `data-state="open"`
- `export const FAQ_ITEMS` for testability without rendering

### Task 3: Masthead and Footer navigation links (dba50bc)

Masthead.tsx:
- Sign In link: `/auth/signin` → `/login`

Footer.tsx:
- Platform column: explicit hrefs (`/file`, `/#how-it-works`, `/#pricing`, `/account/filings`)
- Legal column: `/privacy`, `/terms`, `/about` — removed dead `href="#"` links and removed Refund Policy
- Agencies column: replaced FCC/FTC/CFPB/FDA/EPA/DOJ/ADA with "CA Attorney General" only

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All links point to real routes. HomeFaq renders real FAQ content from FAQ_ITEMS. No placeholder text or mock data in the components created.

Note: `/privacy`, `/terms`, `/about` routes are linked from the Footer but not yet created — they are the subject of Plan 07-02 (legal pages). These are intentional forward references, not stubs in this plan's scope.

## Self-Check: PASSED

Files exist:
- src/app/page.tsx — modified with new content
- src/components/HomeFaq.tsx — created
- src/components/Masthead.tsx — modified
- src/components/Footer.tsx — modified
- src/app/layout.tsx — modified

Commits verified:
- 0b8efab — feat(07-01): rewrite homepage copy
- 456cfc1 — feat(07-01): create HomeFaq client component
- dba50bc — feat(07-01): update Masthead and Footer navigation links
