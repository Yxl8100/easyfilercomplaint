import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendFax, getFaxStatus } from '../sinch-fax'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('sinch-fax', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SINCH_ACCESS_KEY = 'test-access-key'
    process.env.SINCH_ACCESS_SECRET = 'test-access-secret'
    process.env.SINCH_PROJECT_ID = 'test-project-id'
  })

  afterEach(() => {
    delete process.env.SINCH_ACCESS_KEY
    delete process.env.SINCH_ACCESS_SECRET
    delete process.env.SINCH_PROJECT_ID
  })

  describe('sendFax', () => {
    it('calls fetch POST to Sinch v3 URL with correct projectId', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'fax-uuid-123', status: 'QUEUED' }),
      })

      const files = [{ buffer: Buffer.from('pdf-content'), filename: 'complaint.pdf', contentType: 'application/pdf' }]
      await sendFax('+19163235341', files)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://fax.api.sinch.com/v3/projects/test-project-id/faxes',
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('sends Authorization: Basic header with base64(accessKey:accessSecret)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'fax-uuid-123', status: 'QUEUED' }),
      })

      const files = [{ buffer: Buffer.from('pdf-content'), filename: 'complaint.pdf', contentType: 'application/pdf' }]
      await sendFax('+19163235341', files)

      const expectedB64 = Buffer.from('test-access-key:test-access-secret').toString('base64')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Basic ${expectedB64}`,
          }),
        })
      )
    })

    it('returns success=true with string fax id on successful response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'fax-uuid-123', status: 'QUEUED' }),
      })

      const files = [{ buffer: Buffer.from('pdf'), filename: 'complaint.pdf', contentType: 'application/pdf' }]
      const result = await sendFax('+19163235341', files)

      expect(result.success).toBe(true)
      expect(result.data?.id).toBe('fax-uuid-123')
    })

    it('returns success=false with HTTP status message on error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      })

      const files = [{ buffer: Buffer.from('pdf'), filename: 'complaint.pdf', contentType: 'application/pdf' }]
      const result = await sendFax('+19163235341', files)

      expect(result.success).toBe(false)
      expect(result.message).toContain('400')
    })

    it('throws if SINCH env vars are not set', async () => {
      delete process.env.SINCH_ACCESS_KEY

      const files = [{ buffer: Buffer.from('pdf'), filename: 'complaint.pdf', contentType: 'application/pdf' }]
      await expect(sendFax('+19163235341', files)).rejects.toThrow(
        'SINCH_ACCESS_KEY, SINCH_ACCESS_SECRET, and SINCH_PROJECT_ID must be set'
      )
    })

    it('with two files, calls fetch exactly once (both files appended to same FormData)', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'fax-uuid-123', status: 'QUEUED' }),
      })

      const files = [
        { buffer: Buffer.from('complaint-pdf'), filename: 'complaint.pdf', contentType: 'application/pdf' },
        { buffer: Buffer.from('evidence-data'), filename: 'evidence.pdf', contentType: 'application/pdf' },
      ]
      await sendFax('+19163235341', files)

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('uses native fetch (not axios)', async () => {
      const fs = await import('fs')
      const path = await import('path')
      const filePath = path.resolve(__dirname, '../sinch-fax.ts')
      const source = fs.readFileSync(filePath, 'utf-8')
      expect(source).not.toMatch(/\baxios\b/)
      expect(source).toMatch(/\bfetch\b/)
    })
  })

  describe('getFaxStatus', () => {
    it('calls fetch GET with correct URL including faxId', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'fax-uuid-123', status: 'QUEUED', pageCount: 0, completedTime: null }),
      })

      await getFaxStatus('fax-uuid-123')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://fax.api.sinch.com/v3/projects/test-project-id/faxes/fax-uuid-123',
        expect.anything()
      )
    })

    it('normalizes SUCCEEDED -> "success" and maps pageCount/completedTime', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'fax-uuid-123', status: 'SUCCEEDED', pageCount: 2, completedTime: '2026-05-03T12:00:00Z' }),
      })

      const result = await getFaxStatus('fax-uuid-123')

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('success')
      expect(result.data?.num_pages).toBe(2)
      expect(result.data?.completed_at).toBe('2026-05-03T12:00:00Z')
    })

    it('normalizes FAILED -> "failure"', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'fax-uuid-123', status: 'FAILED' }),
      })

      const result = await getFaxStatus('fax-uuid-123')
      expect(result.data?.status).toBe('failure')
    })

    it('normalizes IN_PROGRESS -> "inprogress"', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'fax-uuid-123', status: 'IN_PROGRESS' }),
      })

      const result = await getFaxStatus('fax-uuid-123')
      expect(result.data?.status).toBe('inprogress')
    })

    it('returns success=false on HTTP error without throwing', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 })

      const result = await getFaxStatus('nonexistent-id')
      expect(result.success).toBe(false)
      expect(result.data).toBeUndefined()
    })
  })
})
