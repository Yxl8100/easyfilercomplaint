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

  // EMAIL-05: Prohibited strings
  const PROHIBITED = ['DPW', 'PV Law', 'APFC', 'lawsuits', 'attorney']
  PROHIBITED.forEach((word) => {
    it(`does not contain prohibited string "${word}" (case-insensitive)`, () => {
      expect(html.toLowerCase()).not.toContain(word.toLowerCase())
    })
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

// Mock Resend
const mockSend = vi.fn().mockResolvedValue({ id: 'email-123' })
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}))

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    filing: { update: vi.fn().mockResolvedValue({}) },
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
    ;(prisma.filing.update as any).mockResolvedValue({})
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
    const mockUpdate = prisma.filing.update as any
    expect(mockUpdate).toHaveBeenCalledTimes(1)
    const updateArgs = mockUpdate.mock.calls[0][0]
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
