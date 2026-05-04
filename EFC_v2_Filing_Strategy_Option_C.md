# EFC v2 Filing Strategy: Triple-Filing (Option C)

**Date:** May 3, 2026
**Status:** Draft for Review
**Decision Needed From:** James

---

## Executive Summary

EFC currently generates a complaint PDF and faxes it to the CA Attorney General. This has three problems:

1. The CA AG is no longer the primary privacy enforcer — the CPPA is
2. Faxed complaints are paper and must be manually entered into government systems
3. The current PDF doesn't match what either agency expects to receive

**Proposed pivot:** After payment, EFC provides THREE filing channels:

- **Channel A (Primary):** Guided CPPA online form filing with pre-written copy-paste text
- **Channel B:** Downloadable CPPA paper complaint PDF the user can print and mail
- **Channel C:** Auto-fax to CA AG (existing functionality, kept as bonus)

User pays $1.99 once, gets all three channels.

---

## Why This Pivot Matters

### The CPPA Is the Primary Enforcer Now

Since July 1, 2023, the California Privacy Protection Agency (CPPA) — not the Attorney General — is the primary enforcer of the CCPA. The AG's own website directs consumers to file privacy complaints with the CPPA. Complaints filed directly with the CPPA go into their digital enforcement database. The CPPA's largest-ever fine resulted from a consumer complaint filed through their online form.

### Fax Is the Least Effective Channel

The CA AG accepts complaints via online form, mail, and fax. Online submissions go directly into their database. Faxed complaints arrive as paper and require manual data entry. Our test fax returned error code 22, suggesting the AG's fax infrastructure may not reliably process incoming faxes.

### The Current PDF Doesn't Match What Agencies Expect

The current complaint PDF is formatted as a formal legal letter with statute citations. Neither the CPPA nor the CA AG expects this. The CPPA expects structured responses to 7 specific questions. The CA AG expects their own complaint form format. A real consumer wouldn't cite CCPA §1798.100 or Penal Code §631 — it looks automated.

---

## The Three Filing Channels

### Channel A: CPPA Online Form (Primary) — Guided Copy-Paste

**Why primary:** Goes directly into CPPA's digital enforcement database. Highest chance of triggering an investigation. The CPPA is actively hiring enforcement staff and uses complaints to identify patterns of misconduct.

**How it works:** After payment, EFC shows a step-by-step walkthrough page. The user opens cppa.ca.gov/webapplications/complaint in a new tab and pastes pre-written answers for each question. Takes 2-3 minutes.

**The CPPA form has 7 required questions + optional fields:**

| # | CPPA Question | EFC Pre-Fills |
|---|---|---|
| 1 | What is the complaint about? (checkboxes) | Instructions: "Check these boxes: ☑ A business's collection, use, storage, or sharing of my personal information ☑ Right to Opt-out of Sale/Sharing" |
| 2 | Business name(s) | Auto-filled: e.g., "bowlero.com (Bowlero Corporation)" |
| 3 | California resident? | Pre-selected: "Yes" |
| 4 | Describe the complaint (free text) | Generated narrative in first person, natural language. Dates, what tracking was found, that no consent was given. NO statute citations. |
| 5 | Supporting materials (optional) | Generated list: "I have a screenshot of the website's tracking activity, a record of cookies placed on my device, and a filing receipt from EasyFilerComplaint (Filing ID: EFC-XXXXXXXX)." |
| 6 | Contacted the business? | Pre-selected: "No / Not applicable" |
| 7 | Sworn or unsworn? | Default: "Sworn complaint" — with user's contact info pre-filled for copy-paste |

**Optional fields (Question 8-9):**

| Field | EFC Pre-Fills |
|---|---|
| Contact info (name, email, phone, address) | User's info from wizard |
| Business website | From wizard |
| Business phone/address | If provided |

**Sample generated text for Question 4 (complaint description):**

> On or about March 2026, I visited the website bowlero.com. During my visit, I discovered that the website was collecting my personal information — including my browsing activity, device information, and IP address — and sharing it with third-party advertising companies without my knowledge or consent. The website placed tracking cookies on my device and transmitted my data to advertising networks. I was not given a clear opportunity to opt out of this data collection before it occurred, and the website did not display an adequate privacy notice or "Do Not Sell My Personal Information" link. I am filing this complaint because I believe these practices violate my rights as a California consumer under the CCPA.

### Channel B: CPPA Paper Complaint PDF — Print and Mail

**Why include:** Some users prefer paper. The CPPA accepts mailed complaints. Provides a tangible document for the user's records (PPP evidence).

