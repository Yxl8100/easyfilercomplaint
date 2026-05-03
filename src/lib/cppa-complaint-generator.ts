import type { Filing } from '@prisma/client'

export interface CPPAComplaint {
  /** Q1: Checkbox strings (visual instructions only — no copy-paste box for these) */
  q1CheckboxInstructions: string[]
  /** Q2: Business name for copy-paste into CPPA form */
  q2BusinessName: string
  /** Q3: California resident — always Yes (instruction only) */
  q3CaliforniaResident: 'Yes'
  /** Q4: Core complaint narrative ≤2000 chars, no statute citations */
  q4Description: string
  /** Q5: Supporting materials for copy-paste */
  q5SupportingMaterials: string
  /** Q6: Prior contact with business (instruction only) */
  q6ContactedBusiness: 'No / Not applicable'
  /** Q7: Filer contact information for copy-paste */
  q7ContactInfo: string
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Category → CPPA checkbox strings (DESC-03)
// privacy_tracking → 2 checkboxes, video_sharing → 1, accessibility → none (ADA-01)
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

// Extract visit date from categoryFields JSON — NEVER from top-level Filing fields
// (visitMonth/visitYear are NOT Prisma schema columns; they live inside categoryFields JSON)
function buildVisitDate(categoryFields: Record<string, unknown>): string {
  const month = categoryFields?.visitMonth as string | undefined
  const year  = categoryFields?.visitYear  as string | undefined
  if (month && year) {
    const idx = parseInt(month, 10) - 1
    return `${MONTH_NAMES[idx] ?? month} ${year}`
  }
  if (year) return year
  return 'a recent date'
}

// Build Q4 narrative per complaint category
// All three categories need different narrative text; accessibility still needs text for AG PDF body
function buildDescription(filing: Filing, visitDate: string): string {
  const businessRef = filing.targetUrl || filing.targetName
  const userText = filing.description?.trim() ?? ''

  if (filing.category === 'accessibility') {
    const opening = `On or about ${visitDate}, I attempted to use the website ${businessRef}.`
      + ` During my visit, I encountered accessibility barriers that prevented me from`
      + ` accessing the website's content and services.`
    const middle = userText
      ? ` ${userText}.`
      : ` The website lacked adequate support for assistive technology, including screen readers and keyboard navigation.`
    const closing = ` I was unable to fully use the website due to these barriers,`
      + ` which I believe constitute a violation of accessibility standards`
      + ` required to protect individuals with disabilities.`
      + ` I am filing this complaint to request investigation into these barriers.`
    const maxMiddle = 2000 - opening.length - closing.length - 5
    const safeMiddle = middle.length > maxMiddle
      ? middle.slice(0, maxMiddle).trimEnd() + '.'
      : middle
    return (opening + safeMiddle + closing).slice(0, 2000)
  }

  if (filing.category === 'video_sharing' || filing.category === 'video-sharing') {
    const opening = `On or about ${visitDate}, I discovered that the website ${businessRef}`
      + ` shared or distributed my personal video content without my knowledge or consent.`
    const middle = userText
      ? ` ${userText}.`
      + ` I did not authorize the collection, storage, or redistribution of this content.`
      : ` My personal video content was collected and redistributed without my authorization.`
      + ` I did not provide consent for the use of this content.`
    const closing = ` I am filing this complaint because I believe these practices violate my rights`
      + ` as a California consumer and request that the appropriate authority investigate this matter.`
    const maxMiddle = 2000 - opening.length - closing.length - 5
    const safeMiddle = middle.length > maxMiddle
      ? middle.slice(0, maxMiddle).trimEnd() + '.'
      : middle
    return (opening + safeMiddle + closing).slice(0, 2000)
  }

  // Default: privacy_tracking / data-privacy
  const opening = `On or about ${visitDate}, I visited the website ${businessRef}.`
    + ` During my visit, I discovered that the website was collecting my personal information —`
    + ` including my browsing activity, device information, and IP address —`
    + ` and sharing it with third-party advertising companies without my knowledge or consent.`
  const middle = userText
    ? ` ${userText}.`
    : ` The website placed tracking cookies on my device and transmitted my data to advertising networks.`
  const closing = ` I was not given a clear opportunity to opt out of this data collection before it occurred,`
    + ` and the website did not display an adequate privacy notice or "Do Not Sell My Personal Information" link.`
    + ` I am filing this complaint because I believe these practices violate my rights as a California consumer.`
  const maxMiddle = 2000 - opening.length - closing.length - 5
  const safeMiddle = middle.length > maxMiddle
    ? middle.slice(0, maxMiddle).trimEnd() + '.'
    : middle
  return (opening + safeMiddle + closing).slice(0, 2000)
}

export function generateCPPAComplaint(filing: Filing): CPPAComplaint {
  // categoryFields is JSON — NEVER access filing.visitMonth or filing.visitYear directly
  const cf = (filing.categoryFields as Record<string, unknown>) ?? {}
  const visitDate   = buildVisitDate(cf)
  const q4          = buildDescription(filing, visitDate)

  // Q5: fixed string with filing receipt ID
  const receiptId = filing.filingReceiptId ?? filing.id
  const q5 = `I have a screenshot of the website's tracking activity, a record of cookies placed on my device, and a filing receipt from EasyFilerComplaint (Filing ID: ${receiptId}).`

  // Q7: filerInfo stored as JSON on Filing.filerInfo
  const fi = (filing.filerInfo as Record<string, string> | null) ?? {}
  const phone   = fi.phone?.trim()
  const address = fi.address?.trim()
  const q7Lines = [
    `${fi.firstName ?? ''} ${fi.lastName ?? ''}`.trim(),
    fi.email ?? '',
    phone  || null,
    address ? `${address}, ${fi.city ?? ''}, ${fi.state ?? ''} ${fi.zip ?? ''}`.trim() : null,
  ].filter(Boolean).join('\n')

  return {
    q1CheckboxInstructions: CATEGORY_TO_CPPA_CHECKBOXES[filing.category] ?? [],
    q2BusinessName: filing.targetUrl
      ? `${filing.targetName} (${filing.targetUrl})`
      : filing.targetName,
    q3CaliforniaResident:  'Yes',
    q4Description:         q4,
    q5SupportingMaterials: q5,
    q6ContactedBusiness:   'No / Not applicable',
    q7ContactInfo:         q7Lines,
  }
}
