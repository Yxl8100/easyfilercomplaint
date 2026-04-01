# Phase 1: Schema & Data Model — Research

**Researched:** 2026-03-31
**Domain:** Prisma schema design (PostgreSQL/Neon), TypeScript utility generation
**Confidence:** HIGH

## Summary

The existing Prisma schema (v5.22.0) has a substantial pre-existing foundation: a `Filing` model, a `User` model, a `Submission` model, and an `Invoice` model. However, the current schema was designed for a different product shape — it treats the filing as requiring a `userId` (non-nullable), uses a separate `Submission` model for agency delivery tracking, and stores payment state on an `Invoice` model rather than directly on `Filing`.

Phase 1 must reshape the `Filing` model significantly: make `userId` optional (guest filings), collapse the Stripe payment fields from `Invoice` directly onto `Filing`, add Phaxio fax fields, add a lifecycle status enum, add evidence file fields, and add a `filingReceiptId`. The `User` model already exists and already has subscription-era Stripe fields, but is missing `passwordHash` for the custom JWT auth in Phase 6. The `Account` and `Session` models support NextAuth OAuth — these can stay untouched; they are irrelevant to Phase 1 but must not be broken.

The filing receipt ID generator (`EFC-YYYYMMDD-XXXXX`) is a pure TypeScript utility with no external dependencies. The schema push command is `npx prisma db push` (prototyping/dev workflow against Neon — no migration files generated).

**Primary recommendation:** Extend the `Filing` model in-place with new fields, make `userId` optional, add `passwordHash` to `User`, add a Prisma `enum FilingStatus`, and push directly to Neon with `prisma db push`. Do not touch `Account`, `Session`, `VerificationToken`, `Submission`, or `ComplaintTemplate` models.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCHEMA-01 | Filing model has all Stripe fields (stripeSessionId, stripePaymentId, paymentStatus, paymentAmount, paidAt) | New fields added to Filing; no existing Stripe fields on Filing (they exist on Invoice only) |
| SCHEMA-02 | Filing model has all Phaxio fields (faxId, faxStatus, faxSentAt, faxCompletedAt, faxPages) | New fields; existing Submission.faxStatus is separate model — add directly to Filing |
| SCHEMA-03 | Filing model has filingReceiptId (EFC-YYYYMMDD-XXXXX format, unique) | New String field with @unique constraint |
| SCHEMA-04 | Filing model has lifecycle status field with all states (draft → pending_payment → paid → generating → filing → filed → failed) | Rename/reuse existing `status String @default("draft")` — or use Prisma enum; see Architecture Patterns |
| SCHEMA-05 | Filing model supports optional userId for account linkage (guest filings have no userId) | Current schema has `userId String` (required) — must become `userId String?` + relation becomes optional |
| SCHEMA-06 | Filing model has evidence file fields (evidenceFileUrl, evidenceFileName) | New String? fields |
| SCHEMA-07 | User model exists with passwordHash for account creation | User model exists but lacks `passwordHash String?` — must add |
| SCHEMA-08 | Filing receipt ID generator utility (src/lib/filing-receipt-id.ts) | Pure TypeScript, no deps, EFC-YYYYMMDD-XXXXX pattern with 5-char random suffix |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| prisma | 5.22.0 | Schema definition, migration, client generation | Already installed |
| @prisma/client | 5.22.0 | Generated type-safe DB client | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript | ^5 | Utility types, Receipt ID generator | Already installed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Prisma enum | String with validation | Enum gives compile-time safety and DB-level constraint; String is looser but avoids migration friction. For `db push` workflow, enum is fine. |
| Random suffix (Math.random) | nanoid or uuid | Math.random is sufficient for a 5-char alphanumeric suffix on a date-scoped ID. nanoid adds a dep unnecessarily. |

**No additional installation needed.** All required packages are already present.

## Architecture Patterns

### Recommended Schema Changes

#### 1. Make userId Optional on Filing

```prisma
// BEFORE
userId  String
user    User   @relation(fields: [userId], references: [id])

// AFTER
userId  String?
user    User?  @relation(fields: [userId], references: [id])
```

When `userId` is nullable, the relation itself must also be nullable (`User?`). Prisma 5 requires both the scalar and the relation to be optional together.

#### 2. Add FilingStatus Enum

```prisma
enum FilingStatus {
  draft
  pending_payment
  paid
  generating
  filing
  filed
  failed
}
```

Then on Filing:
```prisma
status  FilingStatus  @default(draft)
```

