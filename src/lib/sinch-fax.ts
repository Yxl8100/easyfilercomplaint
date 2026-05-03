const SINCH_FAX_BASE = 'https://fax.api.sinch.com/v3/projects'

// Normalize Sinch v3 uppercase status values to the lowercase strings used throughout the app
function normalizeSinchStatus(status: string): string {
  switch (status.toUpperCase()) {
    case 'QUEUED':
      return 'queued'
    case 'IN_PROGRESS':
      return 'inprogress'
    case 'SUCCEEDED':
      return 'success'
    case 'FAILED':
      return 'failure'
    case 'PARTIAL_SUCCESS':
      return 'partialsuccess'
    default:
      return status.toLowerCase()
  }
}

export interface FaxFile {
  buffer: Buffer
  filename: string
  contentType: string
}

export interface SinchSendResult {
  success: boolean
  message: string
  data?: { id: string }
  error?: string
}

export interface SinchFaxStatus {
  success: boolean
  data?: {
    id: string
    status: string
    num_pages: number
    completed_at: string | null
    recipients: Array<{ phone_number: string; status: string; completed_at: string | null }>
  }
}

export async function sendFax(
  toNumber: string,
  files: FaxFile[]
): Promise<SinchSendResult> {
  const key = process.env.SINCH_ACCESS_KEY
  const secret = process.env.SINCH_ACCESS_SECRET
  const pid = process.env.SINCH_PROJECT_ID

  if (!key || !secret || !pid) {
    throw new Error('SINCH_ACCESS_KEY, SINCH_ACCESS_SECRET, and SINCH_PROJECT_ID must be set')
  }

  const formData = new FormData()
  formData.append('to', toNumber)
  for (const f of files) {
    formData.append('file', new Blob([f.buffer], { type: f.contentType }), f.filename)
  }

  const response = await fetch(`${SINCH_FAX_BASE}/${pid}/faxes`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    const message = `HTTP ${response.status}: ${errorText}`
    console.error('[Sinch] Fax send failed:', message)
    return { success: false, message }
  }

  const json = await response.json() as { id: string; status: string }
  console.log(`[Sinch] Fax queued. ID: ${json.id}`)
  return { success: true, message: 'Fax queued successfully', data: { id: json.id } }
}

export async function getFaxStatus(faxId: string): Promise<SinchFaxStatus> {
  const key = process.env.SINCH_ACCESS_KEY
  const secret = process.env.SINCH_ACCESS_SECRET
  const pid = process.env.SINCH_PROJECT_ID

  if (!key || !secret || !pid) {
    throw new Error('SINCH_ACCESS_KEY, SINCH_ACCESS_SECRET, and SINCH_PROJECT_ID must be set')
  }

  const response = await fetch(`${SINCH_FAX_BASE}/${pid}/faxes/${faxId}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`,
    },
  })

  if (!response.ok) {
    return { success: false }
  }

  const json = await response.json() as {
    id: string
    status: string
    pageCount?: number
    completedTime?: string | null
  }

  return {
    success: true,
    data: {
      id: json.id,
      status: normalizeSinchStatus(json.status),
      num_pages: json.pageCount ?? 0,
      completed_at: json.completedTime ?? null,
      recipients: [],
    },
  }
}
