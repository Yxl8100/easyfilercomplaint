import { describe, it, expect } from 'vitest'
import { generateFilingReceiptId } from '../filing-receipt-id'

describe('generateFilingReceiptId', () => {
  it('returns a string matching EFC-YYYYMMDD-XXXXX format', () => {
    const id = generateFilingReceiptId()
    expect(id).toMatch(/^EFC-\d{8}-[A-Z0-9]{5}$/)
  })

  it('uses today UTC date in YYYYMMDD format', () => {
    const id = generateFilingReceiptId()
    const now = new Date()
    const yyyy = now.getUTCFullYear().toString()
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(now.getUTCDate()).padStart(2, '0')
    const expectedDate = `${yyyy}${mm}${dd}`
    expect(id.substring(4, 12)).toBe(expectedDate)
  })

  it('produces different results on consecutive calls', () => {
    const ids = new Set(Array.from({ length: 10 }, () => generateFilingReceiptId()))
    expect(ids.size).toBeGreaterThan(1)
  })

  it('returns exactly 18 characters', () => {
    const id = generateFilingReceiptId()
    expect(id.length).toBe(18)
  })
})