The existing `status String @default("draft")` field will be replaced. Prisma `db push` will apply this as a column type change (String → enum). Postgres supports `ALTER TYPE` for enums. With `db push` (not `migrate`), Prisma handles this transparently.

**Pitfall:** If the existing `status` column already has rows with values not in the enum, `db push` will fail. For a dev/prototype Neon database with no production data, this is not a concern. If rows exist, truncate the table or manually update values first.

#### 3. Add All Required Filing Fields

```prisma
model Filing {
  // ... existing fields ...

  // SCHEMA-01: Stripe payment fields
  stripeSessionId   String?
  stripePaymentId   String?
  paymentStatus     String?   // e.g. "unpaid" | "paid" | "expired"
  paymentAmount     Decimal?  @db.Decimal(10, 2)
  paidAt            DateTime?

  // SCHEMA-02: Phaxio fax fields
  faxId             String?
  faxStatus         String?
  faxSentAt         DateTime?
  faxCompletedAt    DateTime?
  faxPages          Int?

  // SCHEMA-03: Filing receipt ID
  filingReceiptId   String?   @unique

  // SCHEMA-04: Lifecycle status (replaces existing status String)
  status            FilingStatus  @default(draft)

  // SCHEMA-05: Optional user relation (guest support)
  userId            String?
  user              User?     @relation(fields: [userId], references: [id])

  // SCHEMA-06: Evidence file
  evidenceFileUrl   String?
  evidenceFileName  String?

  // SCHEMA-08: Filing receipt email tracking (needed by Phase 5)
  complaintPdfUrl   String?
  receiptEmailSentAt DateTime?
}
```

**Note on complaintPdfUrl and receiptEmailSentAt:** These fields are written by Phase 3 (PDF) and Phase 5 (Email) respectively. Adding them now prevents schema changes in those phases, which is the explicit goal of Phase 1.

#### 4. Add passwordHash to User

```prisma
model User {
  // ... existing fields ...
  passwordHash  String?   // Added for Phase 6 custom auth
}
```

`passwordHash` is nullable because existing users created via OAuth will not have one. Only users created via the guest-to-account flow in Phase 6 will have this set.

#### 5. Filing Receipt ID Generator

```typescript
// src/lib/filing-receipt-id.ts

export function generateFilingReceiptId(): string {
  const date = new Date();
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 5; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `EFC-${yyyy}${mm}${dd}-${suffix}`;
}
```

Format: `EFC-20260331-X7K2M`

### Recommended Project Structure

No new directories required. Utility goes in existing `src/lib/`:

```
src/lib/
├── filing-receipt-id.ts   # NEW — SCHEMA-08
├── prisma.ts              # Existing singleton (no changes)
└── ...
```

### Anti-Patterns to Avoid

- **Splitting Filing fields across Filing + Submission:** The existing `Submission` model handles agency delivery in the old product. New Phaxio fields go directly on `Filing`, not on `Submission`. Submission can remain untouched.
- **Using crypto.randomUUID() for receipt ID suffix:** UUIDs are 36 chars. The receipt ID requires a short 5-char suffix. Use simple character sampling.
- **Running `prisma migrate dev` instead of `prisma db push`:** The roadmap specifies `db push`. This is the correct choice for a Neon prototype database — no migration files, no shadow database needed.
- **Making `passwordHash` non-nullable:** OAuth users via NextAuth will exist without a password. It must be `String?`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Type-safe DB queries | Manual SQL | Prisma client (already installed) | Prisma generates full TypeScript types from schema |
| Enum validation | Runtime string checks | Prisma `enum` + generated TS union | DB-enforced constraint + compile-time safety |
| Schema push | Custom migration script | `npx prisma db push` | Official tool, handles type changes, creates DB if missing |

**Key insight:** Prisma's `db push` is the right tool for schema-first prototyping against Neon. It applies schema changes directly without creating migration files, which is appropriate here since Phase 1 is the schema definition phase, not an incremental migration phase.

## Common Pitfalls

### Pitfall 1: Non-nullable userId Blocks Guest Filings
**What goes wrong:** All subsequent phases (Stripe webhook, pipeline) create Filing records without a known userId. If `userId` remains required, Prisma will throw a NOT NULL constraint violation.
**Why it happens:** Original schema assumed all filings were by logged-in users.
**How to avoid:** Make `userId String?` and `user User?` at the same time. Both must be optional.
**Warning signs:** TypeScript error: "Argument of type '{ userId: undefined }' is not assignable..."

