import { describe, it, expect, vi } from 'vitest'

vi.mock('@/components/Masthead', () => ({ Masthead: () => null }))
vi.mock('@/components/Footer', () => ({ Footer: () => null }))
vi.mock('@/components/HomeFaq', () => ({ HomeFaq: () => null }))
vi.mock('@/components/DoubleRule', () => ({ DoubleRule: () => null }))
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    ({ type: 'a', props: { href, children }, key: null, ref: null } as unknown as React.ReactElement),
}))

const PROHIBITED = ['DPW', 'Pro Veritas', 'APFC', 'ComplianceSweep', 'IdentifiedVerified']

describe('homepage', () => {
  it('contains zero prohibited entity strings (MKTG-07)', async () => {
    const { default: HomePage } = await import('./page')
    const html = JSON.stringify(HomePage())
    for (const term of PROHIBITED) {
      expect(html).not.toContain(term)
    }
  })

  it('hero heading contains required text (MKTG-01)', async () => {
    const { default: HomePage } = await import('./page')
    const html = JSON.stringify(HomePage())
    expect(html).toContain('File a Privacy Complaint')
    expect(html).toContain('in 5 Minutes')
  })

  it('primary CTA links to /file (MKTG-01)', async () => {
    const { default: HomePage } = await import('./page')
    const html = JSON.stringify(HomePage())
    expect(html).toContain('/file')
  })

  it('How It Works section shows 3 steps (MKTG-02)', async () => {
    const { default: HomePage } = await import('./page')
    const html = JSON.stringify(HomePage())
    expect(html).toContain('Three Steps to an Official Filing')
    // Verify 3 step numerals present
    expect(html).toContain('"I"')
    expect(html).toContain('"II"')
    expect(html).toContain('"III"')
    // Verify old 4th step is gone
    expect(html).not.toContain('"IV"')
  })

  it('shows $1.99 pricing not $0.50 (MKTG-01)', async () => {
    const { default: HomePage } = await import('./page')
    const html = JSON.stringify(HomePage())
    expect(html).toContain('$1.99')
    expect(html).not.toContain('$0.50')
    expect(html).not.toContain('Annual Membership')
  })

  it('does not reference old multi-agency model', async () => {
    const { default: HomePage } = await import('./page')
    const html = JSON.stringify(HomePage())
    expect(html).not.toContain('Seven government agencies')
    expect(html).not.toContain('/auth/signin')
  })
})
