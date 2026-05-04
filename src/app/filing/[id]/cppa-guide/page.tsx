import { prisma } from '@/lib/prisma'
import { Masthead } from '@/components/Masthead'
import { Footer } from '@/components/Footer'
import { CopyButton } from '@/components/CopyButton'
import { generateCPPAComplaint } from '@/lib/cppa-complaint-generator'
import type { Filing } from '@prisma/client'

export default async function CPPAGuidePage({
  params,
}: {
  params: { id: string }
}) {
  const filing = await prisma.filing.findUnique({
    where: { id: params.id },
    select: {
      id:              true,
      category:        true,
      targetName:      true,
      targetUrl:       true,
      description:     true,
      filerInfo:       true,
      filingReceiptId: true,
      categoryFields:  true,
      filerEmail:      true,
    },
  })

  if (!filing) {
    return (
      <div className="min-h-screen bg-bg">
        <Masthead />
        <div className="max-w-3xl mx-auto px-6 py-12 text-center">
          <h1 className="font-serif text-3xl font-bold text-text mb-4">Filing Not Found</h1>
          <p className="font-body text-sm text-text-mid">
            This filing receipt may have expired. Start a new complaint from the home page.
          </p>
        </div>
        <Footer />
      </div>
    )
  }

  // generateCPPAComplaint requires a full Filing — cast the Prisma select result.
  // All fields the generator reads (id, category, targetName, targetUrl, description,
  // filerInfo, filingReceiptId, categoryFields, filerEmail) are included in the select.
  const cppa = generateCPPAComplaint(filing as unknown as Filing)

  const CPPA_FORM_URL = 'https://cppa.ca.gov/webapplications/complaint'

  return (
    <div className="min-h-screen bg-bg">
      <Masthead />
      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Page header */}
        <div className="mb-8">
          <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-text-light mb-3">
            CPPA Online Filing Guide
          </p>
          <h1 className="font-serif text-3xl font-bold text-text mb-4">
            File Your Complaint at cppa.ca.gov
          </h1>

          {/* D-06: Brief instruction at top (per user decision) */}
          <p className="font-body text-sm text-text-mid mb-6">
            Open the CPPA complaint form, paste your complaint in the description field, fill in your details, and submit.
          </p>

          {/* D-07: Primary CTA — top placement */}
          <a
            href={CPPA_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block font-mono text-[11px] tracking-[0.1em] uppercase bg-bg-dark text-white px-8 py-3.5 rounded-[6px] hover:bg-text-mid transition-colors"
          >
            Open CPPA Complaint Form →
          </a>
        </div>

        {/* D-03: Q1 — checkbox instructions (visual note only, no copy button) */}
        {cppa.q1CheckboxInstructions.length > 0 && (
          <div className="bg-bg-alt border border-border rounded-[6px] p-6 mb-4">
            <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-text-light mb-3">
              Q1 — Check These Boxes on the Form
            </p>
            <ul className="space-y-2">
              {cppa.q1CheckboxInstructions.map((item) => (
                <li key={item} className="font-body text-sm text-text-mid flex items-start gap-2">
                  <span className="text-text font-bold" aria-hidden="true">✔</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* D-01: Q2 — Business name (copyable, per user decision) */}
        <div className="bg-bg-alt border border-border rounded-[6px] p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-text-light">
              Q2 — Business Name
            </p>
            <CopyButton text={cppa.q2BusinessName} />
          </div>
          <p className="font-body text-sm text-text whitespace-pre-wrap">
            {cppa.q2BusinessName}
          </p>
        </div>

        {/* D-01: Q4 — Complaint description (copyable, per user decision) */}
        <div className="bg-bg-alt border border-border rounded-[6px] p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-text-light">
              Q4 — Your Complaint
            </p>
            <CopyButton text={cppa.q4Description} />
          </div>
          <p className="font-body text-sm text-text whitespace-pre-wrap">
            {cppa.q4Description}
          </p>
        </div>

        {/* D-01: Q5 — Supporting materials (copyable, per user decision) */}
        <div className="bg-bg-alt border border-border rounded-[6px] p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-text-light">
              Q5 — Supporting Materials
            </p>
            <CopyButton text={cppa.q5SupportingMaterials} />
          </div>
          <p className="font-body text-sm text-text whitespace-pre-wrap">
            {cppa.q5SupportingMaterials}
          </p>
        </div>

        {/* D-01: Q7 — Contact information (copyable, per user decision) */}
        <div className="bg-bg-alt border border-border rounded-[6px] p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-text-light">
              Q7 — Your Contact Info
            </p>
            <CopyButton text={cppa.q7ContactInfo} />
          </div>
          <p className="font-body text-sm text-text whitespace-pre-wrap">
            {cppa.q7ContactInfo}
          </p>
        </div>

        {/* D-07: Primary CTA — bottom placement (per user decision: top and/or bottom) */}
        <div className="mt-8 text-center">
          <a
            href={CPPA_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block font-mono text-[11px] tracking-[0.1em] uppercase bg-bg-dark text-white px-8 py-3.5 rounded-[6px] hover:bg-text-mid transition-colors"
          >
            Open CPPA Complaint Form →
          </a>
          <div className="mt-4">
            <a
              href={`/filing/${filing.id}/success`}
              className="font-mono text-[9px] uppercase tracking-[0.1em] border border-border rounded-[6px] px-3 py-1 text-text-mid hover:text-text"
            >
              ← Back to Filing Receipt
            </a>
          </div>
        </div>

      </div>
      <Footer />
    </div>
  )
}
