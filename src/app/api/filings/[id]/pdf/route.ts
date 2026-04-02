import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const filing = await prisma.filing.findUnique({
    where: { id: params.id },
    select: { userId: true, complaintPdfUrl: true, filingReceiptId: true },
  })

  if (!filing || filing.userId !== session.user.id) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (!filing.complaintPdfUrl) {
    return NextResponse.json({ error: 'pdf_not_available' }, { status: 404 })
  }

  // Fetch the private Blob URL server-side and stream to client
  const blobResponse = await fetch(filing.complaintPdfUrl)
  if (!blobResponse.ok) {
    return NextResponse.json({ error: 'pdf_fetch_failed' }, { status: 502 })
  }

  const pdfBuffer = await blobResponse.arrayBuffer()
  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="EFC_Filing_${filing.filingReceiptId || 'complaint'}.pdf"`,
    },
  })
}