### Pitfall 2: Existing Status Column Type Conflict
**What goes wrong:** `prisma db push` fails when trying to alter the `status` column from `varchar` to a Postgres enum if any existing rows have values outside the enum.
**Why it happens:** Postgres won't cast arbitrary strings to enum values.
**How to avoid:** If any data exists in the `filings` table on Neon, clear it first, or keep `status` as `String` and validate in application code. For a fresh dev database, this is not an issue.
**Warning signs:** `ERROR: invalid input value for enum "FilingStatus"`

### Pitfall 3: Invoice Relation Conflict After Filing Changes
**What goes wrong:** The existing `Filing` model has `invoiceId String?` and `invoice Invoice?`. The `Invoice` model has `filings Filing[]`. After making `userId` optional on `Filing`, if the `Invoice` model still has `userId String` (non-optional), creating a Filing without a user won't break — but creating an Invoice for a guest filing will.
**Why it happens:** Invoice model is structurally tied to the old user-required flow.
**How to avoid:** Do not modify the `Invoice` model in Phase 1. The Stripe payment fields go directly on `Filing` (SCHEMA-01), making the `Invoice` model irrelevant to the new payment flow. The `invoiceId` relation on Filing can remain nullable and unused.
**Warning signs:** TypeScript errors when writing Stripe webhook code in Phase 2.

### Pitfall 4: Forgetting `complaintPdfUrl` and `receiptEmailSentAt`
**What goes wrong:** Phase 3 (PDF) needs `Filing.complaintPdfUrl` and Phase 5 (Email) needs `Filing.receiptEmailSentAt`. If not added in Phase 1, those phases must touch the schema.
**Why it happens:** Requirements PDF-05 and EMAIL-06 are in later phases but depend on schema fields.
**How to avoid:** Add `complaintPdfUrl String?` and `receiptEmailSentAt DateTime?` to Filing now. This is the explicit purpose of Phase 1 — finalize the schema before pipeline code is written.

### Pitfall 5: `db push` Dropping the `Submission` Model
**What goes wrong:** If any Submission records exist in Neon and the push encounters a destructive change, Prisma warns and halts (or in `--accept-data-loss` mode, drops data).
**Why it happens:** `db push` is not migration-safe for destructive changes.
**How to avoid:** Only add fields; do not remove models. The `Submission` model stays as-is. The new Phaxio fields go on `Filing`, not as replacements for `Submission`.

## Code Examples

### Prisma Enum Declaration (Prisma 5.x)
```prisma
// Source: Prisma 5.x official docs — enums
enum FilingStatus {
  draft
  pending_payment
  paid
  generating
  filing
  filed
  failed
}
```

Enums are declared at the top level of schema.prisma, before or after models. They map to Postgres `CREATE TYPE ... AS ENUM (...)`.

### Optional Relation (Prisma 5.x)
```prisma
// Source: Prisma 5.x docs — optional relations
model Filing {
  userId  String?
  user    User?   @relation(fields: [userId], references: [id])
}
```

Both the foreign key scalar (`userId`) and the relation field (`user`) must have `?`. Prisma enforces this at schema validation time.

### Prisma Singleton Client (existing pattern — no changes needed)
```typescript
// src/lib/prisma.ts — already correct for Next.js + Vercel
import { PrismaClient } from '@prisma/client'
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### Schema Push Commands
```bash
# Apply schema changes to Neon (no migration files)
npx prisma db push

# Regenerate Prisma client after schema change
npx prisma generate

# Or using project scripts:
npm run db:push
npm run db:generate
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `prisma migrate dev` for all changes | `prisma db push` for prototype/dev | Prisma 3+ | db push skips migration files, faster for schema iteration |
| `@prisma/client` v4 enum syntax | Same syntax in v5 — no change | v5.0 | No impact |

**Deprecated/outdated:**
- `prisma2`: Not applicable — project uses Prisma 5.
- `@prisma/client` v4 `findUnique` differences: None in v5 — API is stable.

## Open Questions

1. **Should `status` remain a `String` or become a Prisma `enum`?**
   - What we know: Prisma enum maps to Postgres native enum. It gives compile-time safety and DB-level constraint. The existing column is `String`.
   - What's unclear: Whether any rows exist in the Neon dev database with status values that would conflict.
   - Recommendation: Use Prisma enum for SCHEMA-04. If `db push` fails due to existing data, the plan task should include a fallback: keep as `String` with a comment documenting the valid values. This is a judgment call the implementer can make in-context.

