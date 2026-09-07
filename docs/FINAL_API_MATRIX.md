# Final API Matrix

| Route | Method | Access | Main validation/behavior | Final verification |
| --- | --- | --- | --- | --- |
| `/api/auth/login` | POST | Public | JSON/type/size checks, bcrypt, attempt throttling, signed HttpOnly SameSite=Strict cookie | 200/400/401/415 tested |
| `/api/auth/me` | GET | Session | Re-checks active user and current role from DB | Active 200, logged-out/deactivated 401 |
| `/api/auth/logout` | POST | Session | Same-origin protection and cookie expiry | 200 and cross-origin 403 |
| `/api/admin/resources/[resource]` | GET | Authenticated | Valid resource, real DB collection; Activity is read-only | All resources load; Activity 200 |
| `/api/admin/resources/[resource]` | PUT | Role-aware | Strict item schemas, unique IDs/slugs/emails, body limit, origin check | CRUD/RBAC/400/403/405/409 tested |
| `/api/admin/settings/[key]` | GET/PUT | Authenticated / Editor+ write | Ten allowlisted singleton groups, strict schemas and explicit save | Static build passes; current live suite blocked by DB credential |
| `/api/admin/upload` | POST | Super Admin/Editor | JPG/PNG/WebP only, 5 MB, MIME-extension match, structural dimensions, random safe path | Invalid and valid uploads tested |
| `/uploads/[filename]` | GET | Public | Strict generated-name allowlist, path containment, correct MIME/cache/nosniff | Production runtime GET 200 and unsafe path 404 |
| `/api/public/content` | GET | Public | Unified dynamic loader; filters archived/draft items, returns public groups including `site-chrome`/contact settings, and strips private agency fields | Static build passes; current live suite blocked by DB credential |
| `/api/public/submit` | POST | Public | Discriminated booking/enquiry/feedback schema, honeypot, size/rate limits, transactional persistence | Valid/invalid shapes, 201 references, 413/429 tested |
| `/api/public/newsletter` | POST | Public | Normalization, uniqueness, idempotency, rate limit, safe mail failure behavior | 201 create, 200 duplicate and invalid 400 |
| `/api/admin/newsletter` | GET/PATCH | Authenticated / Editor+ write | Search/status filter and lifecycle changes | List/filter/unsubscribe/reactivate/RBAC tested |
| `/api/public/qr` | GET | Public | Locally generated PNG from safe configured target | Image response 200 |
| `/api/admin/email/status` | GET | Authenticated | Returns readiness/missing variable names, never credentials | 200 and no password exposure |
| `/api/admin/email/test` | POST | Super Admin | Recipient validation, reusable SMTP transport, delivery/audit log | 400 invalid; honest 409 while unconfigured; Editor 403 |
| `/api/admin/search` | GET | Authenticated | 2-80 chars, escaped LIKE pattern, scoped result routes | Booking match and oversized 400 |
| `/api/admin/export` | GET | Super Admin | JSON backup of content, settings, operations, subscribers, mail and audit | 200 verified |
| `/api/admin/data` | DELETE | Super Admin | Transactional operational-record cleanup only | Role protection implemented; destructive UI confirmation required |
| `/api/public/qr` and `/favicon.ico` | GET | Public | No external QR service; favicon resolves to local icon | Zero unexpected browser 404s |

All SQL value inputs use PostgreSQL parameters. Mutation APIs require JSON where applicable, enforce payload limits, and reject cross-site origins when an Origin header is present.