**How it works:** EFC generates a PDF that mirrors the CPPA's official paper complaint form (cppa.ca.gov/pdf/paper-complaint.pdf). All 7 questions are pre-filled. The user prints, signs the perjury attestation, and mails to:

```
California Privacy Protection Agency
ATTN: Complaints
400 R Street, Suite 350
Sacramento, CA 95811
```

**PDF structure matches CPPA form exactly:**
1. Checkboxes for complaint type (pre-checked)
2. Business name(s)
3. California resident: Yes
4. Complaint description (same text as Channel A)
5. Supporting materials description
6. Contacted business: No
7. Sworn complaint selected
8. Contact information filled in
9. Business details filled in
10. Perjury attestation (signature line left blank for user)
11. Today's date

### Channel C: CA AG Fax (Secondary/Bonus)

**Why keep:** Belt and suspenders. The AG can still take action on privacy complaints. Filing with both agencies increases visibility.

**How it works:** Same as current — auto-fax via Sinch after payment. But the PDF is restructured to match the CA AG's complaint form format instead of the current legal letter format.

**CA AG complaint PDF structure:**
- Your Information section (name, address, email, phone)
- Business Information section (company name, website, address)
- Complaint section (description, resolution requested)
- Prior contact: No
- Affirmation: "I affirm that the foregoing information is true and accurate"

---

## User Flow After Payment

```
User completes wizard → Pays $1.99 → Success page shows:

┌─────────────────────────────────────────────────┐
│  ✓ Complaint Filed                              │
│                                                 │
│  Your complaint has been prepared. Here's how   │
│  to file it with government agencies:           │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ ★ STEP 1: File with CPPA (Recommended)   │  │
│  │                                           │  │
│  │ The California Privacy Protection Agency  │  │
│  │ is the primary enforcer of privacy law.   │  │
│  │                                           │  │
│  │ [File Now — Step-by-Step Guide →]         │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ STEP 2: Download Paper Complaint (Mail)   │  │
│  │                                           │  │
│  │ Print, sign, and mail to the CPPA.        │  │
│  │                                           │  │
│  │ [Download CPPA Complaint PDF]             │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ ✓ STEP 3: Attorney General (Auto-Filed)   │  │
│  │                                           │  │
│  │ We also faxed your complaint to the CA    │  │
│  │ Attorney General on your behalf.          │  │
│  │                                           │  │
│  │ Fax ID: 01KQQHGWAPXBTCJRWR3080X2WC      │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  [Download Your Receipt PDF]                    │
│  [Create Free Account →]                       │
└─────────────────────────────────────────────────┘
```

## CPPA Guided Filing Page (/filing/[id]/cppa-guide)

This is a new page that walks the user through pasting answers into the CPPA form:

```
┌─────────────────────────────────────────────────┐
│  File Your Complaint with the CPPA              │
│                                                 │
│  Follow these steps to submit your complaint    │
│  to the California Privacy Protection Agency.   │
│  It takes about 2-3 minutes.                    │
│                                                 │
│  [Open CPPA Complaint Form ↗] (new tab)         │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│  QUESTION 1: What is the complaint about?       │
│  Check these boxes on the CPPA form:            │
│  ☑ A business's collection, use, storage,       │
│    or sharing of my personal information        │
│  ☑ Right to Opt-out of Sale/Sharing             │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│  QUESTION 2: Business name(s)                   │
│  ┌───────────────────────────────────────────┐  │
│  │ bowlero.com (Bowlero Corporation)         │  │
│  └───────────────────────────────────────────┘  │
│  [Copy ↗]                                       │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│  QUESTION 4: Describe the complaint             │
│  ┌───────────────────────────────────────────┐  │
│  │ On or about March 2026, I visited the     │  │
│  │ website bowlero.com. During my visit...   │  │
│  │ [full generated text]                     │  │
│  └───────────────────────────────────────────┘  │
│  [Copy ↗]                                       │
│                                                 │
│  ... (repeat for each question)                 │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│  QUESTION 7: Sworn or unsworn?                  │
│  Select "Sworn complaint" and enter your        │
│  contact information:                           │
│  ┌───────────────────────────────────────────┐  │
│  │ Name: Yun Lee                             │  │
│  │ Email: wiylee@gmail.com                   │  │
│  │ Phone: 6028199539                         │  │
│  │ Address: 28203 Ridgefern Ct...            │  │
│  └───────────────────────────────────────────┘  │
│  [Copy All ↗]                                   │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│  ✓ Done! After you submit the CPPA form,        │
│  you'll receive a confirmation. Save it for     │
│  your records.                                  │
│                                                 │
│  [← Back to Filing Summary]                     │
└─────────────────────────────────────────────────┘
```

