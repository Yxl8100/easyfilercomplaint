import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    filing: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

// Mock stripe
vi.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
  },
}))

const validBody = {
  category: 'data-privacy',
  selectedAgencies: ['ca_ag'],
  targetName: 'Acme Corp',
  description: 'They tracked me without consent',
  priorContact: false,
  categoryFields: {},
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  address: '123 Main St',
  city: 'Los Angeles',
  state: 'CA',
  zip: '90001',
  phone: '5551234567',
}

describe('POST /api/checkout', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'https://www.easyfilercomplaint.com'
  })

  it('creates a Filing and returns { url } on valid input', async () => {
    const { prisma } = await import('@/lib/prisma')
    const { stripe } = await import('@/lib/stripe')
    const mockFiling = { id: 'filing-uuid-123', ...validBody }
    ;(prisma.filing.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockFiling)
    ;(stripe.checkout.sessions.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'cs_test_abc',
      url: 'https://checkout.stripe.com/pay/cs_test_abc',
    })

    const { POST } = await import('./route')
    const request = new NextRequest('http://localhost/api/checkout', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'Content-Type': 'application/json' },
    })
    const response = await POST(request)
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.url).toBe('https://checkout.stripe.com/pay/cs_test_abc')
  })

  it('returns 400 when targetName is missing', async () => {
    const { POST } = await import('./route')
    const body = { ...validBody, targetName: '' }
    const request = new NextRequest('http://localhost/api/checkout', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('returns 400 when email is missing', async () => {
    const { POST } = await import('./route')
    const body = { ...validBody, email: '' }
    const request = new NextRequest('http://localhost/api/checkout', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('returns 400 when description is missing', async () => {
    const { POST } = await import('./route')
    const body = { ...validBody, description: '' }
    const request = new NextRequest('http://localhost/api/checkout', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
