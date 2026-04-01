import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock all external dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    filing: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/generate-complaint-pdf', () => ({
  generateComplaintPdf: vi.fn(),
}))

vi.mock('@/lib/store-complaint-pdf', () => ({
  storeComplaintPdf: vi.fn(),
}))

vi.mock('@/lib/phaxio', () => ({
  sendFax: vi.fn(),
}))

vi.mock('@/lib/agency-directory', () => ({
  getAgencyFaxNumber: vi.fn(),
}))

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}))

import { prisma } from '@/lib/prisma'
import { generateComplaintPdf } from '@/lib/generate-complaint-pdf'
import { storeComplaintPdf } from '@/lib/store-complaint-pdf'
import { sendFax } from '@/lib/phaxio'
import { getAgencyFaxNumber } from '@/lib/agency-directory'
import axios from 'axios'
import { executeFilingPipeline } from '@/lib/filing-pipeline'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrismaFiling = prisma.filing as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGenerateComplaintPdf = generateComplaintPdf as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockStoreComplaintPdf = storeComplaintPdf as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSendFax = sendFax as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetAgencyFaxNumber = getAgencyFaxNumber as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAxios = axios as any

const mockFiling = {
  id: 'filing-123',
  status: 'paid',
  filerInfo: {
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    address: '123 Main St',
    city: 'Sacramento',
    state: 'CA',
    zip: '94203',
    phone: '555-123-4567',
    county: 'Sacramento',
  },
  filingReceiptId: 'EFC-20260401-ABC12',
  evidenceFileUrl: null,
  evidenceFileName: null,
  category: 'data-privacy',
  targetName: 'Acme Corp',
  description: 'Privacy violation',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockPrismaFiling.findUnique.mockResolvedValue(mockFiling)
  mockPrismaFiling.update.mockResolvedValue({ ...mockFiling })
  mockGenerateComplaintPdf.mockResolvedValue(new Uint8Array([1, 2, 3]))
  mockStoreComplaintPdf.mockResolvedValue('https://blob.example.com/complaint.pdf')
  mockSendFax.mockResolvedValue({ success: true, message: 'Success', data: { id: 99999 } })
  mockGetAgencyFaxNumber.mockReturnValue('+19163235341')
  mockAxios.get.mockResolvedValue({ data: Buffer.from([4, 5, 6]) })
})

