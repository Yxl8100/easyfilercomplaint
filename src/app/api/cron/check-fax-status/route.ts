import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getFaxStatus } from '@/lib/phaxio'

// Cron schedule: "0 0 * * *" (once daily) — safe for Vercel Hobby plan
// For 15-minute polling, upgrade to Vercel Pro and change vercel.json schedule to "*/15 * * * *"
// See: .planning/phases/04-phaxio-fax-integration-filing-pipeline/04-RESEARCH.md Pitfall 2

const IN_PROGRESS_STATUSES = ['queued', 'pendingbatch', 'inprogress']

export async function GET(request: NextRequest) {
  // Verify CRON_SECRET Bearer token
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find all filings with in-progress fax statuses
  const filings = await prisma.filing.findMany({
    where: {
      faxId: { not: null },
      faxStatus: { in: IN_PROGRESS_STATUSES },
    },
    select: {
      id: true,
      faxId: true,
      faxStatus: true,
    },
  })

  if (filings.length === 0) {
    return NextResponse.json({ checked: 0, updated: 0 })
  }

  let updated = 0

  for (const filing of filings) {
    try {
      const result = await getFaxStatus(parseInt(filing.faxId!, 10))

      if (!result.success || !result.data) {
        console.error(`[cron] Failed to get status for fax ${filing.faxId}`)
        continue
      }

      const newStatus = result.data.status

      // Only update if status has changed
      if (newStatus === filing.faxStatus) continue

      const updateData: Record<string, unknown> = {
        faxStatus: newStatus,
      }

      if (result.data.num_pages > 0) {
        updateData.faxPages = result.data.num_pages
      }

      if (result.data.completed_at) {
        updateData.faxCompletedAt = new Date(result.data.completed_at)
      }

      // Update Filing.status on terminal fax status
      if (newStatus === 'success') {
        updateData.status = 'filed'
      } else if (newStatus === 'failure') {
        updateData.status = 'failed'
      }

      await prisma.filing.update({
        where: { id: filing.id },
        data: updateData,
      })

      updated++
      console.log(`[cron] Updated filing ${filing.id}: fax ${filing.faxId} -> ${newStatus}`)
    } catch (err) {
      console.error(`[cron] Error polling fax ${filing.faxId}:`, err)
    }
  }

  return NextResponse.json({ checked: filings.length, updated })
}
