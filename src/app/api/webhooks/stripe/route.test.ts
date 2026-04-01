import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    filing: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
}))

vi.mock('@/lib/filing-receipt-id', () => ({
  generateFilingReceiptId: vi.fn(() => 'EFC-20260401-ABCDE'),
}))

const makeRequest = (body: string, signature: string | null) =>
  new NextRequest('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/json',
      ...(signature ? { 'stripe-signature': signature } : {}),
    },
  })

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
  })

  it('returns 400 when stripe-signature header is missing', async () => {
    const { POST } = await import('./route')
    const response = await POST(makeRequest('{}', null))
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('No signature')
  })

  it('returns 400 when stripe signature is invalid', async () => {
    const { stripe } = await import('@/lib/stripe')
    ;(stripe.webhooks.constructEvent as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('Invalid signature')
    })
    const { POST } = await import('./route')
    const response = await POST(makeRequest('{}', 'bad_sig'))
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('Invalid signature')
  })

  it('updates Filing to paid on checkout.session.completed', async () => {
    const { stripe } = await import('@/lib/stripe')
    const { prisma } = await import('@/lib/prisma')
    const mockEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          payment_intent: 'pi_test_456',
          metadata: { filingId: 'filing-uuid-001' },
        },
      },
    }
    ;(stripe.webhooks.constructEvent as ReturnType<typeof vi.fn>).mockReturnValue(mockEvent)
    ;(prisma.filing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'pending_payment' })
    ;(prisma.filing.update as ReturnType<typeof vi.fn>).mockResolvedValue({})

    const { POST } = await import('./route')
    const response = await POST(makeRequest('{}', 'valid_sig'))
    expect(response.status).toBe(200)
    expect(prisma.filing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'filing-uuid-001' },
        data: expect.objectContaining({ status: 'paid' }),
      })
    )
  })

  it('skips update if Filing already has status=paid (idempotency)', async () => {
    const { stripe } = await import('@/lib/stripe')
    const { prisma } = await import('@/lib/prisma')
    const mockEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          payment_intent: 'pi_test_456',
          metadata: { filingId: 'filing-uuid-001' },
        },
      },
    }
    ;(stripe.webhooks.constructEvent as ReturnType<typeof vi.fn>).mockReturnValue(mockEvent)
    ;(prisma.filing.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'paid' })

    const { POST } = await import('./route')
    const response = await POST(makeRequest('{}', 'valid_sig'))
    expect(response.status).toBe(200)
    expect(prisma.filing.update).not.toHaveBeenCalled()
  })

  it('resets Filing to draft on checkout.session.expired', async () => {
    const { stripe } = await import('@/lib/stripe')
    const { prisma } = await import('@/lib/prisma')
    const mockEvent = {
      type: 'checkout.session.expired',
      data: {
        object: {
          metadata: { filingId: 'filing-uuid-001' },
        },
      },
    }
    ;(stripe.webhooks.constructEvent as ReturnType<typeof vi.fn>).mockReturnValue(mockEvent)
    ;(prisma.filing.update as ReturnType<typeof vi.fn>).mockResolvedValue({})

    const { POST } = await import('./route')
    const response = await POST(makeRequest('{}', 'valid_sig'))
    expect(response.status).toBe(200)
    expect(prisma.filing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'filing-uuid-001' },
        data: expect.objectContaining({ status: 'draft' }),
      })
    )
  })

  it('returns 200 for unhandled event types', async () => {
    const { stripe } = await import('@/lib/stripe')
    ;(stripe.webhooks.constructEvent as ReturnType<typeof vi.fn>).mockReturnValue({
      type: 'payment_intent.created',
      data: { object: {} },
    })
    const { POST } = await import('./route')
    const response = await POST(makeRequest('{}', 'valid_sig'))
    expect(response.status).toBe(200)
  })
})
