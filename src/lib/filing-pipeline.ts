import axios from 'axios'
import { prisma } from '@/lib/prisma'
import { generateComplaintPdf, type FilerInfo } from '@/lib/generate-complaint-pdf'
import { storeComplaintPdf } from '@/lib/store-complaint-pdf'
import { sendFax, type FaxFile } from '@/lib/phaxio'
import { getAgencyFaxNumber } from '@/lib/agency-directory'
import { sendFilingReceiptEmail } from '@/lib/email-receipt'

/**
 * Orchestrates the full filing lifecycle after payment.
 * Steps: generate PDF -> store in Blob -> send fax -> stub email
 *
 * PIPE-05: Fax failure is isolated — email step runs regardless.
 * PIPE-06: Idempotency guard — skips if status !== 'paid'.
 */
export async function executeFilingPipeline(filingId: string): Promise<void> {
  // PIPE-06: Idempotency guard — re-fetch from DB
  const filing = await prisma.filing.findUnique({ where: { id: filingId } })
  if (!filing || filing.status !== 'paid') {
    console.log(`[pipeline] Skipping filing ${filingId}: status=${filing?.status}`)
    return
  }

  // Extract FilerInfo from filing.filerInfo JSON (stored at checkout)
  const filerInfoJson = filing.filerInfo as Record<string, string> | null
  if (!filerInfoJson) {
    console.error(`[pipeline] Filing ${filingId} has no filerInfo — cannot generate PDF`)
    await prisma.filing.update({ where: { id: filingId }, data: { status: 'failed' } })
    return
  }
  const filerInfo: FilerInfo = {
    firstName: filerInfoJson.firstName || '',
    lastName: filerInfoJson.lastName || '',
    email: filerInfoJson.email || '',
    address: filerInfoJson.address || '',
    city: filerInfoJson.city || '',
    state: filerInfoJson.state || '',
    zip: filerInfoJson.zip || '',
    phone: filerInfoJson.phone || '',
    county: filerInfoJson.county || undefined,
  }

  try {
    // Step 1: Generate PDF (PIPE-03: paid -> generating)
    await prisma.filing.update({ where: { id: filingId }, data: { status: 'generating' } })
    const pdfBytes = await generateComplaintPdf(filing, filerInfo)

    // Step 2: Store PDF in Vercel Blob
    await storeComplaintPdf(filingId, filing.filingReceiptId!, pdfBytes)

    // Step 3: Send fax (PIPE-03: generating -> filing)
    await prisma.filing.update({ where: { id: filingId }, data: { status: 'filing' } })

    let faxFailed = false
    try {
      const agencyFaxNumber = getAgencyFaxNumber('ca_ag')
      const files: FaxFile[] = [
        { buffer: Buffer.from(pdfBytes), filename: 'complaint.pdf', contentType: 'application/pdf' },
      ]

      // FAX-07: Attach evidence file if uploaded
      // FAX-08: Use axios.get (NOT native fetch) to download evidence bytes
      if (filing.evidenceFileUrl) {
        const evidenceResponse = await axios.get(filing.evidenceFileUrl, {
          responseType: 'arraybuffer',
        })
        const evidenceBuffer = Buffer.from(evidenceResponse.data)
        files.push({
          buffer: evidenceBuffer,
          filename: filing.evidenceFileName || 'evidence.pdf',
          contentType: 'application/pdf',
        })
      }

      const faxResult = await sendFax(agencyFaxNumber, files)

      if (faxResult.success && faxResult.data?.id) {
        // FAX-03: Write faxId and faxStatus to Filing after successful send
        await prisma.filing.update({
          where: { id: filingId },
          data: {
            faxId: String(faxResult.data.id),
            faxStatus: 'queued',
            faxSentAt: new Date(),
            status: 'filed',
          },
        })
      } else {
        throw new Error(`Phaxio returned success=false: ${faxResult.message}`)
      }
    } catch (faxErr) {
      // PIPE-05: Fax failure isolated — set failed but continue to email
      faxFailed = true
      console.error(`[pipeline] Fax failed for ${filingId}:`, faxErr)
      await prisma.filing.update({
        where: { id: filingId },
        data: { status: 'failed', faxStatus: 'failed' },
      })
    }

    // Step 4: Send receipt email (EMAIL-01 — PIPE-05: runs regardless of fax outcome)
    try {
      await sendFilingReceiptEmail(filing, pdfBytes, faxFailed)
    } catch (emailErr) {
      console.error(`[pipeline] Email failed for ${filingId}:`, emailErr)
      // Email failure is non-fatal — filing is already filed/failed from fax step
    }
  } catch (err) {
    // PIPE-04: PDF generation or storage failure -> set failed
    console.error(`[pipeline] Pipeline failed for ${filingId}:`, err)
    await prisma.filing.update({ where: { id: filingId }, data: { status: 'failed' } })
  }
}
