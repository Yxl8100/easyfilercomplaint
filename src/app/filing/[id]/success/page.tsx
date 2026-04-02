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
      id: true,
      filingReceiptId: true,
      targetName: true,
      category: true,
      status: true,
      paymentAmount: true,
      paidAt: true,
      complaintPdfUrl: true,
      userId: true,
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
            Your privacy complaint has been submitted to the CA Attorney General.
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
            { label: 'Agency', value: 'CA Attorney General' },
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

        {/* Section 4: PDF download link (conditional) */}
        {filing.complaintPdfUrl ? (
          <div className="mb-4">
            <a
              href={filing.complaintPdfUrl}
              className="font-mono text-[9px] uppercase tracking-[0.1em] border border-border rounded-[6px] px-3 py-1 text-text-mid hover:text-text"
            >
              Download Complaint PDF ↓
            </a>
          </div>
        ) : (
          <p className="font-mono text-[9px] tracking-[0.1em] uppercase text-text-light mb-4">
            Your complaint PDF will be available shortly.
          </p>
        )}

        {/* Section 5: Account creation CTA (guests only) */}
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

        {/* Section 6: Secondary action */}
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
