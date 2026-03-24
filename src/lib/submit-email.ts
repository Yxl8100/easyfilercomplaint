/**
 * Email submission for DOJ/ADA complaints
 *
 * DOJ accepts ADA complaints via email to ada.complaint@usdoj.gov
 * with the complaint form attached as a PDF.
 * User receives automatic confirmation reply from DOJ.
 *
 * We use Resend to send the email FROM the platform address
 * with the user as reply-to.
 */

import { Resend } from 'resend'
import { config } from './config'

const resend = new Resend(process.env.RESEND_API_KEY)

interface EmailSubmitResult {
  success: boolean
  messageId?: string
  error?: string
}

export async function submitDojComplaint(
  pdfBuffer: Uint8Array,
  filingData: {
    firstName: string
    lastName: string
    email: string
    phone: string
    targetName: string
    category: string
  }
): Promise<EmailSubmitResult> {
  try {
    const fullName = `${filingData.firstName} ${filingData.lastName}`

    const { data, error } = await resend.emails.send({
      from: 'EasyFilerComplaint <filings@easyfilercomplaint.com>',
      to: [config.dojEmail],
      replyTo: filingData.email,
      subject: `ADA Complaint — ${filingData.targetName} — Filed by ${fullName}`,
      text: [
        `Dear U.S. Department of Justice, Civil Rights Division,`,
        ``,
        `Please find attached a formal complaint under the Americans with Disabilities Act regarding ${filingData.targetName}.`,
        ``,
        `This complaint is being filed on behalf of:`,
        `Name: ${fullName}`,
        `Email: ${filingData.email}`,
        `Phone: ${filingData.phone}`,
        ``,
        `The complete complaint with all details is attached as a PDF document.`,
        ``,
        `Filed via EasyFilerComplaint (easyfilercomplaint.com)`,
        `Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      ].join('\n'),
      attachments: [
        {
          filename: `ADA-Complaint-${filingData.targetName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`,
          content: Buffer.from(pdfBuffer).toString('base64'),
        },
      ],
    })

    if (error) {
      console.error('[DOJ Email] Send failed:', error)
      return { success: false, error: error.message }
    }

    console.log(`[DOJ Email] Complaint sent successfully. Message ID: ${data?.id}`)
    return { success: true, messageId: data?.id }

  } catch (err: unknown) {
    console.error('[DOJ Email] Exception:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
