/**
 * Fax submission for CA Attorney General and FDA MedWatch
 *
 * CA AG: Fax to (916) 323-5341
 * FDA MedWatch: Fax to 800-332-0178
 *
 * Uses Phaxio API ($0.07/page)
 */

import { sendFax, getFaxStatus } from './phaxio'
import { config } from './config'

interface FaxSubmitResult {
  success: boolean
  faxId?: number
  error?: string
}

export async function submitViaFax(
  agency: 'ca_ag' | 'fda',
  pdfBuffer: Uint8Array,
  targetName: string
): Promise<FaxSubmitResult> {
  const faxNumber = agency === 'ca_ag' ? config.caAgFax : config.fdaFax

  try {
    const agencyLabel = agency === 'ca_ag' ? 'CA Attorney General' : 'FDA MedWatch'
    const filename = `Complaint-${agencyLabel.replace(/\s/g, '-')}-${targetName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`

    const result = await sendFax(faxNumber, [
      { buffer: Buffer.from(pdfBuffer), filename, contentType: 'application/pdf' },
    ])

    if (!result.success) {
      return { success: false, error: result.message || 'Fax failed to send' }
    }

    return { success: true, faxId: result.data?.id }

  } catch (err: unknown) {
    console.error(`[Fax ${agency}] Exception:`, err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function checkFaxStatus(faxId: number): Promise<{
  status: string
  completed: boolean
  success: boolean
}> {
  try {
    const result = await getFaxStatus(faxId)

    if (!result.success || !result.data) {
      return { status: 'unknown', completed: false, success: false }
    }

    const faxStatus = result.data.status
    const completed = ['success', 'failure', 'partialsuccess'].includes(faxStatus)
    const success = faxStatus === 'success'

    return { status: faxStatus, completed, success }

  } catch {
    return { status: 'error', completed: false, success: false }
  }
}
