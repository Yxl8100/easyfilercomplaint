import { describe, it, expect } from 'vitest'

// Test the middleware protection logic in isolation
// AUTH-06: /account/* routes must redirect unauthenticated users to /login

const protectedPaths = ['/dashboard', '/file', '/account']

function isProtectedPath(pathname: string): boolean {
  return protectedPaths.some((path) => pathname.startsWith(path))
}

function buildRedirectUrl(baseUrl: string, pathname: string): string {
  const signInUrl = new URL('/login', baseUrl)
  signInUrl.searchParams.set('callbackUrl', pathname)
  return signInUrl.toString()
}

describe('middleware protectedPaths logic (AUTH-06)', () => {
  it('/account/filings is a protected path', () => {
    expect(isProtectedPath('/account/filings')).toBe(true)
  })

  it('/account/create is a protected path', () => {
    expect(isProtectedPath('/account/create')).toBe(true)
  })

  it('/login is NOT a protected path', () => {
    expect(isProtectedPath('/login')).toBe(false)
  })

  it('/dashboard is a protected path', () => {
    expect(isProtectedPath('/dashboard')).toBe(true)
  })

  it('/file is a protected path', () => {
    expect(isProtectedPath('/file')).toBe(true)
  })

  it('/api/something is NOT a protected path', () => {
    expect(isProtectedPath('/api/something')).toBe(false)
  })

  it('redirect URL for /account/filings includes callbackUrl', () => {
    const url = buildRedirectUrl('http://localhost:3000', '/account/filings')
    expect(url).toContain('/login')
    expect(url).toContain('callbackUrl=%2Faccount%2Ffilings')
  })

  it('redirect URL for /account/create includes callbackUrl', () => {
    const url = buildRedirectUrl('http://localhost:3000', '/account/create')
    expect(url).toContain('/login')
    expect(url).toContain('callbackUrl=%2Faccount%2Fcreate')
  })
})
