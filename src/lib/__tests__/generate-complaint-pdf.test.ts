import { describe, it, expect } from 'vitest'
import { inflateSync } from 'zlib'
import { generateComplaintPdf } from '../generate-complaint-pdf'

// Utility: extract searchable text from a PDF for test assertions.
// Only extracts content from:
// 1. Uncompressed Info dictionary literal strings (Subject, Keywords, Description, etc.)
// 2. Decompressed FlateDecode content streams (with PDF hex string decoding)
// Does NOT include raw binary font data to avoid false positives.
function extractPdfText(bytes: Uint8Array): string {
  const buf = Buffer.from(bytes)
  const parts: string[] = []

  // Extract literal strings from uncompressed PDF header section.
  // The Info dictionary (Subject, Keywords, Description) appears before
  // any compressed stream data. Grab everything up to the first stream.
  const rawLatin1 = buf.toString('latin1')
  const firstStreamIdx = rawLatin1.indexOf('\nstream\n') === -1
    ? rawLatin1.indexOf('\r\nstream\r\n')
    : rawLatin1.indexOf('\nstream\n')
  const headerSection = firstStreamIdx > 0
    ? rawLatin1.slice(0, firstStreamIdx)
    : rawLatin1.slice(0, 8192)
  // Include the header section text as-is — literal PDF strings (X X) are readable here
  parts.push(headerSection)

  // Decompress and decode FlateDecode content streams (page content, not fonts)
  let idx = 0
  while (true) {
    const streamPos = buf.indexOf('stream', idx)
    if (streamPos < 0) break

    const afterStream = streamPos + 6
    let dataStart: number
    if (buf[afterStream] === 13 && buf[afterStream + 1] === 10) {
      dataStart = afterStream + 2
    } else if (buf[afterStream] === 10) {
      dataStart = afterStream + 1
    } else {
      idx = streamPos + 1
      continue
    }

    const endPos = buf.indexOf(Buffer.from('endstream'), dataStart)
    if (endPos < 0) {
      idx = streamPos + 1
      continue
    }

    let streamEnd = endPos
    if (buf[endPos - 2] === 13 && buf[endPos - 1] === 10) streamEnd = endPos - 2
    else if (buf[endPos - 1] === 10) streamEnd = endPos - 1

    const chunk = buf.slice(dataStart, streamEnd)
    // Only process small-to-medium streams (content streams, not font data)
    // Font streams are very large (100KB+); skip them to avoid false positives in binary data.
    if (chunk.length > 50000) {
      idx = endPos + 9
      continue
    }

    try {
      const decompressed = inflateSync(chunk)
      const streamText = decompressed.toString('latin1')
      // Decode PDF hex strings <HEXHEX> -> text
      const decoded = streamText.replace(/<([0-9A-Fa-f]+)>/g, (_match, hex) => {
        const hexStr = hex as string
        let result = ''
        for (let i = 0; i < hexStr.length; i += 2) {
          result += String.fromCharCode(parseInt(hexStr.slice(i, i + 2), 16))
        }
        return result
      })
      parts.push(decoded)
    } catch {
      // Not decodable — skip
    }

    idx = endPos + 9
  }

  return parts.join('\n')
}

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
    const text = extractPdfText(bytes)
    expect(text).toContain('PRIVACY COMPLAINT')
    expect(text).toContain('Re:')
    expect(text).toContain('Respectfully submitted')
    expect(text).toContain('EasyFilerComplaint')
    expect(text).toContain('Filing ID:')
  })

  it('PDF-03 variant 1: privacy_tracking PDF bytes contain CCPA reference', async () => {
    const bytes = await generateComplaintPdf(mockFiling, mockFilerInfo)
    const text = extractPdfText(bytes)
    const hasCCPA = text.includes('CCPA') || text.includes('California Consumer Privacy Act')
    expect(hasCCPA).toBe(true)
  })

  it('PDF-03 variant 2: accessibility PDF bytes contain Unruh or ADA reference', async () => {
    const bytes2 = await generateComplaintPdf(mockFilingAccessibility, mockFilerInfo)
    const text2 = extractPdfText(bytes2)
    const hasADA = text2.includes('Unruh') || text2.includes('ADA')
    expect(hasADA).toBe(true)
  })

  it('PDF-03 variant 3: video_sharing PDF bytes contain video reference', async () => {
    const bytes3 = await generateComplaintPdf(mockFilingVideoSharing, mockFilerInfo)
    const text3 = extractPdfText(bytes3)
    expect(text3).toContain('video')
  })

  it('PDF-07: PDF bytes do NOT contain StandardFonts (no Times-Roman or Helvetica)', async () => {
    const bytes = await generateComplaintPdf(mockFiling, mockFilerInfo)
    // Check the raw PDF structure for font references (these are uncompressed dictionary entries)
    const rawText = Buffer.from(bytes).toString('latin1')
    expect(rawText).not.toContain('Times-Roman')
    expect(rawText).not.toContain('Helvetica')
  })

  it('PDF-06: PDF bytes contain zero occurrences of prohibited strings', async () => {
    const bytes = await generateComplaintPdf(mockFiling, mockFilerInfo)
    const text = extractPdfText(bytes)

    for (const prohibited of PROHIBITED) {
      if (prohibited === 'IV') {
        // Use word-boundary check for IV to avoid false positives
        expect(text).not.toMatch(/\bIV\b/)
      } else {
        expect(text).not.toContain(prohibited)
      }
    }
  })
})
