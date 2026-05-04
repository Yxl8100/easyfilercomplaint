import { describe, it, expect } from 'vitest'
import { inflateSync } from 'zlib'
import { generateCPPAComplaintPdf } from '../cppa-pdf-generator'
import type { Filing } from '@prisma/client'

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

const mockFiling = {
  id: 'test-cppa-pdf-id',
  userId: null,
  category: 'privacy_tracking',
  targetName: 'Test Corp',
  targetUrl: 'https://testcorp.com',
  targetAddress: null, targetCity: null, targetState: null, targetZip: null,
  targetPhone: null, targetEmail: null, incidentDate: null,
  description: 'Test description of privacy violation',
  amountPaid: null, paymentMethod: null,
  priorContact: false, priorContactDetails: null,
  categoryFields: { visitMonth: '3', visitYear: '2026' },
  generatedText: null, invoiceId: null, stripeSessionId: null,
  stripePaymentId: null, paymentStatus: 'paid', paymentAmount: null, paidAt: null,
  faxId: null, faxStatus: null, faxSentAt: null, faxCompletedAt: null, faxPages: null,
  filingReceiptId: 'EFC-20260315-CPPDF',
  evidenceFileUrl: null, evidenceFileName: null, complaintPdfUrl: null,
  receiptEmailSentAt: null, status: 'paid' as const,
  filerInfo: {
    firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com',
    phone: '555-0100', address: '123 Oak Ave',
    city: 'Sacramento', state: 'CA', zip: '95814',
  },
  createdAt: new Date(), updatedAt: new Date(),
} as unknown as Filing

const PROHIBITED = [
  'DPW', 'PV Law', 'Pro Veritas', 'APFC', 'ComplianceSweep',
  'IV', 'IdentifiedVerified', 'lawsuits', 'attorneys', 'attorney', 'law firm',
]

describe('generateCPPAComplaintPdf', () => {
  it('CPPDF-01: returns non-empty Uint8Array', async () => {
    const bytes = await generateCPPAComplaintPdf(mockFiling)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(0)
  })

  it('CPPDF-01: PDF contains CPPA mailing address header', async () => {
    const bytes = await generateCPPAComplaintPdf(mockFiling)
    const text = extractPdfText(bytes)
    expect(text).toContain('California Privacy Protection Agency')
    expect(text).toContain('400 R Street')
    expect(text).toContain('Sacramento')
    expect(text).toContain('95811')
  })

  it('CPPDF-01: PDF Info dictionary contains all 10 section markers', async () => {
    const bytes = await generateCPPAComplaintPdf(mockFiling)
    const text = extractPdfText(bytes)
    expect(text).toContain('CPPA COMPLAINT')
    expect(text).toContain('MAILING ADDRESS')
    expect(text).toContain('Q1')
    expect(text).toContain('Q2')
    expect(text).toContain('Q3')
    expect(text).toContain('Q4')
    expect(text).toContain('Q5')
    expect(text).toContain('Q6')
    expect(text).toContain('Q7')
    expect(text).toContain('PERJURY ATTESTATION')
  })

  it('CPPDF-01: PDF contains perjury attestation text', async () => {
    const bytes = await generateCPPAComplaintPdf(mockFiling)
    const text = extractPdfText(bytes)
    expect(text).toContain('penalty of perjury')
    expect(text).toContain('California')
  })

  it('CPPDF-02: PDF footer contains filing ID', async () => {
    const bytes = await generateCPPAComplaintPdf(mockFiling)
    const text = extractPdfText(bytes)
    expect(text).toContain('EFC-20260315-CPPDF')
    expect(text).toContain('Filing ID:')
  })

  it('CPPDF-02: PDF contains zero prohibited strings', async () => {
    const bytes = await generateCPPAComplaintPdf(mockFiling)
    const text = extractPdfText(bytes)
    for (const prohibited of PROHIBITED) {
      if (prohibited === 'IV') {
        expect(text).not.toMatch(/\bIV\b/)
      } else {
        expect(text).not.toContain(prohibited)
      }
    }
  })

  it('PDF does not use StandardFonts (must use embedded fontkit fonts)', async () => {
    const bytes = await generateCPPAComplaintPdf(mockFiling)
    const raw = Buffer.from(bytes).toString('latin1')
    expect(raw).not.toContain('Times-Roman')
    expect(raw).not.toContain('Helvetica')
  })
})
