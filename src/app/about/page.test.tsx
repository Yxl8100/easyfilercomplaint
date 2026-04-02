import { describe, it, expect, vi } from 'vitest'

vi.mock('@/components/Masthead', () => ({ Masthead: () => null }))
vi.mock('@/components/Footer', () => ({ Footer: () => null }))

const PROHIBITED = ['DPW', 'Pro Veritas', 'APFC', 'ComplianceSweep', 'IdentifiedVerified']

describe('/about page', () => {
  it('contains zero prohibited entity strings (MKTG-07)', async () => {
    const { default: AboutPage } = await import('./page')
    const html = JSON.stringify(AboutPage())
    for (const term of PROHIBITED) {
      expect(html).not.toContain(term)
    }
  })

  it('describes EasyFilerComplaint as a filing service (MKTG-06)', async () => {
    const { default: AboutPage } = await import('./page')
    const html = JSON.stringify(AboutPage())
    expect(html).toContain('filing service')
    expect(html).toContain('EasyFilerComplaint')
  })

  it('includes contact information', async () => {
    const { default: AboutPage } = await import('./page')
    const html = JSON.stringify(AboutPage())
    expect(html).toContain('support@easyfilercomplaint.com')
  })

  it('mentions California Attorney General', async () => {
    const { default: AboutPage } = await import('./page')
    const html = JSON.stringify(AboutPage())
    expect(html).toContain('California Attorney General')
  })
})
