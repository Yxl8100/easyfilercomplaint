export interface Agency {
  id: string
  name: string
  method: 'guided' | 'auto_email' | 'auto_fax'
}

export interface Category {
  id: string
  icon: string
  label: string
  description: string
  agencies: Agency[]
  accent: string
}

export const categories: Category[] = [
  {
    id: 'data-privacy',
    icon: '§',
    label: 'Data Privacy',
    description: 'Unauthorized tracking, data sharing, CCPA violations, HIPAA breaches',
    agencies: [
      { id: 'fcc', name: 'FCC', method: 'guided' },
      { id: 'ftc', name: 'FTC', method: 'guided' },
      { id: 'ca_ag', name: 'CA Attorney General', method: 'auto_fax' },
      { id: 'doj_ada', name: 'DOJ Civil Rights', method: 'auto_email' },
    ],
    accent: '#8b2500',
  },
  {
    id: 'consumer-protection',
    icon: '¶',
    label: 'Consumer Protection',
    description: 'Deceptive practices, fraud, unfair billing, false advertising',
    agencies: [
      { id: 'ftc', name: 'FTC', method: 'guided' },
      { id: 'cfpb', name: 'CFPB', method: 'guided' },
      { id: 'ca_ag', name: 'CA Attorney General', method: 'auto_fax' },
    ],
    accent: '#2d5016',
  },
  {
    id: 'fda-violations',
    icon: '†',
    label: 'FDA Violations',
    description: 'Food safety, drug safety, medical devices, supplements',
    agencies: [
      { id: 'fda', name: 'FDA MedWatch', method: 'auto_fax' },
      { id: 'ca_ag', name: 'CA Attorney General', method: 'auto_fax' },
    ],
    accent: '#8b2500',
  },
  {
    id: 'environmental',
    icon: '‡',
    label: 'Environmental',
    description: 'Pollution, illegal dumping, water contamination, air quality',
    agencies: [
      { id: 'epa', name: 'EPA', method: 'guided' },
      { id: 'ca_ag', name: 'CA Attorney General', method: 'auto_fax' },
    ],
    accent: '#2d5016',
  },
  {
    id: 'city-code',
    icon: '∞',
    label: 'City Code Violations',
    description: 'Building violations, noise complaints, zoning issues',
    agencies: [
      { id: 'ca_ag', name: 'CA Attorney General', method: 'auto_fax' },
    ],
    accent: '#5c4a1e',
  },
  {
    id: 'accessibility',
    icon: '◊',
    label: 'Accessibility (ADA)',
    description: 'Website accessibility, physical barriers, discrimination',
    agencies: [
      { id: 'doj_ada', name: 'DOJ Civil Rights', method: 'auto_email' },
      { id: 'fcc', name: 'FCC', method: 'guided' },
      { id: 'ca_ag', name: 'CA Attorney General', method: 'auto_fax' },
    ],
    accent: '#3b1f6e',
  },
]

export function getCategoryById(id: string): Category | undefined {
  return categories.find((c) => c.id === id)
}
