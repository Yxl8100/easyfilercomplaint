import crypto from 'crypto'

/**
 * Verifies Phaxio webhook HMAC-SHA1 signature.
 * Algorithm: HMAC-SHA1(callbackToken, url + sortedParamNameValues [+ sortedFileSHA1s])
 * Source: https://www.phaxio.com/docs/security/callbacks
 */
export function verifyPhaxioSignature(
  callbackUrl: string,
  postFields: Record<string, string>,
  callbackToken: string,
  receivedSignature: string,
  fileSha1Digests?: Record<string, string>
): boolean {
  let payload = callbackUrl

  // Step 1: Sort POST params by key, concatenate key+value
  const sortedKeys = Object.keys(postFields).sort()
  for (const key of sortedKeys) {
    payload += key + postFields[key]
  }

  // Step 2: Sort file SHA1 digests by field name, concatenate fieldname+sha1
  if (fileSha1Digests) {
    const sortedFileKeys = Object.keys(fileSha1Digests).sort()
    for (const key of sortedFileKeys) {
      payload += key + fileSha1Digests[key]
    }
  }

  const computed = crypto.createHmac('sha1', callbackToken).update(payload).digest('hex')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    )
  } catch {
    // Length mismatch or invalid hex -> signature invalid
    return false
  }
}
