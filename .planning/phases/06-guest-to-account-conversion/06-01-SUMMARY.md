---
phase: 06-guest-to-account-conversion
plan: 01
subsystem: auth
tags: [auth, registration, bcrypt, jwt, middleware, nextauth]
dependency_graph:
  requires:
    - prisma/schema.prisma (Filing model — filerEmail column added)
    - src/lib/prisma.ts (Prisma client)
    - next-auth v5 (already installed)
    - bcryptjs (newly installed in this plan)
  provides:
    - POST /api/auth/register — creates user with bcrypt-hashed password, links filings
    - Credentials provider in NextAuth with JWT session strategy
    - Middleware protection for /account/* routes redirecting to /login
    - filerEmail indexed column on Filing model
  affects:
    - src/app/api/checkout/route.ts (now also sets filerEmail on Filing creation)
    - src/middleware.ts (adds /account to protected paths, redirects to /login)
    - src/lib/auth.ts (adds Credentials provider + JWT strategy)
tech_stack:
  added:
    - bcryptjs@3.x (password hashing, cost factor 12)
    - @types/bcryptjs@2.x (TypeScript types)
  patterns:
    - TDD (RED → GREEN → commit) for Task 1
    - NextAuth v5 Credentials provider with PrismaAdapter + JWT strategy
    - prisma.filing.updateMany for bulk filing-to-user linkage
key_files:
  created:
    - src/app/api/auth/register/route.ts
    - src/lib/__tests__/register.test.ts
    - src/middleware.test.ts
  modified:
    - prisma/schema.prisma (filerEmail String? + @@index([filerEmail]))
    - src/lib/auth.ts (Credentials + JWT strategy + /login pages)
    - src/middleware.ts (/account protected path + /login redirect)
    - src/app/api/checkout/route.ts (set filerEmail: data.email)
    - package.json (bcryptjs + @types/bcryptjs)
decisions:
  - "bcrypt cost factor 12 — meets security requirement without excessive latency"
  - "JWT session strategy required when using Credentials + PrismaAdapter (database strategy silently fails)"
  - "filerEmail indexed column (not raw SQL JSON extraction) resolves RESEARCH.md Open Question 1"
  - "Middleware test extracts protectedPaths logic to pure functions — NextAuth v5 auth() wrapper not directly unit-testable"
  - "prisma db push deferred to deployment — DATABASE_URL not available in parallel agent worktree"
metrics:
  duration: "8 minutes"
  completed: "2026-04-02"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 5
  tests_added: 14
  tests_total: 113
---

# Phase 06 Plan 01: Auth Infrastructure Summary

**One-liner:** JWT-based Credentials auth with bcrypt cost-12 registration, filing-linkage, and /account/* middleware protection using NextAuth v5.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install bcryptjs, filerEmail migration, registration API | ad7064b | prisma/schema.prisma, src/app/api/auth/register/route.ts, src/lib/__tests__/register.test.ts, src/app/api/checkout/route.ts |
| 2 | Credentials provider, JWT strategy, middleware, tests | 42b7e2a | src/lib/auth.ts, src/middleware.ts, src/middleware.test.ts |

## What Was Built

### Registration Endpoint (AUTH-02, AUTH-03)

`POST /api/auth/register` accepts `{name, email, password}` and:
1. Returns 400 with `{error: 'invalid_input'}` if email missing or password < 8 chars
2. Returns 409 with `{error: 'email_taken'}` if user already exists
3. Hashes password with bcrypt cost factor 12
4. Creates User record via Prisma
5. Links all Filing records with matching `filerEmail` and `userId=null` to the new user
6. Returns 201 with `{userId}`

### Credentials Provider (AUTH-05)

`src/lib/auth.ts` updated with:
- `Credentials` provider alongside existing Resend + Google
- `session: { strategy: 'jwt' }` — required for Credentials + PrismaAdapter to work
- `authorize()` callback: finds user by email, verifies bcrypt hash, returns user object
- `jwt({ token, user })` callback: propagates user.id into JWT token
- `session({ session, token })` callback: exposes token.id as session.user.id
- `pages.signIn` changed from `/auth/signin` to `/login`

### Middleware Protection (AUTH-06)

`src/middleware.ts` updated with:
- `/account` added to `protectedPaths` array (alongside existing `/dashboard` and `/file`)
- Redirect target changed from `/auth/signin` to `/login`
- Unauthenticated requests to `/account/*` redirect to `/login?callbackUrl=/account/...`

### Schema Change

`prisma/schema.prisma` Filing model updated with:
- `filerEmail String?` column (after `filerInfo Json?`)
- `@@index([filerEmail])` for efficient email-based filing lookup

`src/app/api/checkout/route.ts` updated to populate `filerEmail: data.email` alongside the existing `filerInfo` JSON blob.

## Tests

- **register.test.ts:** 6 tests covering happy path (201), duplicate email (409), short password (400), missing email (400), filing linkage (AUTH-03), bcrypt roundtrip
- **middleware.test.ts:** 8 tests for protectedPaths logic and redirect URL construction

**Total:** 113 tests passing (99 from phases 1-5 + 14 new)

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| bcrypt cost factor 12 | Industry standard; ~250ms on commodity hardware — acceptable UX latency for security |
| JWT session strategy | NextAuth v5 Credentials provider requires JWT strategy; database strategy silently fails with PrismaAdapter |
| filerEmail indexed column | RESEARCH.md Open Question 1 resolved — clean indexed String? vs raw SQL JSON extraction |
| Middleware test via pure functions | NextAuth v5 `auth()` wrapper cannot be directly unit-tested; extracted protectedPaths + URL construction logic for isolation |
| prisma db push deferred to deployment | DATABASE_URL not available in parallel agent worktree environment |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree diverged from master**
- **Found during:** Pre-execution setup
- **Issue:** Worktree branch `worktree-agent-aaefff83` was behind master by ~50 commits (all Phases 1-5 source code changes). The worktree had the old schema (no FilingStatus enum, no filerInfo, no bcryptjs, no vitest).
- **Fix:** Merged master into the worktree branch (`git merge master --no-edit`) before beginning task execution.
- **Files modified:** All Phase 1-5 source files (via merge, not authored here)
- **Commit:** Fast-forward merge to 648d50e

## Known Stubs

None — all functionality is fully wired. `prisma db push` must be run in the live environment (with DATABASE_URL set) before `filerEmail` column is live in the database.

## Self-Check: PASSED

- src/app/api/auth/register/route.ts: FOUND
- src/lib/__tests__/register.test.ts: FOUND
- src/middleware.test.ts: FOUND
- Commit ad7064b: FOUND (Task 1)
- Commit 42b7e2a: FOUND (Task 2)
- 113 tests passing: VERIFIED
