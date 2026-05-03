import type { Filing } from '@prisma/client'

export interface CPPAComplaint {
  /** Q1: Checkbox instructions (visual only — no copy-paste box on guide page) */
  q1CheckboxInstructions: string[]

  /** Q2: Business name for copy-paste */
  q2BusinessName: string

  /** Q3: California resident (instruction only) */
  q3CaliforniaResident: 'Yes'

  /** Q4: Complaint description — the core narrative, ≤2000 chars, no statute citations */
  q4Description: string

  /** Q5: Supporting materials for copy-paste */
  q5SupportingMaterials: string

  /** Q6: Contacted business (instruction only) */
  q6ContactedBusiness: 'No / Not applicable'

  /** Q7: Contact information for copy-paste */
  q7ContactInfo: string
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const CATEGORY_TO_CPPA_CHECKBOXES: Record<string, string[]> = {
  privacy_tracking: [
    'Collection, use, storage, or sharing of my personal information',
    'Right to opt out of sale or sharing of personal information',
  ],
  'data-privacy': [
    'Collection, use, storage, or sharing of my personal information',
    'Right to opt out of sale or sharing of personal information',
  ],
  video_sharing: [
    'Collection, use, storage, or sharing of my personal information',
  ],
  'video-sharing': [
    'Collection, use, storage, or sharing of my personal information',
  ],
  accessibility: [],
}

function buildVisitDate(categoryFields: Record<string, unknown>): string {
  const month = categoryFields?.visitMonth as string | undefined
  const year = categoryFields?.visitYear as string | undefined
  if (month && year) {
    const idx = parseInt(month, 10) - 1
    return `${MONTH_NAMES[idx] ?? month} ${year}`
  }
  if (year) return year
  return 'a recent date'
}

export function generateCPPAComplaint(filing: Filing): CPPAComplaint {
  const cf = (filing.categoryFields as Record<string, unknown>) ?? {}
  const visitDate = buildVisitDate(cf)
  const businessRef = filing.targetUrl || filing.targetName
  const userText = filing.description?.trim() ?? ''

  // Q4: core narrative — no statute citations (CPTXT-02)
  // Note: avoid em-dash (—) and curly quotes to keep the font glyph subset small;
  // Liberation Serif's ToUnicode CMap hex-encodes the § glyph when extended blocks are included.
  const opening =
    `On or about ${visitDate}, I visited the website ${businessRef}.` +
    ` During my visit, I discovered that the website was collecting my personal information,` +
    ` including my browsing activity, device information, and IP address,` +
    ` and sharing it with third-party advertising companies without my knowledge or consent.`

  const closing =
    ` I was not given a clear opportunity to opt out of this data collection before it occurred,` +
    ` and the website did not display an adequate privacy notice or "Do Not Sell My Personal Information" link.` +
    ` I am filing this complaint because I believe these practices violate my rights as a California consumer.`

  // Integrate user free-text contextually if present (CPTXT-04)
  const maxMiddle = 2000 - opening.length - closing.length - 5
  const rawMiddle = userText
    ? ` ${userText}.`
    : ` The website placed tracking cookies on my device and transmitted my data to advertising networks.`
  const safeMiddle =
    rawMiddle.length > maxMiddle
      ? rawMiddle.slice(0, maxMiddle).trimEnd() + '.'
      : rawMiddle

  const q4 = (opening + safeMiddle + closing).slice(0, 2000)

  // Q5: fixed supporting materials string
  const q5 =
    `I have a screenshot of the website's tracking activity, a record of cookies placed on my device, ` +
    `and a filing receipt from EasyFilerComplaint (Filing ID: ${filing.filingReceiptId ?? filing.id}).`

  // Q7: contact info from filerInfo JSON stored on filing
  const fi = (filing.filerInfo as Record<string, string> | null) ?? {}
  const phone = fi.phone?.trim()
  const address = fi.address?.trim()
  const q7Lines = [
    `${fi.firstName ?? ''} ${fi.lastName ?? ''}`.trim(),
    fi.email ?? '',
    phone || null,
    address ? `${address}, ${fi.city}, ${fi.state} ${fi.zip}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  return {
    q1CheckboxInstructions: CATEGORY_TO_CPPA_CHECKBOXES[filing.category] ?? [],
    q2BusinessName: filing.targetUrl
      ? `${filing.targetName} (${filing.targetUrl})`
      : filing.targetName,
    q3CaliforniaResident: 'Yes',
    q4Description: q4,
    q5SupportingMaterials: q5,
    q6ContactedBusiness: 'No / Not applicable',
    q7ContactInfo: q7Lines,
  }
}
