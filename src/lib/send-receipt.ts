import { Resend } from 'resend'
import { SubmissionResult } from './submit-complaint'

const resend = new Resend(process.env.RESEND_API_KEY)

const AGENCY_NAMES: Record<string, string> = {
  doj_ada: 'U.S. Department of Justice (ADA)',
  ca_ag: 'California Attorney General',
  fda: 'FDA MedWatch',
  fcc: 'Federal Communications Commission',
  ftc: 'Federal Trade Commission',
  cfpb: 'Consumer Financial Protection Bureau',
  epa: 'Environmental Protection Agency',
}

export async function sendFilingReceipt(
  userEmail: string,
  userName: string,
  targetName: string,
  results: SubmissionResult[]
): Promise<void> {
  const autoResults = results.filter((r) => r.method !== 'guided')
  const guidedResults = results.filter((r) => r.method === 'guided')

  const autoSection =
    autoResults.length > 0
      ? [
          `FILED ON YOUR BEHALF:`,
          ...autoResults.map((r) => {
            const name = AGENCY_NAMES[r.agency] || r.agency
            const status = r.success ? '✓ Submitted' : '✗ Failed'
            const method = r.method === 'auto_email' ? 'via email' : 'via fax'
            const hash = r.pdfHash ? `\n   Evidence Hash: ${r.pdfHash}` : ''
            const conf = r.confirmationId ? `\n   Confirmation: ${r.confirmationId}` : ''
            return ` ${status} — ${name} (${method})${conf}${hash}`
          }),
        ].join('\n')
      : ''

  const guidedSection =
    guidedResults.length > 0
      ? [
          `\nREQUIRES YOUR ACTION (Guided Filing):`,
          ...guidedResults.map((r) => {
            const name = AGENCY_NAMES[r.agency] || r.agency
            return ` → ${name} — File at easyfilercomplaint.com/guide/${r.agency}`
          }),
        ].join('\n')
      : ''

  const text = [
    `Dear ${userName},`,
    ``,
    `Thank you for using EasyFilerComplaint. Here is your filing receipt for complaints against ${targetName}.`,
    ``,
    `Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    `Total Agencies: ${results.length}`,
    ``,
    autoSection,
    guidedSection,
    ``,
    `---`,
    `This receipt is your record of filing. Keep it for your records.`,
    `The evidence hashes above are SHA-256 cryptographic fingerprints of the exact documents submitted.`,
    ``,
    `Questions? Visit easyfilercomplaint.com`,
    ``,
    `— EasyFilerComplaint`,
  ]
    .filter(Boolean)
    .join('\n')

  await resend.emails.send({
    from: 'EasyFilerComplaint <filings@easyfilercomplaint.com>',
    to: [userEmail],
    subject: `Filing Receipt — Complaints Against ${targetName}`,
    text,
  })
}
