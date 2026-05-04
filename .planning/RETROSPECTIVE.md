# Retrospective: EasyFilerComplaint

---

## Milestone: v2.0 — Triple-Filing (CPPA + CA AG + PDF)

**Shipped:** 2026-05-03
**Phases:** 3 (9–11) | **Plans:** 9 | **Duration:** 1 session (~6.5 hours)

### What Was Built

- **CPPA Narrative Generator** — `generateCPPAComplaint(filing)` produces all 7 CPPA form question answers as natural first-person text; single source of truth feeding the guide page, success page, and paper PDF
- **CA AG PDF Restructured** — rebuilt from legal-letter to 6-section form layout; zero statute citations; omits empty fields instead of "N/A"
- **3-Channel Success Page** — CPPA Online (★ Recommended), CPPA Paper Mail, CA AG (Auto-Filed ✓); ADA complaints show CA AG only
- **CPPA Guided Filing Page** — server RSC at /filing/[id]/cppa-guide; CopyButton client component; UUID-only access
- **CPPA Paper PDF Generator** — 10-section PDF mirroring official CPPA form; embedded LiberationSerif fonts; perjury attestation
- **CPPA PDF Route** — on-demand generation, Blob storage, graceful fallback, attachment download

### What Worked

- **TDD wave-0 scaffolds** — writing failing tests before implementation locked the contract and made later debugging fast; all 3 phases used this pattern
- **Single narrative generator** — `cppa-complaint-generator.ts` as the single source of truth for all 7 CPPA answers, used by AG PDF, guide page, and paper PDF simultaneously, avoided duplication
- **Phase isolation** — Phases 10 and 11 depending on Phase 9 output but running independently kept scope clear; no cross-phase debugging needed
- **Code review gate** — caught real bugs (missing try/catch, font caching on hot path, category-specific text errors) before they reached production
- **Info dict for test searchability** — pdf-lib's Identity-H encoding makes drawn text unsearchable via latin1; storing key strings in the PDF Info dictionary was a clean workaround

### What Was Inefficient

- **vi.resetAllMocks() mock re-seeding** — the WR-06 fix (adding `pdfBytes.byteLength`) caused 5 route test regressions because `vi.resetAllMocks()` clears mock return values; required an extra beforeEach fix pass; could have been caught by reading the test setup more carefully before applying the fix
- **WR-07 throw vs fallback** — the code fixer applied a throw for empty Q7 contact fields which broke existing `generate-complaint-pdf.test.ts` fixtures (Phase 9 precedent); should have checked whether `generateCPPAComplaint` is called from the AG PDF generator before throwing
- **Phase 8 perpetual deferral** — Phase 8 (Wizard UX) was "planned, not executed" in v1 and remains so in v2.0; the wizard UX debt is accumulating

### Patterns Established

- **UUID-only access model (D-04/D-05)** — both /cppa-guide and /api/filings/[id]/cppa-pdf use UUID as the access token; no session check for guest filers; documented as a reusable decision for future filing-adjacent routes
- **Blob path namespacing** — `complaints/cppa/` vs `complaints/` prevents CA AG PDF and CPPA PDF from overwriting each other; use subdirectory naming for all future blob paths
- **Module-level readFileSync for static assets** — font files should always be cached at module scope, not read per-request; applies to any similar server-side static asset loading

### Key Lessons

1. Before applying code-review fixes that add null guards or type assertions, check whether the production function is also called from existing test fixtures that don't supply those fields — a throw that's safe for CPPA may break AG PDF tests
2. `vi.resetAllMocks()` resets `mockResolvedValue` — if beforeEach uses it and later tests need a specific return value, re-seed the mock in beforeEach or in each individual test
3. pdf-lib's `useObjectStreams: false` is load-bearing for test searchability — always include it when tests grep the PDF bytes; the extractPdfText helper only works on uncompressed Info dict entries
4. When restructuring a legal document to avoid looking "automated" (statute citations, "N/A" placeholders, Dear X salutation), the test suite must cover all three complaint categories — each can produce different output

### Cost Observations

- Session: 1 session (~6.5 hours, 2026-05-03)
- Model: claude-sonnet-4-6 (orchestrator + executors)
- Agent spawns: ~12 (3 executors × 3 waves, 1 verifier × 3 phases, 1–2 code reviewers + fixer, 1 milestone)
- Notable: Full TDD approach (wave-0 scaffolds) added ~30% more planning overhead per phase but eliminated all mid-implementation surprises

---

## Cross-Milestone Trends

| Metric | v1.0 | v2.0 |
|--------|------|------|
| Phases | 7 (8 planned) | 3 |
| Plans | ~19 | 9 |
| Tests | ~192 | 206 |
| Duration | ~5 days | 1 session |
| Code review regressions | Unknown | 1 batch (5 route tests) |
| Deferred phases | Phase 8 | Phase 8 again |

**Trend:** Phase 8 (Filing Wizard UX) is the persistent debt item — it was scoped in v1.0 and deferred, scoped again implicitly in v2.0 and deferred. v3.0 should address it directly or explicitly drop the requirements.

---
*Last updated: 2026-05-03 — v2.0 retrospective added*
