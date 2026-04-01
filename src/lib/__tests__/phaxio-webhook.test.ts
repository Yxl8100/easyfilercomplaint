import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    filing: {
      updateMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/verify-phaxio-signature', () => ({
  verifyPhaxioSignature: vi.fn(),
}))

function makeFormDataRequest(
  fields: Record<string, string>,
  signature: string,
  url = 'http://localhost/api/webhooks/phaxio'
): NextRequest {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value)
  }
  const request = new NextRequest(url, {
    method: 'POST',
    body: formData,
    headers: {
      'x-phaxio-signature': signature,
    },
  })
  return request
}

describe('POST /api/webhooks/phaxio', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.resetModules()
    process.env.PHAXIO_CALLBACK_TOKEN = 'test-callback-token'
    process.env.NEXT_PUBLIC_APP_URL = 'https://www.easyfilercomplaint.com'
  })

  it('valid signature + status=success -> updateMany called with faxStatus=success and status=filed', async () => {
    const { verifyPhaxioSignature } = await import('@/lib/verify-phaxio-signature')
    const { prisma } = await import('@/lib/prisma')
    ;(verifyPhaxioSignature as ReturnType<typeof vi.fn>).mockReturnValue(true)
    ;(prisma.filing.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 })

    const { POST } = await import('@/app/api/webhooks/phaxio/route')

    const request = makeFormDataRequest(
      {
        fax_id: '12345',
        status: 'success',
        num_pages: '3',
        completed_at: '2026-04-01T12:00:00Z',
        direction: 'sent',
        success: 'true',
      },
      'valid-sig'
    )

    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.received).toBe(true)

    expect(prisma.filing.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { faxId: '12345' },
        data: expect.objectContaining({
          faxStatus: 'success',
          status: 'filed',
          faxPages: 3,
        }),
      })
    )
  })

  it('valid signature + status=failure -> updateMany called with status=failed', async () => {
    const { verifyPhaxioSignature } = await import('@/lib/verify-phaxio-signature')
    const { prisma } = await import('@/lib/prisma')
    ;(verifyPhaxioSignature as ReturnType<typeof vi.fn>).mockReturnValue(true)
    ;(prisma.filing.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 })

    const { POST } = await import('@/app/api/webhooks/phaxio/route')

    const request = makeFormDataRequest(
      {
        fax_id: '12345',
        status: 'failure',
        direction: 'sent',
        success: 'false',
      },
      'valid-sig'
    )

    const response = await POST(request)
    expect(response.status).toBe(200)

    expect(prisma.filing.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { faxId: '12345' },
        data: expect.objectContaining({
          faxStatus: 'failure',
          status: 'failed',
        }),
      })
    )
  })

  it('invalid signature -> returns 400 and updateMany NOT called', async () => {
    const { verifyPhaxioSignature } = await import('@/lib/verify-phaxio-signature')
    const { prisma } = await import('@/lib/prisma')
    ;(verifyPhaxioSignature as ReturnType<typeof vi.fn>).mockReturnValue(false)

    const { POST } = await import('@/app/api/webhooks/phaxio/route')

    const request = makeFormDataRequest(
      { fax_id: '12345', status: 'success' },
      'invalid-sig'
    )

    const response = await POST(request)
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('Invalid signature')

    expect(prisma.filing.updateMany).not.toHaveBeenCalled()
  })

  it('missing fax_id -> returns 400', async () => {
    const { verifyPhaxioSignature } = await import('@/lib/verify-phaxio-signature')
    const { prisma } = await import('@/lib/prisma')
    ;(verifyPhaxioSignature as ReturnType<typeof vi.fn>).mockReturnValue(true)

    const { POST } = await import('@/app/api/webhooks/phaxio/route')

    const request = makeFormDataRequest(
      { status: 'success' },
      'valid-sig'
    )

    const response = await POST(request)
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('Missing fax_id')

    expect(prisma.filing.updateMany).not.toHaveBeenCalled()
  })

  it('missing PHAXIO_CALLBACK_TOKEN -> returns 500', async () => {
    delete process.env.PHAXIO_CALLBACK_TOKEN

    const { POST } = await import('@/app/api/webhooks/phaxio/route')

    const request = makeFormDataRequest(
      { fax_id: '12345', status: 'success' },
      'valid-sig'
    )

    const response = await POST(request)
    expect(response.status).toBe(500)
    const json = await response.json()
    expect(json.error).toBe('Server misconfigured')
  })
})
