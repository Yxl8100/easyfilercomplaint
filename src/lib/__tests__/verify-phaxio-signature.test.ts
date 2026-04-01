import { describe, it, expect } from 'vitest'
import { verifyPhaxioSignature } from '../verify-phaxio-signature'
import crypto from 'crypto'

const TEST_URL = 'https://example.com/webhook'
const TEST_TOKEN = 'test-token'

function computeExpectedHmac(
  url: string,
  fields: Record<string, string>,
  token: string,
  fileSha1Digests?: Record<string, string>
): string {
  let payload = url
  const keys = Object.keys(fields).sort()
  for (const k of keys) payload += k + fields[k]
  if (fileSha1Digests) {
    const fileKeys = Object.keys(fileSha1Digests).sort()
    for (const k of fileKeys) payload += k + fileSha1Digests[k]
  }
  return crypto.createHmac('sha1', token).update(payload).digest('hex')
}

describe('verifyPhaxioSignature', () => {
  it('Test 1: known URL + params + token produces expected HMAC hex digest', () => {
    const fields = { fax_id: '123', success: 'true' }
    const expected = computeExpectedHmac(TEST_URL, fields, TEST_TOKEN)
    // Known expected value pre-computed: 79033d13d0f7c0b7b86ee256ea5c6b56b239fa2c
    expect(expected).toBe('79033d13d0f7c0b7b86ee256ea5c6b56b239fa2c')
  })

  it('Test 2: verifyPhaxioSignature returns true when computed matches received signature', () => {
    const fields = { fax_id: '123', success: 'true' }
    const validSig = computeExpectedHmac(TEST_URL, fields, TEST_TOKEN)
    expect(verifyPhaxioSignature(TEST_URL, fields, TEST_TOKEN, validSig)).toBe(true)
  })

  it('Test 3: verifyPhaxioSignature returns false when signature is wrong', () => {
    const fields = { fax_id: '123', success: 'true' }
    const wrongSig = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    expect(verifyPhaxioSignature(TEST_URL, fields, TEST_TOKEN, wrongSig)).toBe(false)
  })

  it('Test 4: verifyPhaxioSignature returns false when signature length differs (timingSafeEqual edge case)', () => {
    const fields = { fax_id: '123', success: 'true' }
    // Short signature — different length from 40-char hex
    const shortSig = 'abc123'
    expect(verifyPhaxioSignature(TEST_URL, fields, TEST_TOKEN, shortSig)).toBe(false)
  })

  it('Test 5: empty postFields produces HMAC of just the URL', () => {
    const emptyFields = {}
    const expectedEmpty = computeExpectedHmac(TEST_URL, emptyFields, TEST_TOKEN)
    // Known expected value for empty fields: a80b88fa2bafe17fea23fabf350363a9cf14745b
    expect(expectedEmpty).toBe('a80b88fa2bafe17fea23fabf350363a9cf14745b')
    expect(verifyPhaxioSignature(TEST_URL, emptyFields, TEST_TOKEN, expectedEmpty)).toBe(true)
  })
})
