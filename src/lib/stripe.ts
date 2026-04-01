import Stripe from 'stripe'

function getStripeInstance() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover' as Parameters<typeof Stripe>[1]['apiVersion'],
  })
}

const globalForStripe = globalThis as unknown as { stripe: Stripe }

export const stripe: Stripe = globalForStripe.stripe || getStripeInstance()

if (process.env.NODE_ENV !== 'production') globalForStripe.stripe = stripe
