import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Masthead } from '@/components/Masthead'
import { Footer } from '@/components/Footer'

type FilingStatus = 'draft' | 'pending_payment' | 'paid' | 'generating' | 'filing' | 'filed' | 'failed'

interface FilingSummary {
  id: string
  filingReceiptId: string | null
  targetName: string
  status: FilingStatus
  paidAt: Date | null
  complaintPdfUrl: string | null
}

function StatusBadge({ status }: { status: FilingStatus }) {
  const configs: Record<string, { label: string; className: string }> = {
    filed: { label: 'Filed', className: 'bg-bg-dark text-white' },
    paid: { label: 'Paid', className: 'bg-bg-dark text-white' },
    failed: { label: 'Failed', className: 'bg-accent-bg text-accent border border-accent' },
    generating: { label: 'In Progress', className: 'bg-bg-alt text-text-mid border border-border' },
    filing: { label: 'In Progress', className: 'bg-bg-alt text-text-mid border border-border' },
    draft: { label: 'Draft', className: 'bg-bg-alt text-text-mid border border-border' },
    pending_payment: { label: 'Pending Payment', className: 'bg-bg-alt text-text-mid border border-border' },
  }

  const config = configs[status] ?? { label: status, className: 'bg-bg-alt text-text-mid border border-border' }

  return (
    <span
      aria-label={`Status: ${config.label}`}
      className={`font-mono text-[9px] tracking-[0.1em] uppercase px-2 py-0.5 rounded-[4px] ${config.className}`}
    >
      {config.label}
    </span>
  )
}

function FilingCard({ filing }: { filing: FilingSummary }) {
  return (
    <div className="bg-bg-alt border border-border rounded-[6px] p-6 mb-4">
      <div className="flex items-start justify-between mb-2">
        <span className="font-mono text-sm font-bold text-text tracking-wider">
          {filing.filingReceiptId ?? '—'}
        </span>
        <StatusBadge status={filing.status} />
      </div>
      <p className="font-body text-sm text-text-mid mb-1">{filing.targetName}</p>
      {filing.paidAt && (
        <p className="font-body text-sm text-text-mid mb-3">
          {new Date(filing.paidAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      )}
      {filing.complaintPdfUrl ? (
        <a
          href={`/api/filings/${filing.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Download complaint PDF for filing ${filing.filingReceiptId}`}
          className="font-mono text-[9px] uppercase tracking-[0.1em] border border-border rounded-[6px] px-3 py-1 text-text-mid hover:text-text"
        >
          Download Complaint PDF ↓
        </a>
      ) : (
        <span className="font-mono text-[9px] text-text-light">PDF not yet available</span>
      )}
    </div>
  )
}

export default async function FilingsPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const filings = await prisma.filing.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      filingReceiptId: true,
      targetName: true,
      status: true,
      paidAt: true,
      complaintPdfUrl: true,
    },
  })

  return (
    <div className="min-h-screen bg-bg">
      <Masthead />
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="font-serif text-3xl font-bold text-text mb-6">Your Filings</h1>

        {filings.length === 0 ? (
          <div className="bg-bg-alt border border-border rounded-[6px] p-6 text-center">
            <p className="font-body text-sm font-bold text-text mb-2">No filings yet.</p>
            <p className="font-body text-sm text-text-mid">
              Once you pay for a complaint, your filing history will appear here.
            </p>
          </div>
        ) : (
          filings.map((filing) => (
            <FilingCard key={filing.id} filing={filing as FilingSummary} />
          ))
        )}
      </div>
      <Footer />
    </div>
  )
}
