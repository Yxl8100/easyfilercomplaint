import { prisma } from '@/lib/prisma'
import { Masthead } from '@/components/Masthead'
import { Footer } from '@/components/Footer'
import { DoubleRule } from '@/components/DoubleRule'

export default async function SuccessPage({
  params,
}: {
  params: { id: string }
}) {
  const filing = await prisma.filing.findUnique({
    where: { id: params.id },
    select: {
      id:              true,
      filingReceiptId: true,
      targetName:      true,
      category:        true,
      status:          true,
      paymentAmount:   true,
      paidAt:          true,
      complaintPdfUrl: true,
      userId:          true,
      faxId:           true,
      faxStatus:       true,
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

  // category value is 'accessibility' per categories.ts id (see STATE.md decisions)
  const isADA = filing.category === 'accessibility'

  // Fax status display: normalize to human-readable label + Tailwind color token
  function getFaxStatusDisplay(status: string | null): { label: string; colorClass: string } {
    if (status === 'success') return { label: 'Delivered', colorClass: 'text-accent-green' }
    if (status === 'failure' || status === 'partialsuccess') return { label: 'Delivery Failed', colorClass: 'text-accent' }
    return { label: 'Pending', colorClass: 'text-text-light' }
  }
  const faxDisplay = getFaxStatusDisplay(filing.faxStatus)

  return (
    <div className="min-h-screen bg-bg">
      <Masthead />
      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Section 1: Confirmation header */}
        <div className="text-center mb-8">
          <div className="font-serif text-6xl text-border-dark mb-6" aria-hidden="true">✓</div>
          <DoubleRule />
          <h1 className="font-serif text-3xl font-bold text-text mt-6 mb-3">Complaint Filed</h1>
          <p className="font-body text-sm text-text-mid">
            {isADA
              ? 'Your accessibility complaint has been submitted to the California Attorney General.'
              : 'Your privacy complaint has been submitted. Follow the steps below to complete all three filing channels.'
            }
          </p>
        </div>

        {/* Section 2: Receipt ID card */}
        <div className="bg-bg-alt border border-border rounded-[6px] p-6 mb-4">
          <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-text-light mb-3">Filing Receipt</p>
          <output
            aria-label={`Filing receipt ID: ${filing.filingReceiptId}`}
            className="font-mono text-xl font-bold text-text tracking-wider block"
          >
            {filing.filingReceiptId}
          </output>
          <div className="mt-2">
            <span className="font-mono text-[8px] tracking-[0.1em] uppercase px-2 py-0.5 rounded-[4px] bg-bg-dark text-white">
              Paid
            </span>
          </div>
        </div>

        {/* Section 3: Filing detail rows */}
        <div className="bg-bg-alt border border-border rounded-[6px] p-6 mb-4">
          {[
            { label: 'Business', value: filing.targetName },
            { label: 'Agency', value: isADA ? 'CA Attorney General' : 'Multiple Agencies' },
            { label: 'Amount Paid', value: '$1.99' },
            {
              label: 'Filed',
              value: filing.paidAt
                ? new Date(filing.paidAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : '—',
            },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex justify-between font-body text-sm text-text-mid py-2 border-b border-border last:border-b-0"
            >
              <span>{label}</span>
              <span className="text-text font-bold">{value}</span>
            </div>
          ))}
        </div>

        {/* ─── CHANNEL CARDS ─── */}

        {/* Card A: CPPA Online — hidden for ADA (ADA-01) */}
        {!isADA && (
          <div className="bg-bg-alt border border-border rounded-[6px] p-6 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-text-light">
                STEP 1 — CPPA Online
              </p>
              <span className="bg-bg-dark text-white font-mono text-[11px] uppercase px-2 py-0.5 rounded-[4px]">
                Recommended
              </span>
            </div>
            <h2 className="font-serif text-xl font-bold text-text mb-2">
              File your complaint online at cppa.ca.gov
            </h2>
            <p className="font-body text-sm text-text-mid mb-4">
              We&apos;ve prepared your answers. Open our step-by-step guide, then paste each answer into the CPPA form.
            </p>
            <a
              href={`/filing/${filing.id}/cppa-guide`}
              className="inline-block font-mono text-[11px] tracking-[0.1em] uppercase bg-bg-dark text-white px-6 py-3 rounded-[6px] hover:bg-text-mid transition-colors"
            >
              File Now — Step-by-Step Guide →
            </a>
          </div>
        )}

        {/* Card B: CPPA Paper PDF — hidden for ADA (ADA-01) */}
        {!isADA && (
          <div className="bg-bg-alt border border-border rounded-[6px] p-6 mb-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-text-light mb-3">
              STEP 2 — CPPA Paper Mail
            </p>
            <h2 className="font-serif text-xl font-bold text-text mb-2">
              Download and mail your complaint form
            </h2>
            <p className="font-body text-sm text-text-mid mb-4">
              Print, sign, and mail to: California Privacy Protection Agency, ATTN: Complaints, 400 R Street, Suite 350, Sacramento, CA 95811.
            </p>
            <a
              href={`/api/filings/${filing.id}/cppa-pdf`}
              className="font-mono text-[11px] uppercase tracking-[0.1em] border border-border rounded-[6px] px-3 py-1 text-text-mid hover:text-text"
            >
              Download CPPA Complaint PDF ↓
            </a>
          </div>
        )}

        {/* Card C: CA AG Auto-Filed — always shown (SUCC-03) */}
        <div className="bg-bg-alt border border-border rounded-[6px] p-6 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-text-light">
              STEP {isADA ? '1' : '3'} — CA Attorney General
            </p>
            <span className="bg-bg-dark text-white font-mono text-[11px] uppercase px-2 py-0.5 rounded-[4px]">
              <span aria-hidden="true">✓ </span>Auto-Filed
            </span>
          </div>
          <h2 className="font-serif text-xl font-bold text-text mb-2">
            Your complaint was automatically submitted by fax
          </h2>
          {filing.faxId && (
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-text-light mb-1">
              Fax ID: <span className="font-mono text-sm text-text normal-case tracking-normal">{filing.faxId}</span>
            </p>
          )}
          <p className="font-body text-sm text-text-mid mb-3">
            Status:{' '}
            <span className={`font-mono text-[11px] uppercase tracking-[0.1em] ${faxDisplay.colorClass}`}>
              {filing.faxStatus ?? faxDisplay.label}
            </span>
          </p>
          {filing.complaintPdfUrl && (
            <a
              href={`/api/filings/${filing.id}/pdf`}
              className="font-mono text-[11px] uppercase tracking-[0.1em] border border-border rounded-[6px] px-3 py-1 text-text-mid hover:text-text"
            >
              Download Your Complaint PDF ↓
            </a>
          )}
        </div>

        {/* Section 5: Account creation CTA (guests only) — preserved unchanged (SUCC-04) */}
        {!filing.userId && (
          <div className="bg-bg-alt border border-border rounded-[6px] p-6 mb-6">
            <h2 className="font-serif text-base font-bold text-text mb-2">Track Your Filings</h2>
            <p className="font-body text-sm text-text-mid mb-4">
              Create a free account to view your filing history and download your complaint PDF anytime.
            </p>
            <a
              href={`/account/create?filingId=${filing.id}`}
              className="inline-block font-mono text-[11px] tracking-[0.1em] uppercase bg-bg-dark text-white px-8 py-3.5 rounded-[6px] hover:bg-text-mid transition-colors"
            >
              Create Free Account →
            </a>
          </div>
        )}

        {/* Section 6: Secondary action — preserved unchanged */}
        <div className="text-center">
          <a
            href="/file"
            className="inline-block font-mono text-[11px] tracking-[0.1em] uppercase border border-bg-dark text-text px-8 py-3 rounded-[6px] hover:bg-bg-dark hover:text-white transition-colors"
          >
            File Another Complaint
          </a>
        </div>

      </div>
      <Footer />
    </div>
  )
}
