# Final Test Report

Verification date: 2026-09-05 (Asia/Calcutta).

## Current result

| Suite | Result | Actual result |
| --- | --- | --- |
| TypeScript | PASS | `tsc --noEmit`, 0 errors |
| ESLint | PASS | 0 errors |
| Runtime JavaScript syntax | PASS | Public runtime and both CDP QA runners parsed successfully |
| Production build | PASS | Next.js 16.3.1 compiled all 52 route entries |
| PostgreSQL credentials | PASS | Local `postgres` role authenticated against `madhav-gas`; SCRAM host authentication restored |
| Migration 013 | PASS | `013_full_dynamic_site_chrome.sql` applied by `npm run db:setup` |
| Dynamic content audit | PASS | 29 checks, 0 warnings, 0 failures; all 10 singleton groups populated |
| API/RBAC integration | PASS | 249 checks covering authentication, CRUD, validation, uploads, public submissions, QR and exports |
| Browser responsive QA | PASS | 7 public routes × 11 widths = 77 renders; 0 console errors, broken assets/links or horizontal overflow |
| Current screenshot evidence | PASS | 57 screenshots plus 24 admin routes × 7 widths = 168 responsive renders |

The evidence manifest and screenshots were regenerated after the 2026-09-05
dynamic-site-chrome migration and are current for this pass.

## Code paths added and statically verified

- `contact-settings` is now a valid CMS singleton and is included in the DB constraint.
- Shared navigation, newsletter, assistance CTA, footer, QR labels, trust badges and Local
  LPG discovery labels use the new `site-chrome` singleton.
- Contact form copy and enabled request modes are editable and server-enforced.
- `/api/public/content` now returns every public dynamic group and strips private agency
  notification/template fields.
- Development and production launchers stop early with a clear database credential message.
- Validation smoke coverage now includes `site-chrome`, unsafe navigation URLs and dynamic
  footer persistence.

## Reproduction commands

```powershell
npm run db:check
npm run db:setup
npm run audit:content
npm run dev
npm run test:validation
npm run test:browser
npm run test:evidence
```

Headless Chrome QA requires normal local process permissions. In a restricted automation
sandbox the Chrome renderer may be blocked even when the application itself is healthy.
