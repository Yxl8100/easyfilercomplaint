/**
 * Generates a unique filing receipt ID in the format EFC-YYYYMMDD-XXXXX.
 *
 * - EFC prefix identifies EasyFilerComplaint
 * - YYYYMMDD is the current UTC date
 * - XXXXX is a 5-character random alphanumeric suffix (uppercase)
 *
 * Example: EFC-20260331-X7K2M
 *
 * This ID is stored on Filing.filingReceiptId (unique constraint in Prisma schema)
 * and displayed to consumers on the success page, in emails, and on PDFs.
 */
export function generateFilingReceiptId(): string {
  const date = new Date()
  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let suffix = ''
  for (let i = 0; i < 5; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)]
  }
  return `EFC-${yyyy}${mm}${dd}-${suffix}`
}
