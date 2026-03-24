import { NextRequest, NextResponse } from 'next/server'
import { checkFaxStatus } from '@/lib/submit-fax'

export async function GET(
  req: NextRequest,
  { params }: { params: { faxId: string } }
) {
  const faxId = parseInt(params.faxId)

  if (isNaN(faxId)) {
    return NextResponse.json({ error: 'Invalid fax ID' }, { status: 400 })
  }

  const status = await checkFaxStatus(faxId)
  return NextResponse.json(status)
}
