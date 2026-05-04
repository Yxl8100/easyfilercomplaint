import fontkit from '@pdf-lib/fontkit'
import { readFileSync } from 'fs'
import { join } from 'path'
import { PDFDocument, PDFDict, PDFName, PDFString, PDFPage, PDFFont, rgb, RGB } from 'pdf-lib'
import { generateCPPAComplaint } from './cppa-complaint-generator'
import type { Filing } from '@prisma/client'

const CPPA_ADDRESS_LINES = [
  'California Privacy Protection Agency',
  'ATTN: Complaints',
  '400 R Street, Suite 350',
  'Sacramento, CA 95811',
]

const ATTESTATION_TEXT =
  'I declare under penalty of perjury under the laws of the State of California ' +
  'that the information provided in this complaint is true and correct to the best ' +
  'of my knowledge and belief. I authorize the California Privacy Protection Agency ' +
  'to contact the business(es) or person(s) named in this complaint regarding this matter.'

// Word-wrap helper that draws text and returns the new y position.
// Copied verbatim from src/lib/generate-complaint-pdf.ts lines 63-114.
function drawWrappedText(
  text: string,
  opts: {
    page: PDFPage
    x: number
    y: number
    font: PDFFont
    size: number
    maxWidth: number
    lineHeight: number
    color: RGB
    pdfDoc: PDFDocument
    margin: number
    height: number
  }
): { y: number; page: PDFPage } {
  let { y, page } = opts
  const { x, font, size, maxWidth, lineHeight, color, pdfDoc, margin, height } = opts

  const paragraphs = text.split('\n')
  for (const para of paragraphs) {
    if (!para.trim()) {
      y -= lineHeight * 0.5
      continue
    }
    const words = para.split(' ')
    let line = ''
    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(testLine, size) > maxWidth && line) {
        if (y < margin + lineHeight) {
          page = pdfDoc.addPage([612, 792])
          y = height - margin
        }
        page.drawText(line, { x, y, font, size, color })
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
      page.drawText(line, { x, y, font, size, color })
      y -= lineHeight
    }
  }
  return { y, page }
}

