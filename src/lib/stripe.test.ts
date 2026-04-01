import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('stripe client', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('exports a stripe instance when STRIPE_SECRET_KEY is set', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder_for_testing'
    const { stripe } = await import('./stripe')
    expect(stripe).toBeDefined()
    expect(stripe).not.toBeNull()
    expect(typeof stripe).toBe('object')
  })

  it('exported stripe has checkout sessions API', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder_for_testing'
    const { stripe } = await import('./stripe')
    expect(stripe.checkout).toBeDefined()
    expect(stripe.checkout.sessions).toBeDefined()
    expect(typeof stripe.checkout.sessions.create).toBe('function')
  })

  it('exported stripe has webhooks API', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder_for_testing'
    const { stripe } = await import('./stripe')
    expect(stripe.webhooks).toBeDefined()
    expect(typeof stripe.webhooks.constructEvent).toBe('function')
  })
})
