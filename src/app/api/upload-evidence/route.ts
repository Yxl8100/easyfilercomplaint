import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'

export async function POST(request: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Evidence upload unavailable in this environment' },
      { status: 503 }
    )
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Validate size -- 5MB = 5 * 1024 * 1024 bytes
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File exceeds 5 MB' }, { status: 400 })
  }

  // Validate MIME type
  const allowed = ['application/pdf', 'image/png', 'image/jpeg']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  }

  // Sanitize filename
  const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')

  try {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const blob = await put(
      `evidence/tmp/${crypto.randomUUID()}/${filename}`,
      buffer,
      { access: 'private', contentType: file.type, addRandomSuffix: false }
    )

    return NextResponse.json({ url: blob.url, filename })
  } catch (err) {
    console.error('[/api/upload-evidence] Error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
