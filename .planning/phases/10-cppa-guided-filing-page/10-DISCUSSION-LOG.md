# Phase 10: CPPA Guided Filing Page - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-03
**Phase:** 10-cppa-guided-filing-page
**Areas discussed:** Copy scope, Checkbox guidance, Guest access model

---

## Copy Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Q4 + Q7 only | Complaint description + contact info. Business name short enough to type. | |
| Q4 + Q5 + Q7 | Also add supporting materials sentence for Q5. | |
| Q2 + Q4 + Q5 + Q7 (all four) | Fully pre-fills everything the user would type. | ✓ |

**User's choice:** All four fields (Q2, Q4, Q5, Q7) get their own copy section.
**Notes:** User wants the page to provide everything the consumer needs — no manual typing required beyond what the form itself demands (checkboxes, CA resident radio, prior contact radio).

---

## Checkbox Guidance (Q1)

| Option | Description | Selected |
|--------|-------------|----------|
| Brief note, no copy button | Single line showing which boxes to check. Text comes from generator (business logic, not form-coupled). | ✓ |
| Skip Q1 entirely | No checkbox guidance. Cleaner, but user may check wrong boxes. | |

**User's choice:** Show a brief visual note with the applicable checkbox labels (from `q1CheckboxInstructions`).
**Notes:** Display as a checklist with ✔ prefix and a note like "Check these boxes on the form." No copy button needed since these are checkboxes, not paste-able text.

---

## Guest Access Model

| Option | Description | Selected |
|--------|-------------|----------|
| Anyone with the filing URL | Same model as success page — filing UUID is the access token. Zero friction for guests. | ✓ |
| Logged-in owners only | Redirect to /login if no session. Blocks guests at the worst possible moment. | |
| Session if available, else open | Check ownership if logged in; serve openly if not. More complex for minimal benefit. | |

**User's choice:** Open URL — anyone with the filing ID can access the guide page.
**Notes:** Guests who just paid click this link from the success page. A login wall here would block the primary use case. UUID obscurity is sufficient access control. CPGDE-02 ownership check is satisfied by the UUID-as-access-token model.

---

## Claude's Discretion

- Visual styling (card borders, spacing) follows Phase 9 Tailwind vocabulary — match success page aesthetic
- Whether to include a back-link to the success page
- Label wording for each copy section ("Your Complaint", "Business", etc.)
- Placement of the "Open CPPA Complaint Form" CTA (top and/or after sections)

## Deferred Ideas

None — discussion stayed within phase scope.
