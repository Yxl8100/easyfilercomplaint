import { describe, it, expect, vi } from 'vitest'

vi.mock('@/components/Masthead', () => ({ Masthead: () => null }))
vi.mock('@/components/Footer', () => ({ Footer: () => null }))

const PROHIBITED = ['DPW', 'Pro Veritas', 'APFC', 'ComplianceSweep', 'IdentifiedVerified']

describe('/privacy page', () => {
  it('contains zero prohibited entity strings (MKTG-07)', async () => {
    const { default: PrivacyPage } = await import('./page')
    const html = JSON.stringify(PrivacyPage())
    for (const term of PROHIBITED) {
      expect(html).not.toContain(term)
    }
  })

  it('includes CCPA section (MKTG-04)', async () => {
    const { default: PrivacyPage } = await import('./page')
    const html = JSON.stringify(PrivacyPage())
    expect(html).toContain('CCPA')
  })

  it('includes not-a-law-firm disclaimer', async () => {
    const { default: PrivacyPage } = await import('./page')
    const html = JSON.stringify(PrivacyPage())
    expect(html).toContain('not a law firm')
  })

  it('lists third-party services', async () => {
    const { default: PrivacyPage } = await import('./page')
    const html = JSON.stringify(PrivacyPage())
    expect(html).toContain('Stripe')
    expect(html).toContain('Resend')
    expect(html).toContain('Phaxio')
  })
})
