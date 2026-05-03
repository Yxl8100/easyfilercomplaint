# Phase 10: CPPA Guided Filing Page - Context

**Gathered:** 2026-05-03
**Status:** Ready for planning

<domain>
## Phase Boundary

A minimal static page at `/filing/[id]/cppa-guide` that hands the consumer the pre-written text blocks they need to fill the CPPA online complaint form, then links them to the form.

**What this phase is:** Pre-written copy blocks + form link + brief instruction. A hand-off page.
**What this phase is NOT:** A question-by-question walkthrough of the CPPA form. No step-by-step mirroring of form questions. No maintenance coupling to the CPPA form structure.

Design principle: keep it minimal and resilient to CPPA form changes.

</domain>

<decisions>
## Implementation Decisions

### Copy Scope
- **D-01:** All four non-instruction fields get their own copy section with a "Copy" button: Q2 (business name), Q4 (complaint description), Q5 (supporting materials), Q7 (contact info).
- **D-02:** Q3 (CA resident = Yes) and Q6 (prior contact = No) require no display at all — trivial values the user can fill in directly.
- **D-03:** Q1 (checkboxes) gets a brief visual note only — no copy button. Display the applicable checkbox labels from `generateCPPAComplaint(filing).q1CheckboxInstructions` as a short "Check these boxes" note (e.g., "✔ Collection, use, storage, or sharing of my personal information"). This comes from the generator (business logic already in Phase 9 code), not hard-coded form text — so it's resilient to CPPA form changes.

### Guest Access Model
- **D-04:** The page is open to anyone who has the filing URL — same access model as the success page (`/filing/[id]/success`). No login wall. The filing UUID is the access token. Guests who just paid click this link from the success page and must not hit a login redirect.
- **D-05:** No ownership check required for unauthenticated visitors. If a logged-in user is present, no special ownership enforcement is needed either — the UUID obscurity is sufficient. CPGDE-02 (auth check) is satisfied by the "UUID = access" model.

### Page Layout
- **D-06:** Brief instruction goes at the TOP of the page (before the copy blocks): "Open the CPPA complaint form, paste your complaint in the description field, fill in your details, and submit."
- **D-07:** "Open CPPA Complaint Form" button is prominent — primary CTA, opens `cppa.ca.gov/webapplications/complaint` in a new tab. Placed prominently (top and/or after the copy sections).
- **D-08:** One big text block per field (not a form-fill textarea). Read-only display with a "Copy" button. The copy button writes to clipboard via the browser Clipboard API — requires a small `'use client'` `CopyButton` component since the parent page is a server component.

### Claude's Discretion
- Exact visual styling of the copy sections (card borders, padding, button size) follows Phase 9 Tailwind vocabulary: `bg-bg-alt border border-border rounded-[6px] p-6`, `font-mono text-[9px]` labels, `font-body text-sm` body text. Match the success page aesthetic.
- Whether to show a back-link to the success page is implementation judgment.
- Label wording for each section ("Your Complaint", "Business", "Supporting Materials", "Your Contact Info") is implementation judgment — keep it plain English.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 10 Requirements
- `.planning/REQUIREMENTS.md` §CPPA Guide Page — CPGDE-01 through CPGDE-05 (5 requirements)
- `.planning/ROADMAP.md` §Phase 10 — Goal, success criteria, dependencies

### Phase 9 Generator (upstream dependency)
- `src/lib/cppa-complaint-generator.ts` — `generateCPPAComplaint(filing: Filing): CPPAComplaint` — returns `q1CheckboxInstructions`, `q2BusinessName`, `q4Description`, `q5SupportingMaterials`, `q7ContactInfo`. This is the ONLY data source for the guide page content.

### Closest Analog Pages
- `src/app/filing/[id]/success/page.tsx` — Server component pattern with Prisma `findUnique`, not-found guard, Masthead/Footer shell, Tailwind class vocabulary
- `src/app/filing/[id]/success/page.test.tsx` — Vitest mock-then-dynamic-import pattern for server component tests (Pattern D from 09-PATTERNS.md)

### Pattern Reference
- `.planning/phases/09-complaint-narrative-engine-ag-pdf-success-page/09-PATTERNS.md` — Pattern F (Tailwind class vocabulary), Pattern D (Vitest server component test pattern)

### Project Constraints
- `.planning/PROJECT.md` §Constraints — Entity separation, URL www. prefix, legal positioning rules

### CPPA Form URL (locked)
- External: `cppa.ca.gov/webapplications/complaint` — opens in new tab (CPGDE-04)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/cppa-complaint-generator.ts`: Call `generateCPPAComplaint(filing)` server-side to get all display data. No additional data fetching needed beyond Prisma `findUnique`.
- `src/app/filing/[id]/success/page.tsx`: Direct analog for the server component shell — Masthead, Footer, max-w-3xl container, Prisma select pattern, not-found guard.
- `src/components/Masthead.tsx` and `src/components/Footer.tsx`: Already used on success page — use the same wrappers.

### Established Patterns
- **Server component + client copy button**: The page itself is a server component (per CPGDE-01). Copy-to-clipboard requires `'use client'`. Pattern: a small `CopyButton` client component that receives `text` as a prop and calls `navigator.clipboard.writeText(text)`. The server component renders `<CopyButton text={q4Description} />` etc.
- **Prisma select**: Fetch filing with minimal fields: `id`, `category`, `targetName`, `targetUrl`, `description`, `filerInfo`, `filingReceiptId`, `categoryFields`, `filerEmail` (if exists on schema — check against Prisma schema).
- **Not-found guard**: If `filing === null`, render the same "Filing Not Found" fallback as success page.
- **ADA guard**: For `category === 'accessibility'`, the guide page should not be linked from the success page (Phase 9 already hides the CPPA guide link for ADA). But if accessed directly, serve it anyway — the generator handles ADA gracefully (returns empty checkboxes; description is still generated for the AG PDF).

### Integration Points
- `generateCPPAComplaint(filing)` is called server-side in the page component — no API route needed.
- The page receives the filing from Prisma; passes data to the `CPPAComplaint` object; renders 4 copy sections + 1 checkbox note + 1 CTA button.
- The `CopyButton` is the only client component needed for this page.
- No new Prisma schema changes required — all needed fields exist on `Filing`.

</code_context>

<specifics>
## Specific Ideas

- **Instruction text (locked):** "Open the CPPA complaint form, paste your complaint in the description field, fill in your details, and submit."
- **CTA button text:** "Open CPPA Complaint Form →" (or similar) — opens `cppa.ca.gov/webapplications/complaint` in a new tab.
- **Q1 checkbox display format:** Small checklist with `✔` prefix, labeled "Check these boxes on the form" — no copy button.
- **Access model:** Open URL — no auth gate. Filing UUID = access. This matches the success page model.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 10-cppa-guided-filing-page*
*Context gathered: 2026-05-03*
