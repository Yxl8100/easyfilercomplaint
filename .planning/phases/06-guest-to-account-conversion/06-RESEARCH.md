# Phase 6: Guest-to-Account Conversion - Research

**Researched:** 2026-04-01
**Domain:** NextAuth v5 Credentials provider, bcrypt password hashing, JWT session strategy, account-filing linkage, Next.js route protection
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Post-filing account creation form (name pre-filled, email read-only, password + confirm) | Server Action at `/api/register` — reads filingId from query param, pre-fills email from Filing.filerInfo |
| AUTH-02 | Account creation hashes password with bcrypt | bcryptjs 3.0.3 — pure JS, no native addon, compatible with Next.js edge and Vercel |
| AUTH-03 | Account creation links current filing and all prior same-email filings to new user | `prisma.filing.updateMany({ where: { filerEmail: email, userId: null }, data: { userId: newUser.id } })` |
| AUTH-04 | Login page at /login with email + password | New `/login` page using NextAuth v5 `signIn('credentials', ...)` via Server Action |
| AUTH-05 | Authenticated session stored as JWT in httpOnly cookie | Requires `session: { strategy: 'jwt' }` in auth.ts — NextAuth v5 manages the httpOnly cookie automatically |
| AUTH-06 | /account/* routes protected by middleware (redirect to /login if unauthenticated) | Extend existing `src/middleware.ts` to add `/account` to protectedPaths array |
| AUTH-07 | Filing history page at /account/filings shows all user filings with PDF download links | Server component at `/account/filings/page.tsx` — queries `prisma.filing.findMany({ where: { userId: session.user.id } })` |
</phase_requirements>

---

## Summary

Phase 6 adds email+password account creation and login on top of the existing NextAuth v5 setup. The project already has NextAuth v5 (beta.30) installed with `PrismaAdapter`, Google OAuth, and Resend magic-link providers. The schema already has `User.passwordHash String?` and `Filing.userId String?` — both fields were added in Phase 1 with this phase in mind.

The central challenge is that the existing `auth.ts` uses `PrismaAdapter`, which sets the default session strategy to `database`. Adding a `Credentials` provider requires explicitly setting `session: { strategy: 'jwt' }` in `auth.ts` — this is a well-documented NextAuth v5 requirement and is the only schema-level change needed to auth configuration. The `Session` and `VerificationToken` tables in Prisma will become unused for JWT-only users but cause no errors.

The guest-to-account linking logic (AUTH-03) is a Prisma `updateMany` call that sets `userId` on all prior filings matching the new user's email. The email field for matching must come from `Filing.filerInfo` (a `Json?` column storing filer PII, added in Phase 4). A dedicated `filerEmail` column does not exist; the planner must account for extracting email from `filerInfo` JSON or querying by a separate approach.

**Primary recommendation:** Add `Credentials` provider to existing auth.ts with `session: { strategy: 'jwt' }`, use bcryptjs for hashing, extend middleware protectedPaths to include `/account`, and build three new pages: `/account/create`, `/login`, `/account/filings`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-auth | 5.0.0-beta.30 (installed) | Authentication framework, session management | Already installed; Credentials provider built-in |
| @auth/prisma-adapter | 2.11.1 (installed) | Bridges NextAuth to Prisma User/Account/Session models | Already installed and wired |
| bcryptjs | 3.0.3 (registry latest) | Password hashing — pure JS, zero native deps | No native addon = no build issues on Vercel; works in Edge runtime |
| @types/bcryptjs | 3.0.0 (registry latest) | TypeScript types for bcryptjs | Same package family |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @auth/core | 0.41.1 (installed transitively) | `getToken()` for reading JWT in route handlers | When middleware or API route needs the raw JWT payload |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| bcryptjs | bcrypt (native) | bcrypt is faster but requires native addon; Vercel build can fail — stick with bcryptjs |
| bcryptjs | argon2 | argon2 is stronger but requires native addon via node-argon2 — same Vercel risk |
| NextAuth Credentials | Custom JWT with jose | Much more code, re-implements what NextAuth already provides — don't hand-roll |

**Installation:**
```bash
npm install bcryptjs @types/bcryptjs
```

**Version verification:**
```bash
npm view bcryptjs version   # 3.0.3 confirmed 2026-04-01
npm view @types/bcryptjs version  # 3.0.0 confirmed 2026-04-01
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── account/
│   │   ├── create/
│   │   │   └── page.tsx          # Account creation form (AUTH-01)
│   │   └── filings/
│   │       └── page.tsx          # Filing history page (AUTH-07)
│   ├── login/
│   │   └── page.tsx              # Login page (AUTH-04)
│   └── api/
│       └── auth/
│           └── register/
│               └── route.ts      # POST handler for account creation (AUTH-02, AUTH-03)
├── lib/
│   └── auth.ts                   # Add Credentials provider + session jwt strategy (AUTH-05)
└── middleware.ts                  # Add /account to protectedPaths (AUTH-06)
```

### Pattern 1: Adding Credentials Provider to Existing auth.ts

**What:** Extend the existing auth.ts with a Credentials provider and force JWT session strategy. The existing Google + Resend providers continue to work unchanged.

**When to use:** Whenever mixing Credentials with an adapter-backed auth config.

**Critical:** `session: { strategy: 'jwt' }` is mandatory. Without it, NextAuth defaults to `database` sessions when an adapter is present, and Credentials sign-in silently fails to create a session record. This is documented in the NextAuth v5 source and confirmed in GitHub discussion #12848.

```typescript
// Source: https://authjs.dev/getting-started/authentication/credentials
// src/lib/auth.ts (modified)
import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import Resend from 'next-auth/providers/resend'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },   // REQUIRED when using Credentials + adapter
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })
        if (!user?.passwordHash) return null
        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!valid) return null
        return { id: user.id, email: user.email, name: user.name }
      },
    }),
    Resend({ from: 'EasyFilerComplaint <noreply@easyfilercomplaint.com>' }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',           // AUTH-04 — new /login route
    verifyRequest: '/auth/verify',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})
```

**Note on `pages.signIn`:** The existing signin page at `/auth/signin` uses Google + magic-link. After adding Credentials, the canonical sign-in route becomes `/login`. The old `/auth/signin` page can stay but is no longer the default redirect target. Either keep both or consolidate — keeping both is simpler.

### Pattern 2: Account Creation API Route (AUTH-02 + AUTH-03)

**What:** POST `/api/auth/register` — validate inputs, hash password, create User, link filings.

**When to use:** Standard server-side registration pattern. Do NOT use a Server Action here — rate limiting and detailed error responses are easier in a Route Handler.

```typescript
// src/app/api/auth/register/route.ts
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { name, email, password, filingId } = await request.json()

  // Validate inputs
  if (!email || !password || password.length < 8) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  // Check email not already registered
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'email_taken' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: { email, name, passwordHash },
  })

  // Link all same-email filings (AUTH-03)
  // filerInfo is Json? — must filter by email stored inside JSON
  // Option A: add a filerEmail column (new migration)
  // Option B: updateMany where filingId matches then separate query for prior filings by email
  // --> See "Open Questions" section for the filerInfo.email extraction problem
  await prisma.filing.updateMany({
    where: {
      userId: null,
      // filerInfo JSON contains { email } — cannot filter JSON in Prisma without raw SQL
      // The plan must decide: raw query vs. filerEmail column vs. filingId-only link
    },
    data: { userId: user.id },
  })

  return NextResponse.json({ userId: user.id }, { status: 201 })
}
```

### Pattern 3: Middleware Protection (AUTH-06)

**What:** Extend the existing middleware.ts to add `/account` to protectedPaths. The existing `auth()` wrapper from `@/lib/auth` is already wired.

```typescript
// src/middleware.ts (modification only)
const protectedPaths = ['/dashboard', '/file', '/account']  // add '/account'
```

Redirect target must change from `/auth/signin` to `/login` to match the new pages.signIn config.

### Pattern 4: Filing History Page (AUTH-07)

**What:** Server component reads session, queries filings, renders list with PDF links.

```typescript
// src/app/account/filings/page.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export default async function FilingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const filings = await prisma.filing.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      filingReceiptId: true,
      targetName: true,
      status: true,
      paidAt: true,
      complaintPdfUrl: true,
    },
  })

  // render filings table with complaintPdfUrl download links
}
```

### Anti-Patterns to Avoid

- **Using `database` session strategy with Credentials:** Silent failure — sessions never persist. Always set `session: { strategy: 'jwt' }` when Credentials provider is present.
- **Using `bcrypt` (native) instead of `bcryptjs`:** Native bcrypt can fail Vercel builds if native bindings aren't available — use bcryptjs (pure JS).
- **Trusting the filingId alone for AUTH-03 linking:** A consumer may have filed before via a different browser session. All same-email prior filings must be linked, not just the current one.
- **Storing passwords in plaintext or with MD5/SHA1:** Always bcrypt with cost factor >= 12.
- **Re-using `/auth/signin` as the new login page:** The existing page only has Google + magic-link. Adding password login there is possible but mixing two patterns creates UX confusion. Separate `/login` page is cleaner.
- **Fetching Vercel Blob private URLs directly on the filing history page:** `complaintPdfUrl` is a private Blob URL that requires auth — do not expose it as a direct `<a href>`. A signed-URL proxy or redirect-on-click approach is needed (see Open Questions).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session management, JWT signing, cookie rotation | Custom JWT middleware | NextAuth v5 `session: { strategy: 'jwt' }` | JWT signing, expiry, httpOnly cookie, CSRF — all handled |
| Password hashing | Custom hash function | bcryptjs | Bcrypt salt rounds, rainbow table resistance, constant-time compare |
| OAuth callback handling | Custom OAuth flow | NextAuth Google provider (already installed) | OAuth 2.0 PKCE, token exchange, user upsert — too complex to hand-roll |
| Route protection | Custom auth checks in every page | Next.js middleware + `auth()` | Single enforcement point; app-level checks are easily forgotten |

**Key insight:** NextAuth v5 already handles JWT encoding, cookie attributes (`httpOnly`, `secure`, `sameSite`), session expiry, and CSRF. The only custom code needed is the `authorize()` callback and the registration API route.

---

## Common Pitfalls

### Pitfall 1: Credentials + PrismaAdapter = database strategy by default

**What goes wrong:** Developer adds Credentials provider, tests sign-in, gets redirect to success URL, but `auth()` returns null in server components. No error is thrown.

**Why it happens:** When an adapter is present, NextAuth defaults to `strategy: 'database'`. Credentials sign-ins create a JWT internally but don't persist a database session record, so subsequent `auth()` calls find nothing.

**How to avoid:** Always add `session: { strategy: 'jwt' }` when combining Credentials with PrismaAdapter.

**Warning signs:** `auth()` returns null after successful `signIn('credentials', ...)`, but OAuth sign-in works fine.

### Pitfall 2: AUTH-03 filerInfo JSON filtering

**What goes wrong:** `prisma.filing.updateMany({ where: { filerEmail: email } })` fails because there is no `filerEmail` column — email is nested in the `filerInfo Json?` column.

**Why it happens:** Phase 4 stored filer PII as a JSON blob (`filerInfo`) to avoid schema changes at the time. There is no dedicated `filerEmail` indexed column.

**How to avoid:** Two valid approaches:
  - Option A (preferred): Add a `filerEmail String?` column to Filing via a new Prisma migration, backfill from `filerInfo`, use that column in `updateMany`. Clean, indexed, type-safe.
  - Option B: Use Prisma raw SQL `$queryRaw` / `$executeRaw` with `filerInfo->>'email'` (PostgreSQL JSON operator). Works but bypasses Prisma type safety.

**Warning signs:** TypeScript error on `prisma.filing.updateMany({ where: { filerEmail: ... } })` — field does not exist.

### Pitfall 3: signIn page redirect mismatch

**What goes wrong:** Middleware redirects unauthenticated `/account/*` requests to `/auth/signin` (old default), but the new password login form is at `/login`.

**Why it happens:** The middleware has a hardcoded `signInUrl = new URL('/auth/signin', req.url)`. Changing `pages.signIn` in auth.ts does not automatically update middleware.

**How to avoid:** When changing `pages.signIn` to `/login`, also update the redirect in `middleware.ts` to `new URL('/login', req.url)`.

### Pitfall 4: Private Blob URLs on filing history page

**What goes wrong:** `complaintPdfUrl` is a private Vercel Blob URL (set with `access: 'private'` in Phase 3). Rendering it as a direct `<a href>` returns 401 for the consumer.

**Why it happens:** Vercel Blob private URLs are not publicly accessible; they require a signed download token.

**How to avoid:** Use `@vercel/blob`'s `createReadStream` / `head` / `copy` or generate a signed download URL via the Vercel Blob API before rendering the link. Alternatively, proxy through a Next.js API route that verifies session before streaming the blob.

**Warning signs:** PDF download link clicks produce 401 or redirect to Vercel Blob login page.

### Pitfall 5: Account creation form — email pre-fill requires filingId in URL

**What goes wrong:** The `/account/create` page has no way to pre-fill the consumer's email without knowing the Filing record.

**Why it happens:** The success page links to `/account/create` with no query parameter — `href="/account/create"`.

**How to avoid:** Update the success page CTA to pass `filingId` as a query param: `/account/create?filingId=xxx`. The create page server component reads `searchParams.filingId`, fetches `Filing.filerInfo`, extracts email, and pre-fills the form.

---

## Code Examples

### bcryptjs hash and compare

```typescript
// Source: https://github.com/dcodeIO/bcrypt.js#readme
import bcrypt from 'bcryptjs'

// Hash on registration
const passwordHash = await bcrypt.hash(password, 12)  // cost factor 12

// Compare on login
const valid = await bcrypt.compare(candidatePassword, storedHash)
// Returns true/false — never throws on mismatch
```

### Reading JWT session in a server component

```typescript
// Source: NextAuth v5 — auth() from @/lib/auth
import { auth } from '@/lib/auth'

export default async function Page() {
  const session = await auth()
  // session.user.id is available because we set token.id in jwt callback
  // and session.user.id = token.id in session callback
}
```

### Signing in with Credentials from a Client Component form

```typescript
// Source: https://authjs.dev/getting-started/authentication/credentials
import { signIn } from 'next-auth/react'

const result = await signIn('credentials', {
  email,
  password,
  redirect: false,    // handle redirect manually
})
if (result?.error) {
  // show error
} else {
  router.push('/account/filings')
}
```

### Signing in from a Server Action (alternative to client)

```typescript
// Source: https://authjs.dev/getting-started/authentication/credentials
'use server'
import { signIn } from '@/lib/auth'

export async function loginAction(formData: FormData) {
  await signIn('credentials', {
    email: formData.get('email'),
    password: formData.get('password'),
    redirectTo: '/account/filings',
  })
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| nextauth v4 — separate middleware import | nextauth v5 — `auth()` wraps middleware directly | v5 beta | middleware.ts already uses v5 pattern; no change needed |
| nextauth v4 — `getSession()` in pages | nextauth v5 — `auth()` server component call | v5 beta | All new pages use `auth()` pattern consistently |
| Separate bcrypt (native addon) | bcryptjs (pure JS) | Project convention from day 1 | No native build dependency, works on Vercel |

**Deprecated/outdated:**
- `getServerSession(authOptions)` from next-auth v4: replaced by `auth()` from next-auth v5 — do not use the v4 pattern anywhere in this codebase.
- `withAuth` middleware from next-auth v4: replaced by `auth((req) => ...)` wrapper pattern — already used in middleware.ts.

---

## Open Questions

1. **AUTH-03: How to query filings by email when email is in filerInfo JSON**
   - What we know: `Filing.filerInfo` is a `Json?` column containing `{ email, firstName, lastName, ... }`. There is no `filerEmail String?` column. PostgreSQL supports `filerInfo->>'email'` JSON extraction in raw SQL.
   - What's unclear: Should Phase 6 add a `filerEmail` migration (cleanest) or use raw SQL (no migration)? A migration requires `prisma migrate dev` / `prisma db push`.
   - Recommendation: Add `filerEmail String?` column via migration and backfill via a script or migration step. This makes AUTH-03 a simple `updateMany` and gives a useful indexed column for future queries.

2. **Private Blob URL download on /account/filings**
   - What we know: `complaintPdfUrl` values are private Vercel Blob URLs (Phase 3 decision: `access: 'private'`). A direct `<a href>` will 401.
   - What's unclear: Does Vercel Blob SDK expose a `generatePresignedUrl` or signed download helper for private blobs?
   - Recommendation: Create a Next.js API route `GET /api/filings/[id]/pdf` that verifies session and streams/redirects to the Blob URL via `@vercel/blob`'s `head()` + `fetch`. This avoids exposing private Blob credentials to the client.

3. **Session strategy change impact on existing Google/Resend users**
   - What we know: Switching to `session: { strategy: 'jwt' }` means new sessions are JWTs, not database Session rows. Existing database sessions (if any) will be ignored — users will need to re-authenticate.
   - What's unclear: Are there any active database sessions in the Neon database from prior Google/Resend sign-ins during development?
   - Recommendation: Since this is still pre-launch (Stripe in test mode, no real users), this is safe. Document that the session strategy change invalidates all existing database sessions.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|---------|
| bcryptjs | AUTH-02 password hashing | Not installed | — | None — must install |
| @types/bcryptjs | AUTH-02 TypeScript types | Not installed | — | None — must install |
| next-auth Credentials provider | AUTH-04, AUTH-05 | Available (installed) | 5.0.0-beta.30 | — |
| PrismaAdapter + User model | AUTH-02, AUTH-03 | Available (installed) | 2.11.1 | — |
| Vercel Blob (`@vercel/blob`) | AUTH-07 PDF download | Available (installed) | 2.3.2 | — |

**Missing dependencies with no fallback:**
- `bcryptjs` and `@types/bcryptjs` — required for AUTH-02; `npm install bcryptjs @types/bcryptjs`

**Missing dependencies with fallback:**
- None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npx vitest run --reporter=verbose 2>&1` |
| Full suite command | `npx vitest run 2>&1` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Account creation form renders with email pre-filled | unit | `npx vitest run src/app/account/create/page.test.tsx` | No — Wave 0 |
| AUTH-02 | bcrypt hash + compare roundtrip | unit | `npx vitest run src/lib/__tests__/register.test.ts` | No — Wave 0 |
| AUTH-03 | updateMany links prior same-email filings to new user | unit | `npx vitest run src/lib/__tests__/register.test.ts` | No — Wave 0 |
| AUTH-04 | Login page renders email + password fields | unit | `npx vitest run src/app/login/page.test.tsx` | No — Wave 0 |
| AUTH-05 | JWT session strategy — session.user.id populated after sign-in | integration | Manual / E2E only (NextAuth JWT internals are opaque to unit tests) | Manual-only |
| AUTH-06 | Middleware redirects unauthenticated /account/* to /login | unit | `npx vitest run src/middleware.test.ts` | No — Wave 0 |
| AUTH-07 | Filing history page renders receipt IDs and PDF download links | unit | `npx vitest run src/app/account/filings/page.test.tsx` | No — Wave 0 |

**AUTH-05 manual-only justification:** NextAuth v5 JWT session creation goes through the framework's internal cookie layer. Unit testing the full JWT round-trip requires a full HTTP server. Validate AUTH-05 manually via browser DevTools (check `next-auth.session-token` cookie is `httpOnly`).

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose 2>&1`
- **Per wave merge:** `npx vitest run 2>&1`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/__tests__/register.test.ts` — covers AUTH-02, AUTH-03 (bcrypt + filing linkage)
- [ ] `src/app/account/create/page.test.tsx` — covers AUTH-01 (form render, email pre-fill)
- [ ] `src/app/login/page.test.tsx` — covers AUTH-04 (login form fields)
- [ ] `src/middleware.test.ts` — covers AUTH-06 (redirect behavior)
- [ ] `src/app/account/filings/page.test.tsx` — covers AUTH-07 (filing history render)
- [ ] Framework install: `npm install bcryptjs @types/bcryptjs`

---

## Project Constraints (from CLAUDE.md)

No project-level `CLAUDE.md` exists at `./CLAUDE.md`. The global `~/.claude/CLAUDE.md` defines RTK (Rust Token Killer) command prefixing for terminal output compression — this is a tooling convention for Claude Code sessions, not a project coding constraint. No project-level directives to enforce.

---

## Sources

### Primary (HIGH confidence)

- Next.js 14 App Router — official docs verified via installed packages
- NextAuth v5 Credentials provider — `node_modules/@auth/core/providers/credentials.d.ts` (inline type docs)
- NextAuth v5 JWT module — `node_modules/@auth/core/jwt.js` exports: `decode`, `encode`, `getToken`
- Project source code: `src/lib/auth.ts`, `src/middleware.ts`, `prisma/schema.prisma`, `src/app/filing/[id]/success/page.tsx`

### Secondary (MEDIUM confidence)

- [NextAuth v5 Credentials authentication guide](https://authjs.dev/getting-started/authentication/credentials) — verified via WebFetch
- [NextAuth v5 Prisma Adapter docs](https://authjs.dev/getting-started/adapters/prisma) — confirmed JWT strategy note
- [GitHub Discussion #12848 — Credentials + database session returning null](https://github.com/nextauthjs/next-auth/discussions/12848) — confirms JWT strategy requirement
- bcryptjs 3.0.3 — `npm view bcryptjs version` confirmed 2026-04-01

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified via npm registry and installed node_modules
- Architecture: HIGH — patterns derived from existing codebase + NextAuth v5 type definitions + official docs
- Pitfalls: HIGH — Credentials+adapter JWT pitfall confirmed by GitHub discussion and NextAuth docs; filerInfo pitfall confirmed by schema inspection

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (next-auth beta.30 is stable within the beta series; re-verify if upgrading)
