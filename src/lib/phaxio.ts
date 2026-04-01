import axios from 'axios'
import FormData from 'form-data'

const PHAXIO_API_URL = 'https://api.phaxio.com/v2/faxes'

export interface PhaxioSendResult {
  success: boolean
  message: string
  data?: { id: number }
  error?: string
}

export interface PhaxioFaxStatus {
  success: boolean
  data?: {
    id: number
    status: string
    num_pages: number
    completed_at: string | null
    recipients: Array<{
      phone_number: string
      status: string
      completed_at: string | null
    }>
  }
}

export interface FaxFile {
  buffer: Buffer
  filename: string
  contentType: string
}

export async function sendFax(
  toNumber: string,
  files: FaxFile[]
): Promise<PhaxioSendResult> {
  const apiKey = process.env.PHAXIO_API_KEY
  const apiSecret = process.env.PHAXIO_API_SECRET
  if (!apiKey || !apiSecret) {
    throw new Error('PHAXIO_API_KEY and PHAXIO_API_SECRET must be set')
  }

  const form = new FormData()
  form.append('to', toNumber)
  for (const f of files) {
    form.append('file[]', f.buffer, { filename: f.filename, contentType: f.contentType })
  }

  const response = await axios.post(PHAXIO_API_URL, form, {
    auth: { username: apiKey, password: apiSecret },
    headers: form.getHeaders(),
  })

  const result: PhaxioSendResult = response.data
  if (!result.success) {
    console.error('[Phaxio] Fax send failed:', result.message || result.error)
  } else {
    console.log(`[Phaxio] Fax queued. ID: ${result.data?.id}`)
  }
  return result
}

export async function getFaxStatus(faxId: number): Promise<PhaxioFaxStatus> {
  const apiKey = process.env.PHAXIO_API_KEY
  const apiSecret = process.env.PHAXIO_API_SECRET
  if (!apiKey || !apiSecret) {
    throw new Error('PHAXIO_API_KEY and PHAXIO_API_SECRET must be set')
  }

  const response = await axios.get(`${PHAXIO_API_URL}/${faxId}`, {
    auth: { username: apiKey, password: apiSecret },
  })
  return response.data
}
