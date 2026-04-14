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
    id: 'privacy_tracking',
    icon: '\u00A7',
    label: 'Privacy & Tracking',
    description: 'Unauthorized data collection, cookies, CCPA violations',
    agencies: [
      { id: 'ca_ag', name: 'CA Attorney General', method: 'auto_fax' },
    ],
    accent: '#8b2500',
  },
  {
    id: 'accessibility',
    icon: '\u25CA',
    label: 'Accessibility (ADA)',
    description: 'Website barriers, physical access, service animal denial',
    agencies: [
      { id: 'ca_ag', name: 'CA Attorney General', method: 'auto_fax' },
    ],
    accent: '#3b1f6e',
  },
  {
    id: 'video_sharing',
    icon: '\u2020',
    label: 'Video Sharing & Streaming',
    description: 'Cable operator violations, streaming privacy, VPPA',
    agencies: [
      { id: 'ca_ag', name: 'CA Attorney General', method: 'auto_fax' },
    ],
    accent: '#5c4a1e',
  },
]

export function getCategoryById(id: string): Category | undefined {
  return categories.find((c) => c.id === id)
}
