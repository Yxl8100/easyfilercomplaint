import { describe, it, expect } from 'vitest'
import { generateCPPAComplaint } from '../cppa-complaint-generator'
import type { Filing } from '@prisma/client'

// Base mock fixture — category 'privacy_tracking', has visitMonth/Year in categoryFields
const mockFiling = {
  id: 'test-filing-id',
  userId: null,
  category: 'privacy_tracking',
  targetName: 'Acme Corp',
  targetUrl: 'https://acme.com',
  targetAddress: null,
  targetCity: null,
  targetState: null,
  targetZip: null,
  targetPhone: null,
  targetEmail: null,
  incidentDate: null,
  description: 'I noticed tracking pixels on the homepage',
  amountPaid: null,
  paymentMethod: null,
  priorContact: false,
  priorContactDetails: null,
  categoryFields: { visitMonth: '3', visitYear: '2026' },
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
  filingReceiptId: 'EFC-20260315-AAAAA',
  evidenceFileUrl: null,
  evidenceFileName: null,
  complaintPdfUrl: null,
  receiptEmailSentAt: null,
  status: 'paid' as const,
  filerInfo: {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    phone: '555-0100',
    address: '123 Oak Ave',
    city: 'Sacramento',
    state: 'CA',
    zip: '95814',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as Filing

const mockFilingVideoSharing = {
  ...mockFiling,
  category: 'video_sharing',
  categoryFields: { visitMonth: '6', visitYear: '2025' },
} as unknown as Filing

const mockFilingAccessibility = {
  ...mockFiling,
  category: 'accessibility',
  categoryFields: { visitMonth: '1', visitYear: '2026' },
} as unknown as Filing

const mockFilingNoUrl = {
  ...mockFiling,
  targetUrl: null,
} as unknown as Filing

describe('generateCPPAComplaint', () => {
  it('CPTXT-01: returns all 7 fields, none null or undefined', () => {
    const result = generateCPPAComplaint(mockFiling)
    expect(result.q1CheckboxInstructions).toBeDefined()
    expect(result.q2BusinessName).toBeDefined()
    expect(result.q3CaliforniaResident).toBeDefined()
    expect(result.q4Description).toBeDefined()
    expect(result.q5SupportingMaterials).toBeDefined()
    expect(result.q6ContactedBusiness).toBeDefined()
    expect(result.q7ContactInfo).toBeDefined()
  })

  it('CPTXT-02: q4Description has no statute citations and is ≤2000 chars', () => {
    const { q4Description } = generateCPPAComplaint(mockFiling)
    expect(q4Description).not.toContain('§')
    expect(q4Description).not.toContain('Civil Code')
    expect(q4Description).not.toContain('Penal Code')
    expect(q4Description).not.toContain('42 U.S.C.')
    expect(q4Description).not.toContain('1798')
    expect(q4Description.length).toBeLessThanOrEqual(2000)
  })

  it('CPTXT-03: visit date formatted as "March 2026" not numeric or N/A', () => {
    const { q4Description } = generateCPPAComplaint(mockFiling)
    expect(q4Description).toContain('March 2026')
    expect(q4Description).not.toContain('03/2026')
    expect(q4Description).not.toContain('N/A')
    expect(q4Description).not.toContain('undefined')
  })

  it('CPTXT-04: user description integrated inline, not as orphaned sentence', () => {
    const { q4Description } = generateCPPAComplaint(mockFiling)
    expect(q4Description).toContain('I noticed tracking pixels on the homepage')
    expect(q4Description).not.toContain('Specifically, I observed:')
  })

  it('CPTXT-05: q2BusinessName includes URL when targetUrl present', () => {
    const { q2BusinessName } = generateCPPAComplaint(mockFiling)
    expect(q2BusinessName).toBe('Acme Corp (https://acme.com)')
  })

  it('CPTXT-05: q2BusinessName is just targetName when targetUrl is null', () => {
    const { q2BusinessName } = generateCPPAComplaint(mockFilingNoUrl)
    expect(q2BusinessName).toBe('Acme Corp')
  })

  it('DESC-03: privacy_tracking has 2 CPPA checkboxes', () => {
    const { q1CheckboxInstructions } = generateCPPAComplaint(mockFiling)
    expect(q1CheckboxInstructions).toHaveLength(2)
  })

  it('DESC-03: video_sharing has 1 CPPA checkbox', () => {
    const { q1CheckboxInstructions } = generateCPPAComplaint(mockFilingVideoSharing)
    expect(q1CheckboxInstructions).toHaveLength(1)
  })

  it('DESC-03: accessibility (ADA) has 0 CPPA checkboxes', () => {
    const { q1CheckboxInstructions } = generateCPPAComplaint(mockFilingAccessibility)
    expect(q1CheckboxInstructions).toHaveLength(0)
  })

  it('q3CaliforniaResident is always "Yes"', () => {
    expect(generateCPPAComplaint(mockFiling).q3CaliforniaResident).toBe('Yes')
  })

  it('q6ContactedBusiness is always "No / Not applicable"', () => {
    expect(generateCPPAComplaint(mockFiling).q6ContactedBusiness).toBe('No / Not applicable')
  })

  it('q5SupportingMaterials contains the filing receipt ID', () => {
    const { q5SupportingMaterials } = generateCPPAComplaint(mockFiling)
    expect(q5SupportingMaterials).toContain('EFC-20260315-AAAAA')
    expect(q5SupportingMaterials).toContain('EasyFilerComplaint')
  })

  it('q7ContactInfo contains filer name and email', () => {
    const { q7ContactInfo } = generateCPPAComplaint(mockFiling)
    expect(q7ContactInfo).toContain('Jane Doe')
    expect(q7ContactInfo).toContain('jane@example.com')
  })

  it('handles missing visitMonth/visitYear gracefully (falls back to "a recent date")', () => {
    const noDateFiling = {
      ...mockFiling,
      categoryFields: {},
    } as unknown as Filing
    const { q4Description } = generateCPPAComplaint(noDateFiling)
    expect(q4Description).toContain('a recent date')
    expect(q4Description).not.toContain('undefined')
    expect(q4Description).not.toContain('N/A')
  })
})
