import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import type { FilingData } from '@/lib/filing-state'

export async function POST(request: NextRequest) {
  let data: FilingData
  try {
    data = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Validate required fields
  if (!data.targetName?.trim()) {
    return NextResponse.json({ error: 'targetName is required' }, { status: 400 })
  }
  if (!data.email?.trim()) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 })
  }
  if (!data.description?.trim()) {
    return NextResponse.json({ error: 'description is required' }, { status: 400 })
  }
  if (!data.category?.trim()) {
    return NextResponse.json({ error: 'category is required' }, { status: 400 })
  }

  try {
    // Create Filing record with pending_payment status before redirecting to Stripe
    const filing = await prisma.filing.create({
      data: {
        category: data.category,
        targetName: data.targetName,
        targetUrl: data.targetUrl,
        targetAddress: data.targetAddress,
        targetCity: data.targetCity,
        targetState: data.targetState,
        targetZip: data.targetZip,
        targetPhone: data.targetPhone,
        targetEmail: data.targetEmail,
        incidentDate: data.incidentDate ? new Date(data.incidentDate) : undefined,
        description: data.description,
        amountPaid: data.amountPaid ?? undefined,
        paymentMethod: data.paymentMethod,
        priorContact: data.priorContact,
        priorContactDetails: data.priorContactDetails,
        categoryFields: data.categoryFields as object,
        filerInfo: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          address: data.address,
          city: data.city,
          state: data.state,
          zip: data.zip,
          phone: data.phone,
          county: data.county || undefined,
        },
        filerEmail: data.email,
        status: 'pending_payment',
      },
    })

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: 199,
            product_data: {
              name: 'Privacy Complaint Filing',
              description: 'File a formal privacy complaint with a government agency',
            },
          },
          quantity: 1,
        },
      ],
      metadata: { filingId: filing.id },
      customer_email: data.email,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/filing/${filing.id}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/file/${data.category}`,
    })

    // Store the session ID on the Filing record
    await prisma.filing.update({
      where: { id: filing.id },
      data: { stripeSessionId: session.id },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[/api/checkout] Error:', err)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
