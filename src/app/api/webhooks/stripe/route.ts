import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { generateFilingReceiptId } from '@/lib/filing-receipt-id'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const filingId = session.metadata?.filingId

      if (!filingId) {
        console.error('[webhook] checkout.session.completed missing filingId in metadata', session.id)
        break
      }

      // Idempotency: skip if already paid
      const existing = await prisma.filing.findUnique({
        where: { id: filingId },
        select: { status: true },
      })
      if (existing?.status === 'paid') {
        break
      }

      await prisma.filing.update({
        where: { id: filingId },
        data: {
          status: 'paid',
          stripeSessionId: session.id,
          stripePaymentId: session.payment_intent as string,
          paymentStatus: 'paid',
          paymentAmount: '1.99',
          paidAt: new Date(),
          filingReceiptId: generateFilingReceiptId(),
        },
      })
      break
    }

    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session
      const filingId = session.metadata?.filingId

      if (!filingId) {
        console.error('[webhook] checkout.session.expired missing filingId in metadata', session.id)
        break
      }

      await prisma.filing.update({
        where: { id: filingId },
        data: {
          status: 'draft',
          stripeSessionId: null,
          paymentStatus: null,
        },
      })
      break
    }

    default:
      // Unhandled event types — acknowledged with 200
      break
  }

  return NextResponse.json({ received: true })
}
