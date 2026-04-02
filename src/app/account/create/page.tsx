import { prisma } from '@/lib/prisma'
import { Masthead } from '@/components/Masthead'
import { Footer } from '@/components/Footer'
import { DoubleRule } from '@/components/DoubleRule'
import { AccountCreateForm } from './AccountCreateForm'

interface PageProps {
  searchParams: { filingId?: string }
}

export default async function AccountCreatePage({ searchParams }: PageProps) {
  const filingId = searchParams.filingId ?? null
  let defaultEmail = ''
  let defaultName = ''

  if (filingId) {
    const filing = await prisma.filing.findUnique({
      where: { id: filingId },
      select: { filerInfo: true, filerEmail: true },
    })
    if (filing) {
      const filerInfo = filing.filerInfo as Record<string, string> | null
      defaultEmail = filing.filerEmail ?? filerInfo?.email ?? ''
      defaultName = filerInfo?.name ?? ''
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <Masthead />
      <div className="max-w-3xl mx-auto px-6 py-12">
        <DoubleRule />
        <h1 className="font-serif text-3xl font-bold text-text mb-2">
          Create Your Account
        </h1>
        <p className="font-body text-sm text-text-mid mb-6">
          Save your filing history and download your complaint PDF anytime.
        </p>

        <AccountCreateForm
          defaultEmail={defaultEmail}
          defaultName={defaultName}
          filingId={filingId}
        />
      </div>
      <Footer />
    </div>
  )
}
