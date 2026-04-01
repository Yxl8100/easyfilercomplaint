---
phase: "04-phaxio-fax-integration-filing-pipeline"
plan: "01"
subsystem: "fax-infrastructure"
tags: ["phaxio", "axios", "form-data", "agency-directory", "schema", "tdd"]
dependency_graph:
  requires: []
  provides: ["agency-directory", "phaxio-send-fax", "filerInfo-schema"]
  affects: ["04-02", "04-03"]
tech_stack:
  added: ["axios@^1.7.9", "form-data@^4.0.1", "vitest", "@vitejs/plugin-react"]
  patterns: ["TDD red-green", "axios basic auth", "FormData multipart"]
key_files:
  created:
    - src/lib/agency-directory.ts
    - src/lib/__tests__/agency-directory.test.ts
    - src/lib/__tests__/phaxio.test.ts
    - src/app/api/checkout/route.ts
    - vitest.config.ts
  modified:
    - src/lib/phaxio.ts
    - prisma/schema.prisma
    - package.json
decisions:
  - "axios + form-data instead of native fetch — avoids Node.js 18-23.6 multipart CRLF bug (FAX-08)"
  - "sendFax takes FaxFile[] array instead of single buffer — enables multi-file evidence attachments (FAX-07)"
  - "filerInfo Json? stored at checkout time — pipeline retrieves filer details without User join"
  - "getAgencyFaxNumber throws on unknown code — explicit error over silent undefined"
metrics:
  duration: "5 minutes"
  completed: "2026-04-01"
  tasks_completed: 2
  tasks_total: 2
  files_created: 5
  files_modified: 3
---

# Phase 04 Plan 01: Agency Directory, Phaxio Axios Rewrite, Schema filerInfo Summary

**One-liner:** axios+form-data phaxio client with FaxFile[] multi-file support, agency directory for CA AG fax routing, and filerInfo JSON stored on Filing at checkout

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Agency directory, filerInfo schema, checkout, deps | 8076155 | agency-directory.ts, schema.prisma, checkout/route.ts, package.json, vitest.config.ts |
| 2 | Rewrite phaxio.ts with axios + form-data | d08e1d1 | phaxio.ts, phaxio.test.ts |

## What Was Built

### Agency Directory (`src/lib/agency-directory.ts`)
- `AGENCY_DIRECTORY` map with `ca_ag` entry (CA Attorney General, E.164 `+19163235341`)
- `getAgencyFaxNumber(code)` — throws on unknown agency code
- `getAgencyName(code)` — throws on unknown agency code
- Note: fax number is placeholder — must verify against oag.ca.gov before go-live

### Phaxio Client Rewrite (`src/lib/phaxio.ts`)
- Replaced native `fetch` + `new FormData()` with `axios.post` + `form-data` package
- New signature: `sendFax(toNumber: string, files: FaxFile[])` — supports 1 or more files
- Uses `auth: { username, password }` (Phaxio basic auth pattern)
- `getFaxStatus(faxId)` also uses axios.get
- Exports: `sendFax`, `getFaxStatus`, `PhaxioSendResult`, `PhaxioFaxStatus`, `FaxFile`
- No native `fetch` anywhere — verified by test assertion

### Schema Update (`prisma/schema.prisma`)
- Added `filerInfo Json?` field to Filing model
- Synchronized worktree schema with main project schema (FilingStatus enum, Stripe/Phaxio fields, etc.)
- Note: `prisma db push` requires DATABASE_URL env var — run in environment with Neon credentials

### Checkout Route (`src/app/api/checkout/route.ts`)
- Created checkout route (was missing from worktree)
- Stores `filerInfo` JSON at Filing creation time with all filer PII fields
- Pipeline can retrieve filer details from Filing.filerInfo without a User join

### Test Infrastructure
- Added `vitest.config.ts` (was missing from worktree)
- 14 unit tests total across 2 test suites — all passing

## Test Results

```
Test Files  2 passed (2)
Tests       14 passed (14)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Worktree missing newer project files**
- **Found during:** Task 1
- **Issue:** Worktree at commit `02c3d70` lacked checkout/route.ts, updated schema (FilingStatus enum, Stripe/Phaxio fields), vitest.config.ts, stripe.ts — all added in Phases 01-03
- **Fix:** Copied updated schema from main project and created missing files in worktree
- **Files modified:** prisma/schema.prisma, package.json, vitest.config.ts, src/lib/stripe.ts, src/app/api/checkout/route.ts

**2. [Rule 3 - Blocking] Worktree missing vitest and test devDependencies**
- **Found during:** Task 1 (pre-verification)
- **Issue:** package.json lacked vitest, @vitejs/plugin-react, axios, form-data
- **Fix:** Updated package.json to match main project + added axios/form-data, ran npm install
- **Files modified:** package.json

**3. [Rule 3 - Blocking] TDD test approach — vi.mock with static import**
- **Found during:** Task 2 (RED phase)
- **Issue:** Initial test structure used dynamic imports per test case which caused module caching issues with vi.mock
- **Fix:** Rewrote tests to use static top-level import with vi.mocked() reassignment in beforeEach
- **Files modified:** src/lib/__tests__/phaxio.test.ts

## Known Stubs

- `ca_ag` fax number `+19163235341` in `AGENCY_DIRECTORY` is a placeholder — must verify against oag.ca.gov before go-live (documented in STATE.md Critical Notes)

## Self-Check

- [x] `src/lib/agency-directory.ts` exists
- [x] `src/lib/__tests__/agency-directory.test.ts` exists
- [x] `src/lib/phaxio.ts` exists and contains `import axios from 'axios'`
- [x] `src/lib/__tests__/phaxio.test.ts` exists and contains `vi.mock('axios')`
- [x] `src/app/api/checkout/route.ts` exists and contains `filerInfo:`
- [x] `prisma/schema.prisma` contains `filerInfo Json?`
- [x] `package.json` contains `"axios"` and `"form-data"`
- [x] Commit 8076155 exists (Task 1)
- [x] Commit d08e1d1 exists (Task 2)

## Self-Check: PASSED
