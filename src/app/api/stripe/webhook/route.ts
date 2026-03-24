import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
})

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.customer && session.subscription) {
        await prisma.user.update({
          where: { stripeCustomerId: session.customer as string },
          data: {
            subscriptionId: session.subscription as string,
            subscriptionStatus: 'active',
          },
        })
      }
      break
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const periodEnd = (sub as any).current_period_end as number | undefined
      await prisma.user.update({
        where: { stripeCustomerId: sub.customer as string },
        data: {
          subscriptionStatus: sub.status,
          subscriptionExpiresAt: periodEnd ? new Date(periodEnd * 1000) : null,
        },
      })
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await prisma.user.update({
        where: { stripeCustomerId: sub.customer as string },
        data: {
          subscriptionStatus: 'canceled',
        },
      })
      break
    }
  }

  return NextResponse.json({ received: true })
}
