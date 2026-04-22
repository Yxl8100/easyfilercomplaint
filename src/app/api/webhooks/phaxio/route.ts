import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPhaxioSignature } from '@/lib/verify-phaxio-signature'

const TERMINAL_STATUSES = ['success', 'failure', 'partialsuccess'] as const

export async function POST(request: NextRequest) {
  const callbackToken = process.env.PHAXIO_CALLBACK_TOKEN
  if (!callbackToken) {
    console.error('[phaxio-webhook] PHAXIO_CALLBACK_TOKEN not set')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // Parse multipart form data (Phaxio sends multipart/form-data, NOT JSON)
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  // Convert FormData to plain object for HMAC verification
  const postFields: Record<string, string> = {}
  for (const [key, value] of Array.from(formData.entries())) {
    if (typeof value === 'string') {
      postFields[key] = value
    }
  }

  // Verify HMAC-SHA1 signature BEFORE any database writes (FAX-09)
  const signature = request.headers.get('x-phaxio-signature') || ''
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/phaxio`

  if (!verifyPhaxioSignature(callbackUrl, postFields, callbackToken, signature)) {
    console.error('[phaxio-webhook] Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Extract fax fields
  const faxId = postFields['fax_id']
  const faxStatus = postFields['status'] || ''
  const numPages = parseInt(postFields['num_pages'] || '0', 10)
  const completedAt = postFields['completed_at']

  if (!faxId) {
    return NextResponse.json({ error: 'Missing fax_id' }, { status: 400 })
  }

  // Update Filing by faxId
  const updateData: Record<string, unknown> = {
    faxStatus,
  }

  if (numPages > 0) {
    updateData.faxPages = numPages
  }

  if (completedAt) {
    updateData.faxCompletedAt = new Date(completedAt)
  }

  // If terminal success, update Filing.status to 'filed'
  // TERMINAL_STATUSES: 'success' | 'failure' | 'partialsuccess'
  if (TERMINAL_STATUSES.includes(faxStatus as typeof TERMINAL_STATUSES[number])) {
    if (faxStatus === 'success') {
      updateData.status = 'filed'
    } else if (faxStatus === 'failure') {
      updateData.status = 'failed'
    }
  }

  await prisma.filing.updateMany({
    where: { faxId: faxId },
    data: updateData,
  })

  return NextResponse.json({ received: true })
}
