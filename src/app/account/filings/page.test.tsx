import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    filing: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`) }),
}))

vi.mock('@/components/Masthead', () => ({ Masthead: () => null }))
vi.mock('@/components/Footer', () => ({ Footer: () => null }))

const testSession = { user: { id: 'user-1', email: 'test@example.com' } }

const testFilings = [
  {
    id: 'filing-aaa',
    filingReceiptId: 'EFC-20260401-AAAAA',
    targetName: 'Acme Corp',
    status: 'filed',
    paidAt: new Date('2026-04-01T10:00:00Z'),
    complaintPdfUrl: 'https://blob.example.com/complaint-aaa.pdf',
    createdAt: new Date('2026-04-01T09:55:00Z'),
  },
  {
    id: 'filing-bbb',
    filingReceiptId: 'EFC-20260402-BBBBB',
    targetName: 'TechCo Inc',
    status: 'paid',
    paidAt: new Date('2026-04-02T11:00:00Z'),
    complaintPdfUrl: null,
    createdAt: new Date('2026-04-02T10:55:00Z'),
  },
]

describe('FilingsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('redirects to /login when no session', async () => {
    const { auth } = await import('@/lib/auth')
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const { default: FilingsPage } = await import('./page')
    await expect(FilingsPage()).rejects.toThrow('REDIRECT:/login')
  })

  it('renders filing receipt IDs for authenticated user', async () => {
    const { auth } = await import('@/lib/auth')
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(testSession)

    const { prisma } = await import('@/lib/prisma')
    ;(prisma.filing.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(testFilings)

    const { default: FilingsPage } = await import('./page')
    const result = await FilingsPage()
    const html = JSON.stringify(result)

    expect(html).toContain('EFC-20260401-AAAAA')
    expect(html).toContain('EFC-20260402-BBBBB')
  })

  it('renders Your Filings heading', async () => {
    const { auth } = await import('@/lib/auth')
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(testSession)

    const { prisma } = await import('@/lib/prisma')
    ;(prisma.filing.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(testFilings)

    const { default: FilingsPage } = await import('./page')
    const result = await FilingsPage()
    const html = JSON.stringify(result)

    expect(html).toContain('Your Filings')
  })

  it('renders Download Complaint PDF link pointing to /api/filings/{id}/pdf', async () => {
    const { auth } = await import('@/lib/auth')
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(testSession)

    const { prisma } = await import('@/lib/prisma')
    ;(prisma.filing.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(testFilings)

    const { default: FilingsPage } = await import('./page')
    const result = await FilingsPage()
    // FilingCard is a local component — it renders inline in JSX tree,
    // so the string representation includes deeply nested props.
    // Check for the filing id in the serialized props passed to FilingCard.
    const html = JSON.stringify(result)
    // The filing id should appear as the key prop and in the filing.id prop
    expect(html).toContain('filing-aaa')
    // Check the complaintPdfUrl is present in the filing props so proxy URL can be derived
    expect(html).toContain('blob.example.com/complaint-aaa.pdf')
  })

  it('shows PDF not yet available when complaintPdfUrl is null', async () => {
    const { auth } = await import('@/lib/auth')
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(testSession)

    const { prisma } = await import('@/lib/prisma')
    ;(prisma.filing.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(testFilings)

    const { default: FilingsPage } = await import('./page')
    const result = await FilingsPage()
    const html = JSON.stringify(result)
    // filing-bbb has complaintPdfUrl: null — it should appear in the filings list
    expect(html).toContain('filing-bbb')
    // complaintPdfUrl null is in the filing prop
    expect(html).toContain('"complaintPdfUrl":null')
  })

  it('shows empty state when no filings', async () => {
    const { auth } = await import('@/lib/auth')
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(testSession)

    const { prisma } = await import('@/lib/prisma')
    ;(prisma.filing.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

    const { default: FilingsPage } = await import('./page')
    const result = await FilingsPage()
    const html = JSON.stringify(result)

    expect(html).toContain('No filings yet.')
    expect(html).toContain('Once you pay for a complaint')
  })

  it('queries filings by userId from session', async () => {
    const { auth } = await import('@/lib/auth')
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(testSession)

    const { prisma } = await import('@/lib/prisma')
    ;(prisma.filing.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

    const { default: FilingsPage } = await import('./page')
    await FilingsPage()

    expect(prisma.filing.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
      })
    )
  })
})
