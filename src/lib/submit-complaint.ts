import { generateComplaintLetterPdf } from './pdf-filler'
import { submitDojComplaint } from './submit-email'
import { submitViaFax } from './submit-fax'
import { FilingData } from './filing-state'
import { createHash } from 'crypto'

export interface SubmissionResult {
  agency: string
  method: 'auto_email' | 'auto_fax' | 'guided'
  success: boolean
  confirmationId?: string  // email message ID or fax ID
  pdfHash?: string         // SHA-256 of the submitted PDF
  error?: string
  timestamp: string
}

/**
 * Agency submission method mapping
 */
const AGENCY_METHODS: Record<string, 'auto_email' | 'auto_fax' | 'guided'> = {
  doj_ada: 'auto_email',
  ca_ag: 'auto_fax',
  fda: 'auto_fax',
  fcc: 'guided',
  ftc: 'guided',
  cfpb: 'guided',
  epa: 'guided',
}

/**
 * Submit a complaint to a single agency
 */
export async function submitToAgency(
  data: FilingData,
  agency: string
): Promise<SubmissionResult> {
  const method = AGENCY_METHODS[agency] || 'guided'
  const timestamp = new Date().toISOString()

  if (method === 'guided') {
    return { agency, method: 'guided', success: true, timestamp }
  }

  let pdfBytes: Uint8Array
  try {
    pdfBytes = await generateComplaintLetterPdf(data, agency)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return {
      agency,
      method,
      success: false,
      error: `PDF generation failed: ${message}`,
      timestamp,
    }
  }

  const pdfHash = createHash('sha256').update(pdfBytes).digest('hex')

  if (method === 'auto_email') {
    const result = await submitDojComplaint(pdfBytes, {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      targetName: data.targetName,
      category: data.category,
    })

    return {
      agency,
      method: 'auto_email',
      success: result.success,
      confirmationId: result.messageId,
      pdfHash,
      error: result.error,
      timestamp,
    }
  }

  if (method === 'auto_fax') {
    const result = await submitViaFax(agency as 'ca_ag' | 'fda', pdfBytes, data.targetName)

    return {
      agency,
      method: 'auto_fax',
      success: result.success,
      confirmationId: result.faxId?.toString(),
      pdfHash,
      error: result.error,
      timestamp,
    }
  }

  return { agency, method, success: false, error: 'Unknown submission method', timestamp }
}

/**
 * Submit complaints to ALL selected agencies
 */
export async function submitAllComplaints(
  data: FilingData
): Promise<SubmissionResult[]> {
  const results: SubmissionResult[] = []

  for (let i = 0; i < data.selectedAgencies.length; i++) {
    const agency = data.selectedAgencies[i]
    const result = await submitToAgency(data, agency)
    results.push(result)

    if (i < data.selectedAgencies.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  return results
}
