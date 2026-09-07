# Final Baseline

Captured: 2026-08-22 12:42:14 +05:30 (Asia/Calcutta)

## Repository inspection

| Area | Baseline finding |
| --- | --- |
| Application | Existing `gas-code` application inside `Gas-Website`; no replacement application created |
| Visual source of truth | Read-only `../MadhavGas-deploy` reference retained |
| Framework | Next.js 16.3.1, React 19.2.8, App Router |
| Language | TypeScript 5.2.2 with `strict: true` |
| Runtime used for this audit | Node.js v24.18.0, npm 11.16.0 |
| Supported runtime declared by project | Node.js `>=20 <23` (use Node 20 or 22 in production) |
| Database | PostgreSQL via `pg`; `DATABASE_URI` loaded server-side |
| Data layer | Parameterized SQL plus JSONB CMS documents/singletons; no ORM |
| Schema/migrations | Idempotent schema and data migration in `scripts/setup-db.mjs` |
| Authentication | bcrypt password hashes; signed `jose` JWT in HttpOnly cookie; role checks on admin APIs |
| Admin routes | Login, Dashboard, Bookings, Enquiries, Feedback, Products, Gallery, Journey, Achievements, Sustainability, Site Content, QR Settings, Users, Settings |
| Public routes | Home, Products, Journey, Achievements, Sustainability, Gallery, Contact |
| Validation | Zod on write APIs plus page-level client validation |
| Upload storage | Random server filenames under `public/uploads`; MIME/size/signature validation |
| Existing automated QA | API/RBAC smoke (`scripts/validation-smoke.mjs`) and Chromium CDP browser QA (`scripts/browser-qa.mjs`) |
| Email baseline | No SMTP transport or real email delivery existed |
| Newsletter baseline | Database insert existed, but no subscriber admin route/status workflow |
| Environment baseline | `DATABASE_URI`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` |

## Commands run before the hardening edits

| Command | Result | Existing error/warning | Timestamp |
| --- | --- | --- | --- |
| `npm.cmd run lint` | PASS | None | 2026-08-22 12:35 +05:30 |
| `npm.cmd run typecheck` | PASS | None | 2026-08-22 12:35 +05:30 |
| `npm.cmd run db:check` | PASS | `{ admins: 1, documents: 14, settings: 4, submissions: 0 }` | 2026-08-22 12:35 +05:30 |
| `npm.cmd run build` | PASS | 26 routes generated/compiled | 2026-08-22 12:36 +05:30 |
| `npm.cmd run test:validation` against production server | PASS (55/55) | The suite did not cover the visible Activity GET defect or malformed booking persistence | 2026-08-22 12:41 +05:30 |
| `npm.cmd audit --omit=dev` | BLOCKED at baseline | Sandbox/cache access prevented the registry request; it was re-run after dependency setup | 2026-08-22 12:35 +05:30 |

## Reproduced baseline defects

- `GET /api/admin/resources/activity` returned `405 Activity is read-only` because an early return made the real read query unreachable.
- “Commercial Cylinder Booking” in the public contact selector was converted to an enquiry, and the server's booking branch built an enquiry-shaped CMS document.
- Site Content exposed only one combined `logoUrl`, so Bharatgas and MBGA could not be uploaded, replaced or persisted independently.
- `heroSlides.*.image` used a generic URL error and new slides started with an invalid empty required image, while singleton settings also auto-saved incomplete form state.
- Newsletter subscribers had no dedicated admin workflow, active/unsubscribed status or unsubscribe flow.
- Settings showed editable email copy but there was no SMTP transport, configuration status or admin-only test-email endpoint.
- Admin header search and notifications were static affordances with fabricated sample values.

No generated dependency trees (`node_modules`, `.next`) were manually audited.
