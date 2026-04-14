export interface FilingData {
  category: string
  selectedAgencies: string[]

  // Business info
  targetName: string
  targetUrl?: string
  targetAddress?: string
  targetCity?: string
  targetState?: string
  targetZip?: string
  targetPhone?: string
  targetEmail?: string

  // Incident
  incidentDate?: string
  description: string
  amountPaid?: number
  paymentMethod?: string
  priorContact: boolean
  priorContactDetails?: string
  categoryFields: Record<string, unknown>

  // Your info
  firstName: string
  lastName: string
  email: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  county?: string
  ageRange?: string

  // Phase 8: visit date and evidence
  visitMonth?: string        // '01'-'12' from Details step dropdown
  visitYear?: string         // e.g. '2026' from Details step dropdown
  evidenceFileUrl?: string   // set after /api/upload-evidence, forwarded to checkout
  evidenceFileName?: string  // set after /api/upload-evidence, forwarded to checkout
}

export const defaultFilingData: FilingData = {
  category: '',
  selectedAgencies: [],
  targetName: '',
  description: '',
  priorContact: false,
  categoryFields: {},
  firstName: '',
  lastName: '',
  email: '',
  address: '',
  city: '',
  state: 'CA',
  zip: '',
  phone: '',
}
