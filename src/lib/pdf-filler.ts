import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { FilingData } from './filing-state'
import { generateComplaintText } from './complaint-generator'

async function buildComplaintPdf(data: FilingData, agency: string): Promise<Uint8Array> {
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

  const drawText = (text: string, opts?: { bold?: boolean; size?: number; color?: [number, number, number] }) => {
    const f = opts?.bold ? boldFont : font
    const s = opts?.size ?? fontSize
    const c = opts?.color ? rgb(opts.color[0], opts.color[1], opts.color[2]) : rgb(0, 0, 0)
    if (y < margin + lineHeight) {
      page = pdfDoc.addPage([612, 792])
      y = height - margin
    }
    page.drawText(text, { x: margin, y, font: f, size: s, color: c })
    y -= s + 4
  }

  drawText('CONSUMER COMPLAINT', { bold: true, size: 14 })
  y -= 4
  drawText(`Filed via EasyFilerComplaint · ${new Date().toLocaleDateString('en-US')}`, {
    size: 9,
    color: [0.5, 0.5, 0.5],
  })
  y -= 6
  page.drawLine({
    start: { x: margin, y },
    end: { x: 612 - margin, y },
    thickness: 1,
    color: rgb(0, 0, 0),
  })
  y -= 16

  let complaintText = ''
  try {
    complaintText = generateComplaintText(data, agency)
  } catch {
    complaintText = `Complaint regarding: ${data.targetName}\n\n${data.description}`
  }

  const paragraphs = complaintText.split('\n')
  for (const para of paragraphs) {
    if (!para.trim()) {
      y -= lineHeight * 0.5
      continue
    }
    const words = para.split(' ')
    let line = ''
    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(testLine, fontSize) > maxWidth && line) {
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

export async function fillCaAgPdf(data: FilingData): Promise<Uint8Array> {
  return buildComplaintPdf(data, 'ca_ag')
}

export async function fillFdaPdf(data: FilingData): Promise<Uint8Array> {
  return buildComplaintPdf(data, 'fda')
}

export async function fillDojAdaPdf(data: FilingData): Promise<Uint8Array> {
  return buildComplaintPdf(data, 'doj_ada')
}

export async function generateComplaintLetterPdf(data: FilingData, agency: string): Promise<Uint8Array> {
  return buildComplaintPdf(data, agency)
}
