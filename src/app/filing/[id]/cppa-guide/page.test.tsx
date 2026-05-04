import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    filing: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND') }),
}))

vi.mock('@/components/Masthead', () => ({ Masthead: () => null }))
vi.mock('@/components/Footer',   () => ({ Footer:   () => null }))
vi.mock('@/components/CopyButton', () => ({
  CopyButton: ({ text }: { text: string }) => `[COPY:${text}]`,
}))

// Mock the generator — returns a fixed CPPAComplaint so page tests
// are not coupled to narrative generation logic (tested in Plan 09-02)
vi.mock('@/lib/cppa-complaint-generator', () => ({
  generateCPPAComplaint: vi.fn(() => ({
    q1CheckboxInstructions: ['Collection, use, storage, or sharing of my personal information'],
    q2BusinessName: 'Acme Corp (https://acme.com)',
    q3CaliforniaResident: 'Yes',
    q4Description: 'On or about March 2026, I visited the website https://acme.com. My personal data was collected.',
    q5SupportingMaterials: 'I have a screenshot of the website\'s tracking activity (Filing ID: EFC-20260401-ABCDE).',
    q6ContactedBusiness: 'No / Not applicable',
    q7ContactInfo: 'Jane Doe\njane@example.com',
  })),
}))

const baseFiling = {
  id: 'filing-uuid-001',
  category: 'privacy_tracking',
  targetName: 'Acme Corp',
  targetUrl: 'https://acme.com',
  description: 'They tracked me.',
  filerInfo: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
  filingReceiptId: 'EFC-20260401-ABCDE',
  categoryFields: { visitMonth: '3', visitYear: '2026' },
  filerEmail: 'jane@example.com',
}

describe('CPPAGuidePage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('CPGDE-01: renders 4 copy sections with CopyButton for Q2, Q4, Q5, Q7', async () => {
    const { prisma } = await import('@/lib/prisma')
    ;(prisma.filing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseFiling)
    const { default: GuidePage } = await import('./page')
    const html = JSON.stringify(await GuidePage({ params: { id: 'filing-uuid-001' } }))
    // Q2 copy section
    expect(html).toContain('Acme Corp (https://acme.com)')
    // Q4 copy section
    expect(html).toContain('On or about March 2026')
    // Q5 copy section
    expect(html).toContain('EFC-20260401-ABCDE')
    // Q7 copy section
    expect(html).toContain('Jane Doe')
  })

  it('CPGDE-04: renders link to cppa.ca.gov/webapplications/complaint', async () => {
    const { prisma } = await import('@/lib/prisma')
    ;(prisma.filing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseFiling)
    const { default: GuidePage } = await import('./page')
    const html = JSON.stringify(await GuidePage({ params: { id: 'filing-uuid-001' } }))
    expect(html).toContain('cppa.ca.gov/webapplications/complaint')
  })

  it('CPGDE-05: renders Q1 checkbox instructions (no CopyButton for Q1)', async () => {
    const { prisma } = await import('@/lib/prisma')
    ;(prisma.filing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseFiling)
    const { default: GuidePage } = await import('./page')
    const html = JSON.stringify(await GuidePage({ params: { id: 'filing-uuid-001' } }))
    // Q1 checkbox text is rendered
    expect(html).toContain('Collection, use, storage, or sharing of my personal information')
    // Q3 and Q6 are NOT rendered (D-02, CPGDE-05)
    expect(html).not.toContain('q3')
    expect(html).not.toContain('q6')
    expect(html).not.toContain('CA resident')
    expect(html).not.toContain('prior contact')
  })

  it('renders Filing Not Found when no filing exists', async () => {
    const { prisma } = await import('@/lib/prisma')
    ;(prisma.filing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const { default: GuidePage } = await import('./page')
    const html = JSON.stringify(await GuidePage({ params: { id: 'nonexistent-id' } }))
    expect(html).toContain('Filing Not Found')
  })

  it('CPGDE-01: calls generateCPPAComplaint with the fetched filing', async () => {
    const { prisma } = await import('@/lib/prisma')
    ;(prisma.filing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseFiling)
    const { generateCPPAComplaint } = await import('@/lib/cppa-complaint-generator')
    const { default: GuidePage } = await import('./page')
    await GuidePage({ params: { id: 'filing-uuid-001' } })
    expect(generateCPPAComplaint).toHaveBeenCalledOnce()
  })

  it('renders instruction text at top of page', async () => {
    const { prisma } = await import('@/lib/prisma')
    ;(prisma.filing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseFiling)
    const { default: GuidePage } = await import('./page')
    const html = JSON.stringify(await GuidePage({ params: { id: 'filing-uuid-001' } }))
    // D-06: instruction text locked by user decision
    expect(html).toContain('Open the CPPA complaint form')
    expect(html).toContain('paste your complaint in the description field')
  })

  it('renders back link to success page', async () => {
    const { prisma } = await import('@/lib/prisma')
    ;(prisma.filing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(baseFiling)
    const { default: GuidePage } = await import('./page')
    const html = JSON.stringify(await GuidePage({ params: { id: 'filing-uuid-001' } }))
    expect(html).toContain('/filing/filing-uuid-001/success')
  })
})
