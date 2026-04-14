import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
}))

function makeFileRequest(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return new NextRequest('http://localhost/api/upload-evidence', {
    method: 'POST',
    body: formData,
  })
}

describe('POST /api/upload-evidence', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.BLOB_READ_WRITE_TOKEN = 'test-token'
  })

  it('returns 503 when BLOB_READ_WRITE_TOKEN is absent', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN
    const { POST } = await import('./route')
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
    const response = await POST(makeFileRequest(file))
    expect(response.status).toBe(503)
    const json = await response.json()
    expect(json.error).toBe('Evidence upload unavailable in this environment')
  })

  it('returns 400 when no file provided', async () => {
    const { POST } = await import('./route')
    const request = new NextRequest('http://localhost/api/upload-evidence', {
      method: 'POST',
      body: new FormData(),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('No file provided')
  })

  it('returns 400 when file exceeds 5MB', async () => {
    const { POST } = await import('./route')
    const bigContent = new Uint8Array(5 * 1024 * 1024 + 1)
    const file = new File([bigContent], 'big.pdf', { type: 'application/pdf' })
    const response = await POST(makeFileRequest(file))
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('File exceeds 5 MB')
  })

  it('returns 400 when file type is not allowed', async () => {
    const { POST } = await import('./route')
    const file = new File(['test'], 'test.exe', { type: 'application/x-msdownload' })
    const response = await POST(makeFileRequest(file))
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toBe('Invalid file type')
  })

  it('returns { url, filename } on valid PDF upload', async () => {
    const { put } = await import('@vercel/blob')
    ;(put as ReturnType<typeof vi.fn>).mockResolvedValue({
      url: 'https://blob.vercel-storage.com/evidence/tmp/uuid/test.pdf',
    })
    const { POST } = await import('./route')
    const file = new File(['%PDF-1.4'], 'test.pdf', { type: 'application/pdf' })
    const response = await POST(makeFileRequest(file))
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.url).toContain('evidence/tmp')
    expect(json.filename).toBe('test.pdf')
  })

  it('returns { url, filename } on valid PNG upload', async () => {
    const { put } = await import('@vercel/blob')
    ;(put as ReturnType<typeof vi.fn>).mockResolvedValue({
      url: 'https://blob.vercel-storage.com/evidence/tmp/uuid/photo.png',
    })
    const { POST } = await import('./route')
    const file = new File(['PNG'], 'photo.png', { type: 'image/png' })
    const response = await POST(makeFileRequest(file))
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.filename).toBe('photo.png')
  })

  it('sanitizes filename by replacing special characters', async () => {
    const { put } = await import('@vercel/blob')
    ;(put as ReturnType<typeof vi.fn>).mockResolvedValue({
      url: 'https://blob.vercel-storage.com/evidence/tmp/uuid/my_file_2024_.pdf',
    })
    const { POST } = await import('./route')
    const file = new File(['%PDF-1.4'], 'my file (2024).pdf', { type: 'application/pdf' })
    const response = await POST(makeFileRequest(file))
    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.filename).toBe('my_file__2024_.pdf')
  })
})
