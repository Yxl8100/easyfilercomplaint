import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl

  const protectedPaths = ['/dashboard', '/file', '/account']
  const publicPaths = ['/account/create']
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path))
  const isPublic = publicPaths.some((path) => pathname.startsWith(path))

  if (isProtected && !isPublic && !req.auth) {
    const signInUrl = new URL('/login', req.url)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
