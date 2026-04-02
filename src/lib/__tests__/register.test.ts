import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'

// Mock Prisma before importing the route
const mockFindUnique = vi.hoisted(() => vi.fn())
const mockCreate = vi.hoisted(() => vi.fn())
const mockUpdateMany = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
      create: mockCreate,
    },
    filing: {
      updateMany: mockUpdateMany,
    },
  },
}))

// Import the POST handler (will fail until route exists)
import { POST } from '@/app/api/auth/register/route'

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindUnique.mockResolvedValue(null) // no existing user by default
    mockCreate.mockResolvedValue({ id: 'user-123', email: 'jane@example.com', name: 'Jane' })
    mockUpdateMany.mockResolvedValue({ count: 2 })
  })

  // Test 1: valid input returns 201 + {userId}
  it('Test 1: valid {name, email, password} returns 201 + {userId}', async () => {
    const req = makeRequest({ name: 'Jane Doe', email: 'jane@example.com', password: 'password123' })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toHaveProperty('userId')
    expect(body.userId).toBe('user-123')
  })

  // Test 2: existing email returns 409
  it('Test 2: existing email returns 409 + {error: email_taken}', async () => {
    mockFindUnique.mockResolvedValue({ id: 'existing-user', email: 'jane@example.com' })
    const req = makeRequest({ name: 'Jane', email: 'jane@example.com', password: 'password123' })
    const res = await POST(req)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('email_taken')
  })

  // Test 3: password < 8 chars returns 400
  it('Test 3: password < 8 chars returns 400 + {error: invalid_input}', async () => {
    const req = makeRequest({ email: 'jane@example.com', password: 'short' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_input')
  })

  // Test 4: missing email returns 400
  it('Test 4: missing email returns 400', async () => {
    const req = makeRequest({ password: 'password123' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  // Test 5: links all same-email filings with userId=null to new user
  it('Test 5: links all same-email Filing records to new user (AUTH-03)', async () => {
    const req = makeRequest({ name: 'Jane', email: 'jane@example.com', password: 'password123' })
    await POST(req)
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { filerEmail: 'jane@example.com', userId: null },
      data: { userId: 'user-123' },
    })
  })

  // Test 6: bcrypt hash roundtrip
  it('Test 6: bcrypt hash then compare returns true for correct password, false for wrong', async () => {
    const password = 'correctPassword123'
    const hash = await bcrypt.hash(password, 12)
    expect(await bcrypt.compare(password, hash)).toBe(true)
    expect(await bcrypt.compare('wrongPassword', hash)).toBe(false)
  })
})
