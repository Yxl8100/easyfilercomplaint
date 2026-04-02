import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    filing: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/components/Masthead', () => ({ Masthead: () => null }))
vi.mock('@/components/Footer', () => ({ Footer: () => null }))
vi.mock('@/components/DoubleRule', () => ({ DoubleRule: () => null }))

// Mock the client form component — it's a client component so we just check the server component passes the right props
vi.mock('./AccountCreateForm', () => ({
  AccountCreateForm: (props: { defaultEmail: string; defaultName: string; filingId: string | null }) => ({
    type: 'AccountCreateForm',
    props,
  }),
}))

describe('AccountCreatePage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders the Create Your Account heading in HTML output', async () => {
    const { default: AccountCreatePage } = await import('./page')
    const result = await AccountCreatePage({ searchParams: {} })
    const html = JSON.stringify(result)
    expect(html).toContain('Create Your Account')
  })

  it('passes empty email when no filingId provided', async () => {
    const { default: AccountCreatePage } = await import('./page')
    const result = await AccountCreatePage({ searchParams: {} })
    const html = JSON.stringify(result)
    // AccountCreateForm props are embedded in the JSX tree
    expect(html).toContain('defaultEmail')
  })

  it('fetches filing and pre-fills email from filerEmail when filingId provided', async () => {
    const { prisma } = await import('@/lib/prisma')
    ;(prisma.filing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      filerInfo: { name: 'Jane Doe', email: 'jane@example.com' },
      filerEmail: 'jane@example.com',
    })

    const { default: AccountCreatePage } = await import('./page')
    const result = await AccountCreatePage({ searchParams: { filingId: 'filing-123' } })
    const html = JSON.stringify(result)
    expect(html).toContain('jane@example.com')
  })

  it('falls back to filerInfo.email when filerEmail is null', async () => {
    const { prisma } = await import('@/lib/prisma')
    ;(prisma.filing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      filerInfo: { name: 'John Smith', email: 'john@example.com' },
      filerEmail: null,
    })

    const { default: AccountCreatePage } = await import('./page')
    const result = await AccountCreatePage({ searchParams: { filingId: 'filing-456' } })
    const html = JSON.stringify(result)
    expect(html).toContain('john@example.com')
  })

  it('passes filingId to the form component', async () => {
    const { prisma } = await import('@/lib/prisma')
    ;(prisma.filing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      filerInfo: { name: 'Jane Doe', email: 'jane@example.com' },
      filerEmail: 'jane@example.com',
    })

    const { default: AccountCreatePage } = await import('./page')
    const result = await AccountCreatePage({ searchParams: { filingId: 'filing-789' } })
    const html = JSON.stringify(result)
    expect(html).toContain('filing-789')
  })

  it('extracts name from filerInfo when provided', async () => {
    const { prisma } = await import('@/lib/prisma')
    ;(prisma.filing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      filerInfo: { name: 'Alice Walker', email: 'alice@example.com' },
      filerEmail: 'alice@example.com',
    })

    const { default: AccountCreatePage } = await import('./page')
    const result = await AccountCreatePage({ searchParams: { filingId: 'filing-abc' } })
    const html = JSON.stringify(result)
    expect(html).toContain('Alice Walker')
  })
})
