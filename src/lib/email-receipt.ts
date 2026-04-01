import { Resend } from 'resend'
import { prisma } from '@/lib/prisma'
import { getAgencyName } from '@/lib/agency-directory'
import type { Filing } from '@prisma/client'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface ReceiptEmailParams {
  filingReceiptId: string
  targetName: string
  agencyName: string
  paidAt: Date
  paymentAmount: number
  faxFailed: boolean
}

export function buildReceiptEmailHtml(params: ReceiptEmailParams): string {
  const { filingReceiptId, targetName, agencyName, paidAt, paymentAmount, faxFailed } = params

  const dateFormatted = paidAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const amountFormatted = `$${paymentAmount.toFixed(2)}`

  const faxNote = faxFailed
    ? `<p style="margin: 16px 0; padding: 12px 16px; background-color: #fff3cd; border-left: 4px solid #ffc107; color: #856404; font-size: 14px;">
        Note: Fax delivery encountered an issue. Our team has been notified and will follow up.
      </p>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Filing Receipt — ${filingReceiptId}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, Helvetica, sans-serif; color: #222222;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 4px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 24px 32px;">
              <p style="margin: 0; font-size: 20px; font-weight: bold; color: #ffffff; letter-spacing: 0.5px;">EasyFilerComplaint</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: bold; color: #1a1a1a;">Filing Receipt</h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #666666;">Thank you for your submission. Your complaint has been filed.</p>

              ${faxNote}

              <!-- Receipt Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e5e5; border-radius: 4px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #e5e5e5; background-color: #fafafa;">
                    <p style="margin: 0; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">Receipt ID</p>
                    <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: bold; color: #1a1a1a; font-family: monospace;">${filingReceiptId}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #e5e5e5;">
                    <p style="margin: 0; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">Business Named</p>
                    <p style="margin: 4px 0 0 0; font-size: 15px; color: #1a1a1a;">${targetName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #e5e5e5;">
                    <p style="margin: 0; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">Filed With</p>
                    <p style="margin: 4px 0 0 0; font-size: 15px; color: #1a1a1a;">${agencyName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #e5e5e5;">
                    <p style="margin: 0; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">Date Filed</p>
                    <p style="margin: 4px 0 0 0; font-size: 15px; color: #1a1a1a;">${dateFormatted}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px;">Amount Paid</p>
                    <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: bold; color: #1a1a1a;">${amountFormatted}</p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px 0; font-size: 14px; color: #444444;">
                Your complaint PDF is attached to this email. Please save it for your records.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid #e5e5e5; background-color: #fafafa;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #888888;">This email is your filing receipt. Keep it for your records.</p>
              <p style="margin: 0; font-size: 12px; color: #888888;">Questions? Visit <a href="https://www.easyfilercomplaint.com" style="color: #555555;">easyfilercomplaint.com</a></p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendFilingReceiptEmail(
  filing: Filing,
  pdfBytes: Uint8Array,
  faxFailed: boolean
): Promise<void> {
  const filerInfo = filing.filerInfo as Record<string, string> | null
  const consumerEmail = filerInfo?.email
  if (!filing.filingReceiptId) throw new Error(`Filing ${filing.id} has no filingReceiptId`)
  if (!consumerEmail) throw new Error(`Filing ${filing.id} has no consumer email in filerInfo`)

  const html = buildReceiptEmailHtml({
    filingReceiptId: filing.filingReceiptId,
    targetName: filing.targetName,
    agencyName: getAgencyName('ca_ag'),
    paidAt: filing.paidAt ?? new Date(),
    paymentAmount: Number(filing.paymentAmount ?? 0),
    faxFailed,
  })

  await resend.emails.send({
    from: 'EasyFilerComplaint <noreply@easyfilercomplaint.com>',
    to: [consumerEmail],
    subject: `Your EasyFilerComplaint Filing Receipt — ${filing.filingReceiptId}`,
    html,
    attachments: [
      {
        filename: `EFC_Filing_${filing.filingReceiptId}.pdf`,
        content: Buffer.from(pdfBytes),
        contentType: 'application/pdf',
      },
    ],
  })

  await prisma.filing.update({
    where: { id: filing.id },
    data: { receiptEmailSentAt: new Date() },
  })

  console.log(`[email] Receipt email sent to ${consumerEmail} for filing ${filing.filingReceiptId}`)
}
