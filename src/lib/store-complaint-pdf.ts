import { put } from '@vercel/blob'
import { prisma } from '@/lib/prisma'

/**
 * Uploads a complaint PDF to Vercel Blob and updates Filing.complaintPdfUrl.
 *
 * Returns the blob URL on success, or null if BLOB_READ_WRITE_TOKEN is absent.
 *
 * NOTE: Filing.status transitions are NOT handled here — status lifecycle
 * belongs to the PIPE-03 pipeline orchestrator in Phase 4 (executeFilingPipeline).
 * This function is a pure storage utility.
 */
export async function storeComplaintPdf(
  filingId: string,
  filingReceiptId: string,
  pdfBytes: Uint8Array
): Promise<string | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn('[pdf] BLOB_READ_WRITE_TOKEN not set -- skipping blob storage')
    return null
  }

  const blobPath = `complaints/${filingId}/EFC_${filingReceiptId}.pdf`

  const blob = await put(blobPath, Buffer.from(pdfBytes), {
    access: 'private',
    contentType: 'application/pdf',
    addRandomSuffix: false,
    allowOverwrite: true,
  })

  await prisma.filing.update({
    where: { id: filingId },
    data: { complaintPdfUrl: blob.url },
  })

  return blob.url
}
