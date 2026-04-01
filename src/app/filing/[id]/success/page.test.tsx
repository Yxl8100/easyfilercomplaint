import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    filing: {
      findUnique: vi.fn(),
    },
  },
}))

// Mock next/navigation (notFound) since we're not in Next.js runtime
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }),
}))

// Mock Masthead/Footer/DoubleRule to avoid complex component rendering
vi.mock('@/components/Masthead', () => ({ Masthead: () => null }))
vi.mock('@/components/Footer', () => ({ Footer: () => null }))
vi.mock('@/components/DoubleRule', () => ({ DoubleRule: () => null }))

const baseFiling = {
  id: 'filing-uuid-001',
  filingReceiptId: 'EFC-20260401-ABCDE',
  targetName: 'Acme Corp',
  category: 'data-privacy',
  status: 'paid',
  paymentAmount: '1.99',
  paidAt: new Date('2026-04-01T10:00:00Z'),
  complaintPdfUrl: null,
  userId: null,
  createdAt: new Date('2026-04-01T09:55:00Z'),
}

describe('SuccessPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders the filingReceiptId when filing is found', async () => {
    const { prisma } = await import('@/lib/prisma')
    ;(prisma.filing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseFiling)
    const { default: SuccessPage } = await import('./page')
    const result = await SuccessPage({ params: { id: 'filing-uuid-001' } })
    const html = JSON.stringify(result)
    expect(html).toContain('EFC-20260401-ABCDE')
  })

  it('renders business name in detail rows', async () => {
    const { prisma } = await import('@/lib/prisma')
    ;(prisma.filing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseFiling)
    const { default: SuccessPage } = await import('./page')
    const result = await SuccessPage({ params: { id: 'filing-uuid-001' } })
    const html = JSON.stringify(result)
    expect(html).toContain('Acme Corp')
  })

  it('renders PDF download link when complaintPdfUrl is set', async () => {
    const { prisma } = await import('@/lib/prisma')
    ;(prisma.filing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseFiling,
      complaintPdfUrl: 'https://blob.example.com/complaint.pdf',
    })
    const { default: SuccessPage } = await import('./page')
    const result = await SuccessPage({ params: { id: 'filing-uuid-001' } })
    const html = JSON.stringify(result)
    expect(html).toContain('Download Complaint PDF')
    expect(html).toContain('https://blob.example.com/complaint.pdf')
  })

  it('renders pending message when complaintPdfUrl is null', async () => {
    const { prisma } = await import('@/lib/prisma')
    ;(prisma.filing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseFiling)
    const { default: SuccessPage } = await import('./page')
    const result = await SuccessPage({ params: { id: 'filing-uuid-001' } })
    const html = JSON.stringify(result)
    expect(html).toContain('will be available shortly')
  })

  it('shows account creation CTA when Filing.userId is null', async () => {
    const { prisma } = await import('@/lib/prisma')
    ;(prisma.filing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ ...baseFiling, userId: null })
    const { default: SuccessPage } = await import('./page')
    const result = await SuccessPage({ params: { id: 'filing-uuid-001' } })
    const html = JSON.stringify(result)
    expect(html).toContain('Track Your Filings')
    expect(html).toContain('Create Free Account')
  })

  it('hides account creation CTA when Filing.userId is set', async () => {
    const { prisma } = await import('@/lib/prisma')
    ;(prisma.filing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseFiling,
      userId: 'user-uuid-123',
    })
    const { default: SuccessPage } = await import('./page')
    const result = await SuccessPage({ params: { id: 'filing-uuid-001' } })
    const html = JSON.stringify(result)
    expect(html).not.toContain('Track Your Filings')
  })

  it('renders Filing Not Found when no filing exists', async () => {
    const { prisma } = await import('@/lib/prisma')
    ;(prisma.filing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const { default: SuccessPage } = await import('./page')
    const result = await SuccessPage({ params: { id: 'nonexistent-id' } })
    const html = JSON.stringify(result)
    expect(html).toContain('Filing Not Found')
  })
})
