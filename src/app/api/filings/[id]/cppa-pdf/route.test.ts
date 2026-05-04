import { fileURLToPath } from "url"
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: { filing: { findUnique: vi.fn() } },
}))

vi.mock('@vercel/blob', () => ({
  put: vi.fn().mockResolvedValue({
    url: 'https://blob.vercel-storage.com/complaints/cppa/test-id/CPPA_EFC-TEST.pdf',
  }),
}))

vi.mock('@/lib/cppa-pdf-generator', () => ({
  generateCPPAComplaintPdf: vi.fn().mockResolvedValue(new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55])),
}))

const mockFiling = {
  id: 'test-uuid-1234',
  userId: null,
  category: 'privacy_tracking',
  targetName: 'Test Corp',
  filingReceiptId: 'EFC-20260315-CPPDF',
  filerInfo: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
  categoryFields: { visitMonth: '3', visitYear: '2026' },
}

const ORIGINAL_TOKEN = process.env.BLOB_READ_WRITE_TOKEN

beforeEach(async () => {
  vi.resetAllMocks()
  process.env.BLOB_READ_WRITE_TOKEN = 'test-token'
  // Re-seed after resetAllMocks clears mockResolvedValue from the vi.mock factory
  const { generateCPPAComplaintPdf } = await import('@/lib/cppa-pdf-generator')
  vi.mocked(generateCPPAComplaintPdf).mockResolvedValue(new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]))
})

afterEach(() => {
  if (ORIGINAL_TOKEN === undefined) delete process.env.BLOB_READ_WRITE_TOKEN
  else process.env.BLOB_READ_WRITE_TOKEN = ORIGINAL_TOKEN
})

describe('GET /api/filings/[id]/cppa-pdf', () => {
  it('CPPDF-03: returns 404 when filing does not exist', async () => {
    const { prisma } = await import('@/lib/prisma')
    ;vi.mocked(prisma.filing.findUnique).mockResolvedValue(null)

    const { GET } = await import('./route')
    const response = await GET(
      new Request('http://localhost/api/filings/missing-id/cppa-pdf'),
      { params: { id: 'missing-id' } }
    )
    expect(response.status).toBe(404)
  })

  it('CPPDF-03: returns 200 application/pdf for valid filing', async () => {
    const { prisma } = await import('@/lib/prisma')
    ;vi.mocked(prisma.filing.findUnique).mockResolvedValue(mockFiling)

    const { GET } = await import('./route')
    const response = await GET(
      new Request('http://localhost/api/filings/test-uuid-1234/cppa-pdf'),
      { params: { id: 'test-uuid-1234' } }
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/pdf')
  })

  it('CPPDF-03: returns Content-Disposition attachment with CPPA_Complaint filename', async () => {
    const { prisma } = await import('@/lib/prisma')
    ;vi.mocked(prisma.filing.findUnique).mockResolvedValue(mockFiling)

    const { GET } = await import('./route')
    const response = await GET(
      new Request('http://localhost/api/filings/test-uuid-1234/cppa-pdf'),
      { params: { id: 'test-uuid-1234' } }
    )
    const cd = response.headers.get('content-disposition') ?? ''
    expect(cd).toContain('attachment')
    expect(cd).toContain('CPPA_Complaint_')
    expect(cd).toContain('EFC-20260315-CPPDF')
  })

  it('CPPDF-03: calls generateCPPAComplaintPdf with the filing', async () => {
    const { prisma } = await import('@/lib/prisma')
    ;vi.mocked(prisma.filing.findUnique).mockResolvedValue(mockFiling)
    const { generateCPPAComplaintPdf } = await import('@/lib/cppa-pdf-generator')

    const { GET } = await import('./route')
    await GET(
      new Request('http://localhost/api/filings/test-uuid-1234/cppa-pdf'),
      { params: { id: 'test-uuid-1234' } }
    )
    expect(generateCPPAComplaintPdf).toHaveBeenCalledWith(mockFiling)
  })

  it('CPPDF-03: stores PDF in Vercel Blob at complaints/cppa/ path when token set', async () => {
    const { prisma } = await import('@/lib/prisma')
    ;vi.mocked(prisma.filing.findUnique).mockResolvedValue(mockFiling)
    const { put } = await import('@vercel/blob')

    const { GET } = await import('./route')
    await GET(
      new Request('http://localhost/api/filings/test-uuid-1234/cppa-pdf'),
      { params: { id: 'test-uuid-1234' } }
    )
    expect(put).toHaveBeenCalled()
    const callArgs = vi.mocked(put).mock.calls[0]
    expect(callArgs[0]).toContain('complaints/cppa/test-uuid-1234/')
    expect(callArgs[0]).toContain('CPPA_EFC-20260315-CPPDF.pdf')
    expect(callArgs[2]).toMatchObject({ access: 'private', contentType: 'application/pdf' })
  })

  it('CPPDF-03: returns PDF bytes even when BLOB_READ_WRITE_TOKEN absent', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN
    const { prisma } = await import('@/lib/prisma')
    ;vi.mocked(prisma.filing.findUnique).mockResolvedValue(mockFiling)
    const { put } = await import('@vercel/blob')

    const { GET } = await import('./route')
    const response = await GET(
      new Request('http://localhost/api/filings/test-uuid-1234/cppa-pdf'),
      { params: { id: 'test-uuid-1234' } }
    )
    expect(response.status).toBe(200)
    expect(put).not.toHaveBeenCalled()
  })

  it('CPPDF-03: UUID-only access — route source contains no auth() call', async () => {
    // Static check: UUID is the access token (D-04/D-05 from Phase 10).
    // Verify the route file does not import or invoke `auth` from '@/lib/auth'.
    const fs = await import('fs')
    const src = fs.readFileSync(
      fileURLToPath(new URL("./route.ts", import.meta.url)),
      "utf8"
    )
    expect(src).not.toMatch(/from\s+['"]@\/lib\/auth['"]/)
    expect(src).not.toMatch(/await\s+auth\s*\(/)
  })
})