2. **Is the `Submission` model used anywhere in the current app?**
   - What we know: It exists in schema and is related to `Filing`. `src/lib/submit-fax.ts` and `src/lib/submit-complaint.ts` likely write to it.
   - What's unclear: Whether any active UI or API routes depend on Submission records.
   - Recommendation: Audit those lib files in the plan task before modifying anything. Phase 1 should not remove `Submission` — leave it untouched.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npx prisma commands | ✓ | (standard) | — |
| prisma CLI | db push, generate | ✓ | 5.22.0 | — |
| DATABASE_URL (Neon) | db push to apply schema | Unknown | — | Cannot push without valid connection string |
| TypeScript compiler | src/lib/filing-receipt-id.ts | ✓ | ^5 | — |

**Missing dependencies with no fallback:**
- `DATABASE_URL` environment variable must be set and pointing to a live Neon database for `prisma db push` to succeed. If not set, the plan task should note this as a prerequisite check.

**Missing dependencies with fallback:**
- None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no jest.config, vitest.config, or test/ directory found |
| Config file | None — Wave 0 must add |
| Quick run command | (none established) |
| Full suite command | (none established) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCHEMA-01 | Filing model has Stripe fields | Integration (Prisma client query) | `npx tsx src/lib/__tests__/schema-smoke.ts` | ❌ Wave 0 |
| SCHEMA-02 | Filing model has Phaxio fields | Integration (Prisma client query) | same | ❌ Wave 0 |
| SCHEMA-03 | filingReceiptId is unique | Integration | same | ❌ Wave 0 |
| SCHEMA-04 | Status enum with all 7 states | Unit (TypeScript types) + Integration | same | ❌ Wave 0 |
| SCHEMA-05 | Optional userId (guest filing) | Integration | same | ❌ Wave 0 |
| SCHEMA-06 | Evidence file fields | Integration | same | ❌ Wave 0 |
| SCHEMA-07 | User.passwordHash field | Integration | same | ❌ Wave 0 |
| SCHEMA-08 | generateFilingReceiptId() format | Unit | `npx tsx src/lib/__tests__/filing-receipt-id.test.ts` | ❌ Wave 0 |

**Note on test approach:** Because this project has no test framework installed, the most practical validation for schema fields is:
1. TypeScript compilation (`npx tsc --noEmit`) — catches missing/wrong types in generated client
2. A lightweight schema smoke-test script using Prisma client to verify field presence at runtime
3. Unit test for the `generateFilingReceiptId()` utility

For SCHEMA-08 specifically, a pure unit test with no external dependencies is straightforward and high-value. The planner should include it.

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit` (catches generated client type issues)
- **Per wave merge:** All schema integration smoke tests pass
- **Phase gate:** `npx tsc --noEmit` green + `npx prisma validate` green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/filing-receipt-id.test.ts` — unit test for EFC-YYYYMMDD-XXXXX format (SCHEMA-08)
- [ ] `src/lib/__tests__/schema-smoke.ts` — integration smoke for field presence (SCHEMA-01 through SCHEMA-07)
- [ ] Decision: adopt vitest (zero-config, already compatible with Next.js 14 TypeScript projects) OR use `tsx` scripts for smoke testing. Planner should choose.

*(Recommended: vitest for SCHEMA-08 unit test; tsx script for schema smoke. Vitest requires `npm install -D vitest`.)*

## Sources

### Primary (HIGH confidence)
- Prisma schema.prisma in project — direct audit of existing models
- package.json — verified Prisma 5.22.0 installed
- REQUIREMENTS.md — authoritative field list for SCHEMA-01 through SCHEMA-08

### Secondary (MEDIUM confidence)
- Prisma 5.x official documentation patterns for optional relations and enums (consistent with Prisma 4.x, no breaking changes in this area between v4 and v5)
- Prisma `db push` vs `migrate dev` behavior — well-documented distinction, confirmed by project script `"db:push": "prisma db push"` already present in package.json

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Schema audit (existing fields): HIGH — direct source read
- Required new fields: HIGH — from REQUIREMENTS.md
- Prisma 5 enum/optional relation syntax: HIGH — stable API, confirmed in installed version
- `db push` behavior with type changes: MEDIUM — behavior documented; actual Neon DB state unknown
- Test framework recommendation: MEDIUM — vitest is standard for Next.js 14 TypeScript, but project has zero test infrastructure currently

**Research date:** 2026-03-31
**Valid until:** 2026-05-01 (Prisma 5.x is stable; schema decisions are project-specific)
