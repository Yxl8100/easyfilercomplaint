import { describe, it, expect } from 'vitest'
import { getAgencyFaxNumber, getAgencyName, AGENCY_DIRECTORY } from '../agency-directory'

describe('agency-directory', () => {
  describe('getAgencyFaxNumber', () => {
    it('returns the CA AG fax number for ca_ag', () => {
      expect(getAgencyFaxNumber('ca_ag')).toBe('+19163235341')
    })

    it('returns a number in E.164 format (starts with +)', () => {
      const faxNumber = getAgencyFaxNumber('ca_ag')
      expect(faxNumber.startsWith('+')).toBe(true)
    })

    it('throws for unknown agency code', () => {
      expect(() => getAgencyFaxNumber('unknown')).toThrow('Unknown agency code: unknown')
    })
  })

  describe('getAgencyName', () => {
    it('returns the correct name for ca_ag', () => {
      expect(getAgencyName('ca_ag')).toBe('California Attorney General')
    })

    it('throws for unknown agency code', () => {
      expect(() => getAgencyName('unknown')).toThrow('Unknown agency code: unknown')
    })
  })

  describe('AGENCY_DIRECTORY', () => {
    it('contains ca_ag entry', () => {
      expect(AGENCY_DIRECTORY['ca_ag']).toBeDefined()
    })

    it('ca_ag entry has required fields', () => {
      const entry = AGENCY_DIRECTORY['ca_ag']
      expect(entry.code).toBe('ca_ag')
      expect(entry.name).toBe('California Attorney General')
      expect(entry.state).toBe('CA')
    })
  })
})
