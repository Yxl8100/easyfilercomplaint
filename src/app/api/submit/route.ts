import { NextRequest, NextResponse } from 'next/server'
import { submitAllComplaints, SubmissionResult } from '@/lib/submit-complaint'
import { sendFilingReceipt } from '@/lib/send-receipt'
import { FilingData } from '@/lib/filing-state'

export async function POST(req: NextRequest) {
  try {
    const data: FilingData = await req.json()

    if (!data.firstName || !data.lastName || !data.email || !data.targetName || !data.description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!data.selectedAgencies || data.selectedAgencies.length === 0) {
      return NextResponse.json({ error: 'No agencies selected' }, { status: 400 })
    }

    const results: SubmissionResult[] = await submitAllComplaints(data)

    // Send receipt email (non-blocking — don't fail the response if this errors)
    sendFilingReceipt(
      data.email,
      `${data.firstName} ${data.lastName}`,
      data.targetName,
      results
    ).catch((err) => console.error('[Receipt Email] Failed to send:', err))

    const autoSubmitted = results.filter((r) => r.method !== 'guided')
    const guided = results.filter((r) => r.method === 'guided')

    return NextResponse.json({
      success: true,
      summary: {
        totalAgencies: results.length,
        autoSubmitted: autoSubmitted.length,
        guided: guided.length,
        autoSucceeded: autoSubmitted.filter((r) => r.success).length,
        autoFailed: autoSubmitted.filter((r) => !r.success).length,
      },
      results,
    })

  } catch (err: unknown) {
    console.error('[Submit API] Error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Submission failed', details: message },
      { status: 500 }
    )
  }
}