---

## PDF Template Changes

### New: CPPA Paper Complaint PDF
- Mirrors the official CPPA form layout (cppa.ca.gov/pdf/paper-complaint.pdf)
- All 11 fields pre-filled
- Perjury attestation signature line left blank
- Mailing address printed at top
- Filing ID in footer

### Updated: CA AG Fax PDF
- Restructured from legal letter → form format matching CA AG expectations
- Sections: Your Information, Business Information, Complaint, Resolution Requested
- No statute citations (real consumers don't cite these)
- No "Dear Attorney General" salutation
- No "N/A" anywhere — omit empty fields entirely
- Visit date formatted as "March 2026" not "N/A"
- User description integrated naturally, not orphaned
- Affirmation statement at bottom

### Kept: Receipt/Records PDF
- For user's personal records and PPP evidence
- Filing ID, date, amount paid, business name, complaint summary

---

## Implementation Phases

### Phase 1: CPPA Guide Page + Success Page Redesign
- New page: `/filing/[id]/cppa-guide` — step-by-step walkthrough with copy-paste buttons
- Redesign success page to show all three channels
- Generate CPPA-formatted text for all 7 questions from filing data
- Copy-to-clipboard functionality for each answer
- "Open CPPA Form" button (external link to cppa.ca.gov)

### Phase 2: CPPA Paper Complaint PDF
- New PDF template matching CPPA's official paper form
- Pre-filled with all filing data
- Downloadable from success page and filings page
- Stored in Vercel Blob for later access

### Phase 3: CA AG PDF Restructure
- Rewrite existing complaint PDF from legal letter to AG form format
- Remove statute citations, "Dear Attorney General", legal boilerplate
- Add proper sections matching AG's online form structure
- Keep Sinch fax delivery (already working)

### Phase 4: Complaint Description Generator
- Improve the generated complaint narrative
- Natural first-person language, no legal jargon
- Include specific details: visit date, website URL, what tracking was detected
- Integrate user's description naturally
- Keep under CPPA's character limit for Question 4

---

## Complaint Description Template

The generated description should read like a real person wrote it. Here's the template:

```
On or about {visitMonth} {visitYear}, I visited the website {targetUrl}. 
During my visit, I discovered that the website was collecting my personal 
information — including my browsing activity, device information, and IP 
address — and sharing it with third-party advertising companies without 
my knowledge or consent.

{if userDescription}
Specifically, I observed: {userDescription}
{/if}

The website placed tracking cookies and pixels on my device and 
transmitted my data to advertising and analytics networks. I was not 
given a clear opportunity to opt out of this data collection before it 
occurred{if noConsentBanner}, and the website did not display a cookie 
consent notice or privacy opt-out mechanism{/if}.

I am filing this complaint because I believe these practices violate my 
rights as a California consumer under the CCPA.
```

---

## Cost Analysis

**Per filing costs:**
- Sinch fax: ~$0.09 (2 pages × $0.045/page)
- Resend receipt email: ~$0.001
- Vercel Blob storage: negligible
- **Total cost per filing: ~$0.10**
- **Revenue per filing: $1.99**
- **Margin: ~$1.89 (95%)**

**Infrastructure costs (monthly):**
- Sinch: pay-as-you-go, no monthly fee
- Resend: already on Pro plan ($20/mo shared across ecosystem)
- Neon: free tier
- Vercel: Pro plan (shared)
- Stripe: 2.9% + $0.30 per transaction = $0.36 per $1.99 filing

**Effective margin after Stripe: ~$1.53 per filing (77%)**

---

## Entity Separation Notes

- EFC is a standalone consumer complaint platform — no references to PV, DPW, APFC, or any other ecosystem entity
- The CPPA guide page links to cppa.ca.gov (government site), not to any ecosystem property
- Filing receipts branded only as EasyFilerComplaint
- No legal advice given — EFC generates complaint text, user submits it themselves
- The fax to CA AG is filed on behalf of the user, not on behalf of any law firm

---

## Open Questions for James

1. Should EFC filings default to sworn or unsworn complaints? Sworn carries more weight but requires perjury attestation.
2. Should the complaint description mention specific tracker names (e.g., "Google Analytics, Meta Pixel") or keep it generic ("tracking cookies and pixels")?
3. Is the $1.99 price point still right given the added value of three filing channels?
4. Should we add FCC complaints as a future channel (for VPPA/video privacy)?
5. Do we need to verify the CA AG fax number (+19163235341) is correct, or should we pause faxing until confirmed?
