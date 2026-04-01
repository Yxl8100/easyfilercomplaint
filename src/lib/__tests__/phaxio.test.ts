import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { sendFax, getFaxStatus } from '../phaxio'

vi.mock('axios')

const mockedAxiosPost = vi.fn()
const mockedAxiosGet = vi.fn()

describe('phaxio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.PHAXIO_API_KEY = 'test-api-key'
    process.env.PHAXIO_API_SECRET = 'test-api-secret'
    // Set up axios mocks
    vi.mocked(axios).post = mockedAxiosPost
    vi.mocked(axios).get = mockedAxiosGet
    mockedAxiosPost.mockResolvedValue({
      data: { success: true, data: { id: 12345 } },
    })
    mockedAxiosGet.mockResolvedValue({
      data: { success: true, data: { id: 12345, status: 'queued' } },
    })
  })

  describe('sendFax', () => {
    it('calls axios.post with URL https://api.phaxio.com/v2/faxes', async () => {
      const files = [{ buffer: Buffer.from('pdf-content'), filename: 'complaint.pdf', contentType: 'application/pdf' }]
      await sendFax('+19163235341', files)

      expect(mockedAxiosPost).toHaveBeenCalledWith(
        'https://api.phaxio.com/v2/faxes',
        expect.anything(),
        expect.anything()
      )
    })

    it('passes to field and file[] field in FormData (form-data package with getHeaders)', async () => {
      let capturedForm: unknown = null
      mockedAxiosPost.mockImplementation((url: string, form: unknown) => {
        capturedForm = form
        return Promise.resolve({ data: { success: true, data: { id: 12345 } } })
      })

      const files = [{ buffer: Buffer.from('pdf-content'), filename: 'complaint.pdf', contentType: 'application/pdf' }]
      await sendFax('+19163235341', files)

      expect(capturedForm).toBeDefined()
      // form-data package instances have a getHeaders() method (native FormData does not)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(typeof (capturedForm as any).getHeaders).toBe('function')
    })

    it('uses auth: { username, password } from env vars', async () => {
      let capturedConfig: unknown = null
      mockedAxiosPost.mockImplementation((url: string, form: unknown, config: unknown) => {
        capturedConfig = config
        return Promise.resolve({ data: { success: true, data: { id: 12345 } } })
      })

      const files = [{ buffer: Buffer.from('pdf-content'), filename: 'complaint.pdf', contentType: 'application/pdf' }]
      await sendFax('+19163235341', files)

      expect(capturedConfig).toMatchObject({
        auth: {
          username: 'test-api-key',
          password: 'test-api-secret',
        },
      })
    })

    it('with evidence file, appends two file[] entries to FormData', async () => {
      let capturedForm: unknown = null
      mockedAxiosPost.mockImplementation((url: string, form: unknown) => {
        capturedForm = form
        return Promise.resolve({ data: { success: true, data: { id: 12345 } } })
      })

      const files = [
        { buffer: Buffer.from('complaint-pdf'), filename: 'complaint.pdf', contentType: 'application/pdf' },
        { buffer: Buffer.from('evidence-data'), filename: 'evidence.pdf', contentType: 'application/pdf' },
      ]
      await sendFax('+19163235341', files)

      expect(mockedAxiosPost).toHaveBeenCalledTimes(1)
      // Both files should appear in the form buffer
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formData = capturedForm as any
      const formStr = typeof formData.getBuffer === 'function' ? formData.getBuffer().toString() : ''
      expect(formStr).toContain('complaint.pdf')
      expect(formStr).toContain('evidence.pdf')
    })

    it('throws if PHAXIO_API_KEY is not set', async () => {
      delete process.env.PHAXIO_API_KEY

      const files = [{ buffer: Buffer.from('pdf-content'), filename: 'complaint.pdf', contentType: 'application/pdf' }]
      await expect(sendFax('+19163235341', files)).rejects.toThrow(
        'PHAXIO_API_KEY and PHAXIO_API_SECRET must be set'
      )
    })

    it('does NOT use native fetch (verify axios is the HTTP client)', async () => {
      const fs = await import('fs')
      const path = await import('path')
      const filePath = path.resolve(__dirname, '../phaxio.ts')
      const source = fs.readFileSync(filePath, 'utf-8')
      expect(source).not.toMatch(/\bfetch\b/)
    })
  })

  describe('getFaxStatus', () => {
    it('calls axios.get with correct URL including faxId', async () => {
      await getFaxStatus(12345)

      expect(mockedAxiosGet).toHaveBeenCalledWith(
        'https://api.phaxio.com/v2/faxes/12345',
        expect.objectContaining({
          auth: {
            username: 'test-api-key',
            password: 'test-api-secret',
          },
        })
      )
    })
  })
})
