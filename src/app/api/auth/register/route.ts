import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const { name, email, password } = body

  if (!email || !password || password.length < 8) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'email_taken' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { email, name: name || null, passwordHash },
  })

  // Link current filing + all prior same-email filings (AUTH-03)
  await prisma.filing.updateMany({
    where: { filerEmail: email, userId: null },
    data: { userId: user.id },
  })

  return NextResponse.json({ userId: user.id }, { status: 201 })
}
