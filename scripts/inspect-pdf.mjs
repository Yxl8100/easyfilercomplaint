import { PDFDocument } from 'pdf-lib'
import fs from 'fs'

const pdfPath = process.argv[2]
if (!pdfPath) {
  console.log('Usage: node scripts/inspect-pdf.mjs <path-to-pdf>')
  process.exit(1)
}

if (!fs.existsSync(pdfPath)) {
  console.log(`File not found: ${pdfPath}`)
  process.exit(1)
}

const pdfBytes = fs.readFileSync(pdfPath)
try {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
  const form = pdfDoc.getForm()
  const fields = form.getFields()

  console.log(`\nPDF: ${pdfPath}`)
  console.log(`Pages: ${pdfDoc.getPageCount()}`)
  console.log(`Total fields: ${fields.length}\n`)

  if (fields.length === 0) {
    console.log('No fillable form fields found in this PDF.')
  } else {
    fields.forEach((field) => {
      const name = field.getName()
      const type = field.constructor.name
      console.log(`  Field: "${name}" (${type})`)
    })
  }
} catch (err) {
  console.log(`Error loading PDF: ${err.message}`)
}