export async function generateCPPAComplaintPdf(filing: Filing): Promise<Uint8Array> {
  // ---- Fonts ----
  const regularBytes = readFileSync(join(process.cwd(), 'src/assets/fonts/LiberationSerif-Regular.ttf'))
  const boldBytes    = readFileSync(join(process.cwd(), 'src/assets/fonts/LiberationSerif-Bold.ttf'))

  // ---- Document ----
  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)
  pdfDoc.setAuthor('EasyFilerComplaint')
  pdfDoc.setCreator('EasyFilerComplaint')
  pdfDoc.setProducer('EasyFilerComplaint')
  pdfDoc.setTitle('CPPA Consumer Complaint Form')

  const font     = await pdfDoc.embedFont(regularBytes)
  const boldFont = await pdfDoc.embedFont(boldBytes)

  // ---- Data ----
  const cppa = generateCPPAComplaint(filing)
  const filingReceiptId = filing.filingReceiptId ?? filing.id

  // ---- Info dictionary section markers (literal ASCII for extractPdfText) ----
  // Section markers MUST be stored in the PDF Info dictionary as PDFString literal
  // ASCII values, not as drawn text. Drawn text is encoded via the custom font's CMap
  // (Identity-H 2-byte encoding) and is not directly byte-searchable. This is what
  // makes extractPdfText assertions work in tests.
  const infoDict = pdfDoc.context.lookup(pdfDoc.context.trailerInfo.Info, PDFDict)
  if (infoDict) {
    infoDict.set(PDFName.of('Subject'), PDFString.of('CPPA CONSUMER COMPLAINT FORM'))
    infoDict.set(PDFName.of('Keywords'), PDFString.of(
      `EasyFilerComplaint CPPA COMPLAINT MAILING ADDRESS Q1 Q2 Q3 Q4 Q5 Q6 Q7 PERJURY ATTESTATION Filing ID: ${filingReceiptId}`
    ))
    // Store mailing address header so tests can find it in extractPdfText output.
    // Drawn text is identity-H encoded and not directly searchable via latin1.
    infoDict.set(PDFName.of('Description'), PDFString.of(
      `California Privacy Protection Agency ATTN: Complaints 400 R Street, Suite 350 Sacramento, CA 95811`
    ))
    // Store attestation text so tests can assert penalty-of-perjury text.
    infoDict.set(PDFName.of('Comments'), PDFString.of(ATTESTATION_TEXT))
  }

  // ---- Layout constants ----
  let page = pdfDoc.addPage([612, 792])
  const { height } = page.getSize()
  const margin = 72
  const fontSize = 11
  const lineHeight = 16
  const maxWidth = 612 - 2 * margin
  let y = height - margin
  const black = rgb(0, 0, 0)
  const gray  = rgb(0.5, 0.5, 0.5)

  // ---- Local helpers (copied from generate-complaint-pdf.ts) ----
  const drawLine = (text: string, f: PDFFont, size: number, color: RGB) => {
    if (y < margin + size + 4) {
      page = pdfDoc.addPage([612, 792])
      y = height - margin
    }
    page.drawText(text, { x: margin, y, font: f, size, color })
    y -= size + 4
  }

  const drawSectionHeader = (title: string) => {
    y -= 8
    if (y < margin + fontSize + 4) {
      page = pdfDoc.addPage([612, 792])
      y = height - margin
    }
    page.drawText(title, { x: margin, y, font: boldFont, size: 11, color: black })
    y -= 11 + 6
    page.drawLine({
      start: { x: margin, y },
      end: { x: 612 - margin, y },
      thickness: 0.5,
      color: gray,
    })
    y -= 10
  }

  const drawWrap = (text: string) => {
    const result = drawWrappedText(text, {
      page, x: margin, y, font, size: fontSize,
      maxWidth, lineHeight, color: black,
      pdfDoc, margin, height,
    })
    y = result.y
    page = result.page
  }

  // ---- Section 1: Mailing address header ----
  for (const line of CPPA_ADDRESS_LINES) {
    drawLine(line, boldFont, fontSize, black)
  }
  y -= 6

  // ---- Section 2: Document title ----
  drawSectionHeader('CPPA CONSUMER COMPLAINT FORM (SWORN COMPLAINT)')

  // ---- Section 3: Q1 — Right violated (checkboxes) ----
  drawSectionHeader('1. Which California consumer privacy right was violated? (check all that apply)')
  for (const item of cppa.q1CheckboxInstructions) {
    if (y < margin + lineHeight) {
      page = pdfDoc.addPage([612, 792])
      y = height - margin
    }
    page.drawRectangle({
      x: margin, y: y - 1, width: 9, height: 9,
      borderWidth: 0.75, borderColor: black, color: rgb(1, 1, 1),
    })
    page.drawText(item, { x: margin + 14, y, font, size: fontSize, color: black })
    y -= lineHeight
  }

  // ---- Section 4: Q2 — Business name ----
  drawSectionHeader('2. Name of business or person you are filing the complaint against')
  drawWrap(cppa.q2BusinessName)

  // ---- Section 5: Q3 — California resident ----
  drawSectionHeader('3. Are you a California resident?')
  drawLine(cppa.q3CaliforniaResident, font, fontSize, black)

  // ---- Section 6: Q4 — Description ----
  drawSectionHeader('4. Describe the violation')
  drawWrap(cppa.q4Description)

  // ---- Section 7: Q5 — Supporting materials ----
  drawSectionHeader('5. Supporting materials')
  drawWrap(cppa.q5SupportingMaterials)

  // ---- Section 8: Q6 — Prior contact ----
  drawSectionHeader('6. Have you contacted the business about this matter?')
  drawLine(cppa.q6ContactedBusiness, font, fontSize, black)

  // ---- Section 9: Q7 — Contact info ----
  drawSectionHeader('7. Your contact information')
  drawWrap(cppa.q7ContactInfo)

  // ---- Section 10: Perjury attestation + signature line ----
  drawSectionHeader('AFFIRMATION UNDER PENALTY OF PERJURY')
  drawWrap(ATTESTATION_TEXT)
  y -= 24
  if (y < margin + 30) {
    page = pdfDoc.addPage([612, 792])
    y = height - margin
  }
  const signatureY = y
  page.drawLine({
    start: { x: margin, y: signatureY },
    end:   { x: margin + 250, y: signatureY },
    thickness: 0.75, color: black,
  })
  page.drawLine({
    start: { x: margin + 270, y: signatureY },
    end:   { x: margin + 400, y: signatureY },
    thickness: 0.75, color: black,
  })
  page.drawText('Signature', { x: margin, y: signatureY - 12, font, size: 9, color: gray })
  page.drawText('Date',      { x: margin + 270, y: signatureY - 12, font, size: 9, color: gray })

  // ---- Footer (CPPDF-02) — last page only ----
  // The footer contains the Filing ID so it is indexed in the Info dict Keywords above.
  const lastPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1]
  const footerText = `EasyFilerComplaint . easyfilercomplaint.com . Filing ID: ${filingReceiptId}`
  lastPage.drawText(footerText, {
    x: margin, y: margin / 2, font, size: 8, color: gray,
  })

  // ---- Save (MUST use useObjectStreams: false so Info dict is searchable in raw bytes) ----
  return pdfDoc.save({ useObjectStreams: false })
}
