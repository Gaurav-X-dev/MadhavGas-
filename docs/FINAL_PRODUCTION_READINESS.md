# Final Production Readiness

## Decision

**Code build: PASS. Local database, API and browser verification: PASS.**

The local PostgreSQL password was reset to the configured development value, the migration
was applied, and the full dynamic/API/browser evidence suites now pass. Hostinger deployment
still requires production-specific database, secret, domain and optional SMTP values.

| Gate | Status | Evidence |
| --- | --- | --- |
| TypeScript / lint / production compilation | PASS | `docs/FINAL_TEST_REPORT.md` |
| Dynamic navigation/footer/newsletter/CTA | IMPLEMENTED | `cms_singletons.site-chrome`, admin editor and runtime |
| Dynamic contact copy and modes | IMPLEMENTED | `cms_singletons.contact-settings` and server validation |
| Migration compatibility | IMPLEMENTED | `migrations/013_full_dynamic_site_chrome.sql` |
| Current DB migration run | PASS | Migration 013 applied to `madhav-gas` |
| Current admin login and API E2E | PASS | 249 validation/RBAC checks |
| Current responsive/browser evidence | PASS | 77 public renders, 168 admin renders and 57 screenshots |
| SMTP delivery | BLOCKED EXTERNALLY | Provider credentials not supplied |

## Local launch

- Development: double-click `run-project.bat`.
- Production-mode verification: double-click `run-production.bat`.
- Both launchers validate PostgreSQL credentials before migration/start.

## Hostinger deployment checklist

1. Use Node.js 22.
2. Create a dedicated PostgreSQL database/user; do not deploy with the default `postgres` user.
3. Configure the variables from `.env.example` in hPanel and use a random `AUTH_SECRET`.
4. Run `npm ci`, `npm run db:check`, `npm run db:setup`, and `npm run build`.
5. Start with `npm start` behind Hostinger HTTPS/reverse proxy.
6. Put `public/uploads` on persistent writable storage and back it up with PostgreSQL.
7. Configure SMTP later using `docs/SMTP_SETUP.md`.

## Client inputs still required

- Production Hostinger PostgreSQL connection values and public domain.
- Production `AUTH_SECRET` and a strong production admin password.
- SMTP provider credentials for real delivery.
