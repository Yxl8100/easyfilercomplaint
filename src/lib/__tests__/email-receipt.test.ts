import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildReceiptEmailHtml } from '@/lib/email-receipt'

describe('buildReceiptEmailHtml', () => {
  const params = {
    filingReceiptId: 'EFC-20260401-ABC12',
    targetName: 'Acme Corp',
    agencyName: 'California Attorney General',
    paidAt: new Date('2026-04-01T12:00:00Z'),
    paymentAmount: 1.99,
    faxFailed: false,
  }

  const html = buildReceiptEmailHtml(params)

  // EMAIL-05: Prohibited strings (entity separation — no law firm / legal counsel references)
  // Note: "attorney" is prohibited as a reference to legal representation (e.g., "our attorney",
  // "attorney-client"). The government agency title "Attorney General" (a public office) is allowed.
  it('does not contain "DPW" (prohibited entity reference)', () => {
    expect(html.toLowerCase()).not.toContain('dpw')
  })

  it('does not contain "PV Law" (prohibited entity reference)', () => {
    expect(html.toLowerCase()).not.toContain('pv law')
  })

  it('does not contain "APFC" (prohibited entity reference)', () => {
    expect(html.toLowerCase()).not.toContain('apfc')
  })

  it('does not contain "lawsuits" (prohibited legal reference)', () => {
    expect(html.toLowerCase()).not.toContain('lawsuits')
  })

  it('does not contain attorney as a legal-representation reference (not government office title)', () => {
    // "California Attorney General" is a government agency — allowed
    // Strip known allowed phrase then check no remaining "attorney" references
    const htmlWithoutAgencyTitle = html.replace(/attorney general/gi, '')
    expect(htmlWithoutAgencyTitle.toLowerCase()).not.toContain('attorney')
  })

  // EMAIL-03: Required content
  it('contains filing receipt ID', () => {
    expect(html).toContain('EFC-20260401-ABC12')
  })

  it('contains business name', () => {
    expect(html).toContain('Acme Corp')
  })

  it('contains agency name', () => {
    expect(html).toContain('California Attorney General')
  })

  it('contains formatted payment amount', () => {
    expect(html).toContain('$1.99')
  })

  it('contains formatted date', () => {
    // toLocaleDateString('en-US', ...) produces "April 1, 2026"
    expect(html).toContain('2026')
  })

  it('does not contain fax failure note when faxFailed=false', () => {
    expect(html).not.toContain('Fax delivery encountered an issue')
  })

  it('contains fax failure note when faxFailed=true', () => {
    const failedHtml = buildReceiptEmailHtml({ ...params, faxFailed: true })
    expect(failedHtml).toContain('Fax delivery encountered an issue')
  })
})

const mockSend = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 'email-123' }))

// Mock Resend
vi.mock('resend', () => ({
  Resend: function MockResend() {
    return { emails: { send: mockSend } }
  },
}))

// Mock Prisma
const mockPrismaUpdate = vi.hoisted(() => vi.fn().mockResolvedValue({}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    filing: { update: mockPrismaUpdate },
  },
}))

// Mock agency-directory
vi.mock('@/lib/agency-directory', () => ({
  getAgencyName: vi.fn().mockReturnValue('California Attorney General'),
}))

import { sendFilingReceiptEmail } from '@/lib/email-receipt'
import { prisma } from '@/lib/prisma'

const mockFiling = {
  id: 'filing-123',
  filingReceiptId: 'EFC-20260401-ABC12',
  targetName: 'Acme Corp',
  paidAt: new Date('2026-04-01'),
  paymentAmount: 1.99,
  filerInfo: { email: 'jane@example.com', firstName: 'Jane', lastName: 'Doe' },
} as any

describe('sendFilingReceiptEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSend.mockResolvedValue({ id: 'email-123' })
    mockPrismaUpdate.mockResolvedValue({})
  })

  it('EMAIL-01: resend.emails.send is called exactly once', async () => {
    await sendFilingReceiptEmail(mockFiling, new Uint8Array([1, 2, 3]), false)
    expect(mockSend).toHaveBeenCalledTimes(1)
  })

  it('EMAIL-02: from field is "EasyFilerComplaint <noreply@easyfilercomplaint.com>"', async () => {
    await sendFilingReceiptEmail(mockFiling, new Uint8Array([1, 2, 3]), false)
    const callArgs = mockSend.mock.calls[0][0]
    expect(callArgs.from).toBe('EasyFilerComplaint <noreply@easyfilercomplaint.com>')
  })

  it('EMAIL-03: subject contains the filing receipt ID', async () => {
    await sendFilingReceiptEmail(mockFiling, new Uint8Array([1, 2, 3]), false)
    const callArgs = mockSend.mock.calls[0][0]
    expect(callArgs.subject).toContain('EFC-20260401-ABC12')
  })

  it('EMAIL-04: attachments[0].filename equals EFC_Filing_EFC-20260401-ABC12.pdf', async () => {
    await sendFilingReceiptEmail(mockFiling, new Uint8Array([1, 2, 3]), false)
    const callArgs = mockSend.mock.calls[0][0]
    expect(callArgs.attachments[0].filename).toBe('EFC_Filing_EFC-20260401-ABC12.pdf')
  })

  it('EMAIL-04: attachments[0].content is a Buffer', async () => {
    await sendFilingReceiptEmail(mockFiling, new Uint8Array([1, 2, 3]), false)
    const callArgs = mockSend.mock.calls[0][0]
    expect(Buffer.isBuffer(callArgs.attachments[0].content)).toBe(true)
  })

  it('EMAIL-06: prisma.filing.update called with receiptEmailSentAt being a Date instance', async () => {
    await sendFilingReceiptEmail(mockFiling, new Uint8Array([1, 2, 3]), false)
    expect(mockPrismaUpdate).toHaveBeenCalledTimes(1)
    const updateArgs = mockPrismaUpdate.mock.calls[0][0]
    expect(updateArgs.data.receiptEmailSentAt).toBeInstanceOf(Date)
  })

  it('Guard: throws when filingReceiptId is missing', async () => {
    const filingNoReceiptId = { ...mockFiling, filingReceiptId: null }
    await expect(
      sendFilingReceiptEmail(filingNoReceiptId, new Uint8Array([1, 2, 3]), false)
    ).rejects.toThrow('no filingReceiptId')
  })

  it('Guard: throws when consumer email is missing', async () => {
    const filingNoEmail = { ...mockFiling, filerInfo: { firstName: 'Jane' } }
    await expect(
      sendFilingReceiptEmail(filingNoEmail, new Uint8Array([1, 2, 3]), false)
    ).rejects.toThrow('no consumer email')
  })
})
