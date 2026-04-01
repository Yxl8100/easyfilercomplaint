import { describe, it, expect } from 'vitest'
import { generateComplaintPdf } from '../generate-complaint-pdf'

// Mock Filing fixture (Prisma Filing model fields ONLY -- no personal info)
const mockFiling = {
  id: 'test-filing-id',
  userId: null,
  category: 'data-privacy',
  targetName: 'Test Corp',
  targetUrl: 'https://testcorp.com',
  targetAddress: '123 Main St',
  targetCity: 'Los Angeles',
  targetState: 'CA',
  targetZip: '90001',
  targetPhone: null,
  targetEmail: null,
  incidentDate: new Date('2026-01-15'),
  description: 'Test description of privacy violation',
  amountPaid: null,
  paymentMethod: null,
  priorContact: false,
  priorContactDetails: null,
  categoryFields: { trackingTypes: ['cookies', 'pixel trackers'] },
  generatedText: null,
  invoiceId: null,
  stripeSessionId: null,
  stripePaymentId: null,
  paymentStatus: 'paid',
  paymentAmount: null,
  paidAt: null,
  faxId: null,
  faxStatus: null,
  faxSentAt: null,
  faxCompletedAt: null,
  faxPages: null,
  filingReceiptId: 'EFC-20260115-ABCDE',
  evidenceFileUrl: null,
  evidenceFileName: null,
  complaintPdfUrl: null,
  receiptEmailSentAt: null,
  status: 'paid' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
} as any // Cast to Filing type for test

// Mock FilerInfo fixture (personal info for the filer)
const mockFilerInfo = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  address: '456 Oak Ave',
  city: 'Sacramento',
  state: 'CA',
  zip: '95814',
  phone: '555-0100',
  county: 'Sacramento',
}

// Variant Filing fixtures (spread from mockFiling, override only Filing fields)
const mockFilingAccessibility = {
  ...mockFiling,
  id: 'test-filing-accessibility',
  category: 'accessibility',
  description: 'Website lacks screen reader support and keyboard navigation',
  categoryFields: { issueTypes: ['screen-reader', 'keyboard-nav'] },
}

const mockFilingVideoSharing = {
  ...mockFiling,
  id: 'test-filing-video-sharing',
  category: 'video-sharing',
  description: 'Unauthorized distribution of personal video content without consent',
  categoryFields: { contentType: 'video', platform: 'social-media' },
}

// Prohibited strings (union of REQUIREMENTS.md PDF-06 and ROADMAP.md SC#4 lists)
const PROHIBITED = [
  'DPW',
  'PV Law',
  'Pro Veritas',
  'APFC',
  'ComplianceSweep',
  'IV',
  'IdentifiedVerified',
  'lawsuits',
  'attorneys',
  'attorney',
  'law firm',
]

describe('generateComplaintPdf', () => {
  it('PDF-01: returns a non-empty Uint8Array for a privacy_tracking (data-privacy) filing', async () => {
    const bytes = await generateComplaintPdf(mockFiling, mockFilerInfo)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(0)
  })

  it('PDF-02: PDF bytes contain required section markers', async () => {
    const bytes = await generateComplaintPdf(mockFiling, mockFilerInfo)
    const text = Buffer.from(bytes).toString('latin1')
    expect(text).toContain('PRIVACY COMPLAINT')
    expect(text).toContain('Re:')
    expect(text).toContain('Respectfully submitted')
    expect(text).toContain('EasyFilerComplaint')
    expect(text).toContain('Filing ID:')
  })

  it('PDF-03 variant 1: privacy_tracking PDF bytes contain CCPA reference', async () => {
    const bytes = await generateComplaintPdf(mockFiling, mockFilerInfo)
    const text = Buffer.from(bytes).toString('latin1')
    const hasCCPA = text.includes('CCPA') || text.includes('California Consumer Privacy Act')
    expect(hasCCPA).toBe(true)
  })

  it('PDF-03 variant 2: accessibility PDF bytes contain Unruh or ADA reference', async () => {
    const bytes2 = await generateComplaintPdf(mockFilingAccessibility, mockFilerInfo)
    const text2 = Buffer.from(bytes2).toString('latin1')
    const hasADA = text2.includes('Unruh') || text2.includes('ADA')
    expect(hasADA).toBe(true)
  })

  it('PDF-03 variant 3: video_sharing PDF bytes contain video reference', async () => {
    const bytes3 = await generateComplaintPdf(mockFilingVideoSharing, mockFilerInfo)
    const text3 = Buffer.from(bytes3).toString('latin1')
    expect(text3).toContain('video')
  })

  it('PDF-07: PDF bytes do NOT contain StandardFonts (no Times-Roman or Helvetica)', async () => {
    const bytes = await generateComplaintPdf(mockFiling, mockFilerInfo)
    const text = Buffer.from(bytes).toString('latin1')
    expect(text).not.toContain('Times-Roman')
    expect(text).not.toContain('Helvetica')
  })

  it('PDF-06: PDF bytes contain zero occurrences of prohibited strings', async () => {
    const bytes = await generateComplaintPdf(mockFiling, mockFilerInfo)
    const text = Buffer.from(bytes).toString('latin1')

    for (const prohibited of PROHIBITED) {
      if (prohibited === 'IV') {
        // Use word-boundary check for IV to avoid false positives in binary data
        expect(text).not.toMatch(/\bIV\b/)
      } else {
        expect(text).not.toContain(prohibited)
      }
    }
  })
})
