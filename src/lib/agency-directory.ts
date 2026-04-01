export interface AgencyEntry {
  code: string
  name: string
  faxNumber: string  // E.164 format
  state: string
}

export const AGENCY_DIRECTORY: Record<string, AgencyEntry> = {
  ca_ag: {
    code: 'ca_ag',
    name: 'California Attorney General',
    faxNumber: '+19163235341',  // Placeholder — verify against oag.ca.gov before go-live
    state: 'CA',
  },
}

export function getAgencyFaxNumber(agencyCode: string): string {
  const entry = AGENCY_DIRECTORY[agencyCode]
  if (!entry) {
    throw new Error(`Unknown agency code: ${agencyCode}`)
  }
  return entry.faxNumber
}

export function getAgencyName(agencyCode: string): string {
  const entry = AGENCY_DIRECTORY[agencyCode]
  if (!entry) {
    throw new Error(`Unknown agency code: ${agencyCode}`)
  }
  return entry.name
}
