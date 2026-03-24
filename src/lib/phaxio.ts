/**
 * Phaxio Fax API Client
 * Docs: https://www.phaxio.com/docs/api/v2/faxes/create_and_send_fax
 *
 * Pricing: $0.07/page
 * Test API key: simulates fax without sending (free, unlimited)
 * Live API key: actually sends the fax
 */

const PHAXIO_API_URL = 'https://api.phaxio.com/v2/faxes'

interface PhaxioSendResult {
  success: boolean
  message: string
  data?: {
    id: number
  }
  error?: string
}

interface PhaxioFaxStatus {
  success: boolean
  data?: {
    id: number
    status: string // 'queued' | 'pendingbatch' | 'inprogress' | 'success' | 'failure' | 'partialsuccess'
    num_pages: number
    completed_at: string | null
    recipients: Array<{
      phone_number: string
      status: string
      completed_at: string | null
    }>
  }
}

export async function sendFax(
  toNumber: string,
  pdfBuffer: Buffer | Uint8Array,
  filename: string = 'complaint.pdf'
): Promise<PhaxioSendResult> {
  const apiKey = process.env.PHAXIO_API_KEY
  const apiSecret = process.env.PHAXIO_API_SECRET

  if (!apiKey || !apiSecret) {
    throw new Error('PHAXIO_API_KEY and PHAXIO_API_SECRET must be set')
  }

  const formData = new FormData()
  formData.append('to', toNumber)
  formData.append('file', new Blob([Buffer.from(pdfBuffer)], { type: 'application/pdf' }), filename)

  const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')

  const response = await fetch(PHAXIO_API_URL, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
    },
    body: formData,
  })

  const result: PhaxioSendResult = await response.json()

  if (!result.success) {
    console.error('[Phaxio] Fax send failed:', result.message || result.error)
  } else {
    console.log(`[Phaxio] Fax queued successfully. Fax ID: ${result.data?.id}`)
  }

  return result
}

export async function getFaxStatus(faxId: number): Promise<PhaxioFaxStatus> {
  const apiKey = process.env.PHAXIO_API_KEY
  const apiSecret = process.env.PHAXIO_API_SECRET

  const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')

  const response = await fetch(`${PHAXIO_API_URL}/${faxId}`, {
    method: 'GET',
    headers: {
      Authorization: authHeader,
    },
  })

  return await response.json()
}

// Agency fax numbers (use config.ts for live/test switching)
export const AGENCY_FAX_NUMBERS = {
  ca_ag: '+19163235341',  // CA Attorney General (916) 323-5341
  fda: '+18003320178',    // FDA MedWatch 800-332-0178
} as const
