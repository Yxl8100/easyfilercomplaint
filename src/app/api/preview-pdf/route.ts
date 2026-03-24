import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { FilingData } from '@/lib/filing-state'
import { generateComplaintText } from '@/lib/complaint-generator'

async function generateComplaintLetterPdf(data: FilingData, agency: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)

  let page = pdfDoc.addPage([612, 792])
  const { height } = page.getSize()
  const margin = 72
  const fontSize = 11
  const lineHeight = 16
  const maxWidth = 612 - 2 * margin

  let y = height - margin

  // Header
  page.drawText('CONSUMER COMPLAINT', {
    x: margin, y, font: boldFont, size: 14, color: rgb(0, 0, 0),
  })
  y -= 20
  page.drawText(`Filed via EasyFilerComplaint · ${new Date().toLocaleDateString('en-US')}`, {
    x: margin, y, font, size: 9, color: rgb(0.5, 0.5, 0.5),
  })
  y -= 30
  // Divider
  page.drawLine({ start: { x: margin, y }, end: { x: 612 - margin, y }, thickness: 1, color: rgb(0, 0, 0) })
  y -= 20

  let complaintText = ''
  try {
    complaintText = generateComplaintText(data, agency)
  } catch {
    complaintText = `Complaint for ${agency}\n\n${data.description}`
  }

  const lines = complaintText.split('\n')
  for (const rawLine of lines) {
    if (!rawLine.trim()) {
      y -= lineHeight
      if (y < margin) {
        page = pdfDoc.addPage([612, 792])
        y = height - margin
      }
      continue
    }

    // Word wrap
    const words = rawLine.split(' ')
    let line = ''
    for (const word of words) {
      const testLine = line ? line + ' ' + word : word
      const testWidth = font.widthOfTextAtSize(testLine, fontSize)
      if (testWidth > maxWidth && line) {
        if (y < margin + lineHeight) {
          page = pdfDoc.addPage([612, 792])
          y = height - margin
        }
        page.drawText(line, { x: margin, y, font, size: fontSize, color: rgb(0, 0, 0) })
        y -= lineHeight
        line = word
      } else {
        line = testLine
      }
    }
    if (line) {
      if (y < margin + lineHeight) {
        page = pdfDoc.addPage([612, 792])
        y = height - margin
      }
      page.drawText(line, { x: margin, y, font, size: fontSize, color: rgb(0, 0, 0) })
      y -= lineHeight
    }
  }

  return await pdfDoc.save()
}

export async function POST(req: NextRequest) {
  try {
    const { data, agency } = (await req.json()) as { data: FilingData; agency: string }
    const pdfBytes = await generateComplaintLetterPdf(data, agency)

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=complaint-${agency}-${Date.now()}.pdf`,
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
