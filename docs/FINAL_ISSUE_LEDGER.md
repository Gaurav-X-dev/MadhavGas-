# Final Issue Ledger

Workflow: discover -> root cause -> fix -> targeted test -> screenshot -> close.

| ID | Severity | Module | Root cause | Implemented fix | Verification | Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MG-001 | P1 | Hero | A generic required-URL schema exposed `heroSlides.n.image` and new slides began invalid | Field-aware validation, valid new-slide default, explicit save, replace/remove preview flow | API suite verifies invalid, existing and replacement-image cases | 06-09 | Closed |
| MG-002 | P1 | Branding | `site-content` had one merged `logoUrl` | Independent Bharatgas/MBGA URL and alt fields, migration, admin previews and public hydration | Independent save/reload/public assertions | 03-05, 37 | Closed |
| MG-003 | P2 | Activity | An early GET return made the real audit query unreachable | Restored authenticated GET; kept PUT read-only | GET 200 and PUT 405 in API suite | 02, 36 | Closed |
| MG-004 | P1 | Booking | Booking selector submitted enquiry-shaped data | Discriminated public schema and booking-specific DB/admin mapper | Valid/invalid booking, BKG reference, admin shape and status tests | 20-21 | Closed |
| MG-005 | P1 | Newsletter | Generic submission storage had no lifecycle/admin flow | Normalized subscriber table, idempotency, status filters, unsubscribe/reactivate and token flow | Create, duplicate, normalize, filter and PATCH tests | 27-29 | Closed |
| MG-006 | P1 | SMTP | No transport, safe status or test action | Reusable server-only Nodemailer service, delivery logs, templates, status/test APIs | Missing-config 409 and secret-exposure checks | 32 | Closed (delivery credentials external) |
| MG-007 | P2 | Admin header | Search/notification affordances were static demo content | Real debounced DB search; fabricated notification UI removed | Search result/navigation and browser route audit | 02, 36 | Closed |
| MG-008 | P2 | Uploads | Magic-byte-only checks did not prove decodability or safe dimensions | JPG/PNG/WebP structure/dimension checks, MIME-extension match, limits and random names | Invalid, SVG, mismatch, oversized and valid upload tests | 08, 12 | Closed |
| MG-009 | P2 | Journey | Model lacked category/image/alt/publish/featured | Migration, complete admin editor, draft filtering, optional media and featured public use | CRUD plus published/draft assertions | 14-15 | Closed |
| MG-010 | P2 | Admin persistence | Singleton drafts auto-saved invalid transient values; collection success appeared early | Explicit singleton saves, success only after response, actionable errors | Save/reload tests and hero validation evidence | 06-08 | Closed |
| MG-011 | P2 | Dashboard | Empty charts/lists implied unavailable data | Truthful contextual empty states and live operational data | Baseline and temporary-data dashboard evidence | 02, 36 | Closed |
| MG-012 | P2 | Evidence QA | No deterministic visual evidence set existed | CDP evidence runner, manifest and indexed screenshots | 57 screenshots and 168 admin responsive renders | 01-57 | Closed |
| MG-013 | P1 | Runtime uploads | `next start` did not reliably serve files written to `public/uploads` after build | Safe dynamic `/uploads/[filename]` media route with MIME/cache/nosniff | Production POST then GET/MIME/nosniff checks | 03-05, 08-09 | Closed |
| MG-014 | P1 | Admin responsive | Styled hidden file inputs retained `w-full`, causing 42-57 px overflow at 768 px | Native accessible hidden file input without layout width | Focused 768 regression plus 168-render admin audit | 35, 55 | Closed |
| MG-015 | P2 | Browser assets | Chrome's fallback `/favicon.ico` request returned 404 | Safe redirect to the existing app icon | Production HTTP and zero-network-error evidence run | 01 | Closed |
| MG-016 | P2 | Public typography | Hero/section headings reached visually excessive sizes | Reduced fluid max sizes, improved line-height and lighter nav/button hierarchy | 11-width public layout audit and visual evidence | 05, 09, 33-34 | Closed |
| MG-017 | P1 | Contact settings | The key had a schema/seed but was absent from the resource allowlist and DB key constraint, causing Admin 404/migration failure | Added resource mapping, migration constraint and complete defaults | API validation, content audit, responsive browser and evidence suites | 22-26, 31 | Closed |
| MG-018 | P1 | Shared public shell | Navigation, newsletter, CTA and footer copy remained hardcoded in the browser runtime | Added `site-chrome` singleton, strict schema, admin editor, migration, runtime hydration and fallbacks | API persistence plus 77-render public browser audit | 05, 27-29, 37, 57 | Closed |
| MG-019 | P1 | Public content API | Newer dynamic groups were omitted from `/api/public/content` | Endpoint now uses the unified public data loader and returns every safe public group | 249-check API suite and public evidence flow | 05, 09, 11, 13, 15, 17, 19 | Closed |
| MG-020 | External | PostgreSQL | Local server rejected the configured password with `28P01` | Reset local role password, restored SCRAM host rules, verified target DB and applied migration | `npm run db:check`, setup, 29-check audit and full E2E suites | `docs/FINAL_TEST_REPORT.md` | Closed |

## Final state

- P0 remaining: **0**
- Code P1 remaining: **0**
- P2 remaining: **0**
- External blockers: real SMTP delivery requires provider credentials; Hostinger requires its
  production database/domain/secrets.

Screenshot/API evidence was regenerated after the 2026-09-05 site-chrome migration.
