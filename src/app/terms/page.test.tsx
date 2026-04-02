import { describe, it, expect, vi } from 'vitest'

vi.mock('@/components/Masthead', () => ({ Masthead: () => null }))
vi.mock('@/components/Footer', () => ({ Footer: () => null }))

const PROHIBITED = ['DPW', 'Pro Veritas', 'APFC', 'ComplianceSweep', 'IdentifiedVerified']

describe('/terms page', () => {
  it('contains zero prohibited entity strings (MKTG-07)', async () => {
    const { default: TermsPage } = await import('./page')
    const html = JSON.stringify(TermsPage())
    for (const term of PROHIBITED) {
      expect(html).not.toContain(term)
    }
  })

  it('specifies Arizona governing law (MKTG-05)', async () => {
    const { default: TermsPage } = await import('./page')
    const html = JSON.stringify(TermsPage())
    expect(html).toContain('Arizona')
  })

  it('disclaims attorney-client relationship (MKTG-05)', async () => {
    const { default: TermsPage } = await import('./page')
    const html = JSON.stringify(TermsPage())
    expect(html).toContain('no attorney-client relationship')
  })

  it('states not a law firm (MKTG-05)', async () => {
    const { default: TermsPage } = await import('./page')
    const html = JSON.stringify(TermsPage())
    expect(html).toContain('not a law firm')
  })

  it('includes $1.99 payment terms', async () => {
    const { default: TermsPage } = await import('./page')
    const html = JSON.stringify(TermsPage())
    expect(html).toContain('$1.99')
    expect(html).toContain('non-refundable')
  })
})
