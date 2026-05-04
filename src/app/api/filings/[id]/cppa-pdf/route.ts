import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { generateCPPAComplaintPdf } from '@/lib/cppa-pdf-generator'
import { put } from '@vercel/blob'

/**
 * GET /api/filings/[id]/cppa-pdf
 *
 * Returns the CPPA paper complaint PDF for the filing as a file download.
 *
 * Access model: UUID-only (per D-04/D-05 from Phase 10 CONTEXT.md).
 * The filing UUID (36-char random) IS the access token. No session check —
 * this allows guest filers to download their own form via a plain <a href> link
 * from the success page without requiring login.
 *
 * Storage: PDF is uploaded to Vercel Blob at a dedicated CPPA path
 * (complaints/cppa/{id}/CPPA_{receiptId}.pdf) so it does NOT overwrite the
 * CA AG PDF stored at complaints/{id}/EFC_{receiptId}.pdf. Filing.complaintPdfUrl
 * is NOT updated by this route — that field is reserved for the CA AG PDF.
 *
 * The route returns the PDF bytes regardless of whether Blob storage succeeds,
 * so a missing BLOB_READ_WRITE_TOKEN does not break the download.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // 1. Lookup Filing by UUID. UUID-only access — no session check (D-04/D-05).
  const filing = await prisma.filing.findUnique({
    where: { id: params.id },
  })

  if (!filing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // 2. Generate PDF on demand (Plan 02 generator)
  let pdfBytes: Uint8Array | undefined
  try {
    pdfBytes = await generateCPPAComplaintPdf(filing)
  } catch (err) {
    console.error('[cppa-pdf] PDF generation failed:', err)
    return NextResponse.json({ error: 'pdf_generation_failed' }, { status: 500 })
  }
  if (!pdfBytes) {
    console.error('[cppa-pdf] generateCPPAComplaintPdf returned empty result')
    return NextResponse.json({ error: 'pdf_generation_failed' }, { status: 500 })
  }

  // 3. Store in Vercel Blob at the dedicated CPPA path (Pitfall 3 — avoid AG PDF collision)
  //    Skip silently if BLOB_READ_WRITE_TOKEN is absent (matches store-complaint-pdf.ts pattern).
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const receiptId = filing.filingReceiptId ?? filing.id
    try {
      await put(
        `complaints/cppa/${filing.id}/CPPA_${receiptId}.pdf`,
        Buffer.from(pdfBytes),
        {
          access: 'private',
          contentType: 'application/pdf',
          addRandomSuffix: false,
          allowOverwrite: true,
        }
      )
    } catch (err) {
      // Blob storage failure must NOT block the consumer download.
      // Log and continue — PDF bytes still stream back to the client.
      console.error('[cppa-pdf] Blob storage failed:', err)
    }
  }

  // 4. Return PDF as file download (attachment, not inline — consumer must print and mail)
  const downloadId = filing.filingReceiptId ?? filing.id
  return new NextResponse(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': String(pdfBytes.byteLength),
      'Content-Disposition': `attachment; filename="CPPA_Complaint_${downloadId}.pdf"`,
    },
  })
}
