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
  state: '',
  zip: '',
  phone: '',
}