describe('executeFilingPipeline', () => {
  it('Test 1 (pipeline order): calls generateComplaintPdf -> storeComplaintPdf -> sendFax in order', async () => {
    const callOrder: string[] = []
    mockGenerateComplaintPdf.mockImplementation(async () => {
      callOrder.push('generateComplaintPdf')
      return new Uint8Array([1, 2, 3])
    })
    mockStoreComplaintPdf.mockImplementation(async () => {
      callOrder.push('storeComplaintPdf')
      return 'https://blob.example.com/complaint.pdf'
    })
    mockSendFax.mockImplementation(async () => {
      callOrder.push('sendFax')
      return { success: true, message: 'Success', data: { id: 99999 } }
    })

    await executeFilingPipeline('filing-123')

    expect(callOrder).toEqual(['generateComplaintPdf', 'storeComplaintPdf', 'sendFax'])
  })

  it('Test 2 (status transitions): Filing.status transitions paid -> generating -> filing -> filed on success', async () => {
    await executeFilingPipeline('filing-123')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateCalls = mockPrismaFiling.update.mock.calls.map((call: any[]) => call[0].data.status)
    expect(updateCalls).toContain('generating')
    expect(updateCalls).toContain('filing')
    expect(updateCalls).toContain('filed')

    // Verify order: generating before filing before filed
    const generatingIndex = updateCalls.indexOf('generating')
    const filingIndex = updateCalls.indexOf('filing')
    const filedIndex = updateCalls.indexOf('filed')
    expect(generatingIndex).toBeLessThan(filingIndex)
    expect(filingIndex).toBeLessThan(filedIndex)
  })

  it('Test 3 (idempotency): Filing with status != paid causes immediate return without any calls', async () => {
    mockPrismaFiling.findUnique.mockResolvedValue({ ...mockFiling, status: 'filed' })

    await executeFilingPipeline('filing-123')

    expect(mockGenerateComplaintPdf).not.toHaveBeenCalled()
    expect(mockStoreComplaintPdf).not.toHaveBeenCalled()
    expect(mockSendFax).not.toHaveBeenCalled()
    expect(mockPrismaFiling.update).not.toHaveBeenCalled()
  })

  it('Test 3b (idempotency null): Filing not found causes immediate return', async () => {
    mockPrismaFiling.findUnique.mockResolvedValue(null)

    await executeFilingPipeline('filing-nonexistent')

    expect(mockGenerateComplaintPdf).not.toHaveBeenCalled()
    expect(mockSendFax).not.toHaveBeenCalled()
  })

  it('Test 4 (PDF failure): generateComplaintPdf throws -> Filing.status set to failed, sendFax NOT called', async () => {
    mockGenerateComplaintPdf.mockRejectedValue(new Error('PDF generation failed'))

    await executeFilingPipeline('filing-123')

    expect(mockSendFax).not.toHaveBeenCalled()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateCalls = mockPrismaFiling.update.mock.calls.map((call: any[]) => call[0].data.status)
    expect(updateCalls).toContain('failed')
  })

  it('Test 5 (fax failure): sendFax throws -> Filing.status set to failed, email stub still runs', async () => {
    mockSendFax.mockRejectedValue(new Error('Fax delivery failed'))
    const consoleSpy = vi.spyOn(console, 'log')

    await executeFilingPipeline('filing-123')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateCalls = mockPrismaFiling.update.mock.calls.map((call: any[]) => call[0].data.status)
    expect(updateCalls).toContain('failed')

    // Email stub log should appear regardless of fax failure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logCalls = consoleSpy.mock.calls.map((call: any[]) => String(call[0]))
    expect(logCalls.some((log: string) => log.includes('Receipt email stub'))).toBe(true)

    consoleSpy.mockRestore()
  })

  it('Test 6 (evidence): When evidenceFileUrl is set, sendFax receives 2 files (complaint + evidence)', async () => {
    const filingWithEvidence = {
      ...mockFiling,
      evidenceFileUrl: 'https://blob.example.com/evidence.pdf',
      evidenceFileName: 'evidence.pdf',
    }
    mockPrismaFiling.findUnique.mockResolvedValue(filingWithEvidence)
    mockAxios.get.mockResolvedValue({ data: Buffer.from([4, 5, 6]) })

    await executeFilingPipeline('filing-123')

    expect(mockAxios.get).toHaveBeenCalledWith(
      'https://blob.example.com/evidence.pdf',
      { responseType: 'arraybuffer' }
    )

    const sendFaxCall = mockSendFax.mock.calls[0]
    const files = sendFaxCall[1]
    expect(files).toHaveLength(2)
    expect(files[0].filename).toBe('complaint.pdf')
    expect(files[1].filename).toBe('evidence.pdf')
  })

  it('Test 7 (filerInfo extraction): Pipeline extracts FilerInfo from filing.filerInfo JSON field', async () => {
    await executeFilingPipeline('filing-123')

    expect(mockGenerateComplaintPdf).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'filing-123' }),
      expect.objectContaining({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        address: '123 Main St',
        city: 'Sacramento',
        state: 'CA',
        zip: '94203',
        phone: '555-123-4567',
        county: 'Sacramento',
      })
    )
  })

  it('Test 8 (FAX-03 faxId write): On successful fax send, Filing.faxId is set to "99999" and faxStatus="queued"', async () => {
    await executeFilingPipeline('filing-123')

    const updateCalls = mockPrismaFiling.update.mock.calls
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filedUpdate = updateCalls.find((call: any[]) => call[0].data.faxId !== undefined)
    expect(filedUpdate).toBeDefined()
    expect(filedUpdate[0].data.faxId).toBe('99999')
    expect(filedUpdate[0].data.faxStatus).toBe('queued')
  })

  it('Test 9 (FAX-08 no native fetch): Evidence download uses axios.get, NOT native fetch', async () => {
    const filingWithEvidence = {
      ...mockFiling,
      evidenceFileUrl: 'https://blob.example.com/evidence.pdf',
      evidenceFileName: 'evidence.pdf',
    }
    mockPrismaFiling.findUnique.mockResolvedValue(filingWithEvidence)

    await executeFilingPipeline('filing-123')

    expect(mockAxios.get).toHaveBeenCalledWith(
      filingWithEvidence.evidenceFileUrl,
      { responseType: 'arraybuffer' }
    )
  })
})
