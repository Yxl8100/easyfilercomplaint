import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    filing: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}))

// Mock phaxio
vi.mock('@/lib/phaxio', () => ({
  getFaxStatus: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { getFaxStatus } from '@/lib/phaxio'
import { GET } from '@/app/api/cron/check-fax-status/route'

const mockPrismaFindMany = prisma.filing.findMany as ReturnType<typeof vi.fn>
const mockPrismaUpdate = prisma.filing.update as ReturnType<typeof vi.fn>
const mockGetFaxStatus = getFaxStatus as ReturnType<typeof vi.fn>

function makeRequest(authHeader?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (authHeader !== undefined) {
    headers['authorization'] = authHeader
  }
  return new NextRequest('http://localhost/api/cron/check-fax-status', { headers })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRON_SECRET = 'test-cron-secret'
})

describe('GET /api/cron/check-fax-status', () => {
  it('returns 401 when CRON_SECRET is missing', async () => {
    const req = makeRequest()
    const res = await GET(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 401 when wrong CRON_SECRET is provided', async () => {
    const req = makeRequest('Bearer wrong-secret')
    const res = await GET(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns { checked: 0, updated: 0 } when no in-progress filings exist', async () => {
    mockPrismaFindMany.mockResolvedValue([])
    const req = makeRequest('Bearer test-cron-secret')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ checked: 0, updated: 0 })
    expect(mockGetFaxStatus).not.toHaveBeenCalled()
  })

  it('updates Filing.faxStatus and Filing.status to filed when fax status becomes success', async () => {
    mockPrismaFindMany.mockResolvedValue([
      { id: 'filing-1', faxId: '123', faxStatus: 'queued' },
      { id: 'filing-2', faxId: '456', faxStatus: 'inprogress' },
    ])

    // First filing: queued -> success (terminal)
    mockGetFaxStatus.mockResolvedValueOnce({
      success: true,
      data: {
        id: 123,
        status: 'success',
        num_pages: 2,
        completed_at: '2026-04-01T12:00:00Z',
        recipients: [],
      },
    })
    // Second filing: inprogress (same status, no change)
    mockGetFaxStatus.mockResolvedValueOnce({
      success: true,
      data: {
        id: 456,
        status: 'inprogress',
        num_pages: 0,
        completed_at: null,
        recipients: [],
      },
    })

    mockPrismaUpdate.mockResolvedValue({})

    const req = makeRequest('Bearer test-cron-secret')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ checked: 2, updated: 1 })

    // Should have updated the first filing with terminal success status
    expect(mockPrismaUpdate).toHaveBeenCalledOnce()
    expect(mockPrismaUpdate).toHaveBeenCalledWith({
      where: { id: 'filing-1' },
      data: expect.objectContaining({
        faxStatus: 'success',
        status: 'filed',
        faxPages: 2,
        faxCompletedAt: new Date('2026-04-01T12:00:00Z'),
      }),
    })
  })

  it('does not call prisma.filing.update when fax status has not changed', async () => {
    mockPrismaFindMany.mockResolvedValue([
      { id: 'filing-1', faxId: '123', faxStatus: 'queued' },
    ])

    // Status unchanged (still queued)
    mockGetFaxStatus.mockResolvedValueOnce({
      success: true,
      data: {
        id: 123,
        status: 'queued',
        num_pages: 0,
        completed_at: null,
        recipients: [],
      },
    })

    const req = makeRequest('Bearer test-cron-secret')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ checked: 1, updated: 0 })
    expect(mockPrismaUpdate).not.toHaveBeenCalled()
  })

  it('sets Filing.status to failed when fax status becomes failure', async () => {
    mockPrismaFindMany.mockResolvedValue([
      { id: 'filing-1', faxId: '789', faxStatus: 'inprogress' },
    ])

    mockGetFaxStatus.mockResolvedValueOnce({
      success: true,
      data: {
        id: 789,
        status: 'failure',
        num_pages: 0,
        completed_at: '2026-04-01T13:00:00Z',
        recipients: [],
      },
    })

    mockPrismaUpdate.mockResolvedValue({})

    const req = makeRequest('Bearer test-cron-secret')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ checked: 1, updated: 1 })

    expect(mockPrismaUpdate).toHaveBeenCalledWith({
      where: { id: 'filing-1' },
      data: expect.objectContaining({
        faxStatus: 'failure',
        status: 'failed',
      }),
    })
  })

  it('continues processing other filings when getFaxStatus fails for one', async () => {
    mockPrismaFindMany.mockResolvedValue([
      { id: 'filing-1', faxId: '111', faxStatus: 'queued' },
      { id: 'filing-2', faxId: '222', faxStatus: 'queued' },
    ])

    // First filing: getFaxStatus throws
    mockGetFaxStatus.mockRejectedValueOnce(new Error('Phaxio API error'))
    // Second filing: success
    mockGetFaxStatus.mockResolvedValueOnce({
      success: true,
      data: {
        id: 222,
        status: 'success',
        num_pages: 1,
        completed_at: '2026-04-01T14:00:00Z',
        recipients: [],
      },
    })

    mockPrismaUpdate.mockResolvedValue({})

    const req = makeRequest('Bearer test-cron-secret')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()

    // Only filing-2 was updated (filing-1 errored)
    expect(body).toEqual({ checked: 2, updated: 1 })
    expect(mockPrismaUpdate).toHaveBeenCalledOnce()
    expect(mockPrismaUpdate).toHaveBeenCalledWith({
      where: { id: 'filing-2' },
      data: expect.objectContaining({ faxStatus: 'success', status: 'filed' }),
    })
  })

  it('handles getFaxStatus returning success: false gracefully', async () => {
    mockPrismaFindMany.mockResolvedValue([
      { id: 'filing-1', faxId: '999', faxStatus: 'queued' },
    ])

    mockGetFaxStatus.mockResolvedValueOnce({
      success: false,
      data: undefined,
    })

    const req = makeRequest('Bearer test-cron-secret')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ checked: 1, updated: 0 })
    expect(mockPrismaUpdate).not.toHaveBeenCalled()
  })
})
