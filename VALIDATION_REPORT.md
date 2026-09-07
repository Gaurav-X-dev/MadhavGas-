# Validation Report

## Public UI blocks

Checked against the approved `MadhavGas-deploy` HTML, CSS and runtime:

- Shared top bar, dual MBGA + Bharatgas lockup, desktop navigation and mobile drawer
- Home hero, quick actions, QR, about, services, products, safety, trust, journey, partnership, sustainability, gallery and agency details
- Product catalog and managed supply workflow
- Separate MBGA and Bharatgas identity cards plus dynamic journey timeline
- MBGA/BGA achievement cards and certificate block
- Sustainability cards, circular supply chain and CTA
- Gallery filters, image/video items and video hub
- Contact details, enquiry/feedback form and contact QR
- Newsletter, CTA, local discovery, footer QR, floating actions and mobile action bar

Approved class names and assets are retained. Dynamic values are HTML-escaped. Desktop and mobile Chrome renders were checked; loader timing and narrow journey-logo overflow were corrected.

The enhancement brief's references to Template 1 and Template 2 were intentionally mapped to the single approved `MadhavGas-deploy` visual system. The dynamic application contains seven production routes rather than two duplicate static template sets.

## Premium finishing pass

- Idempotent shared runtime prevents duplicate initialization during Next.js development and client hydration
- Accessible skip link, visible focus behavior, mobile-menu focus transfer, modal focus trap and ARIA modal state
- Script-failure fallback keeps reveal content visible and reduced-motion preferences remain respected
- Local dynamic QR image in the footer; no third-party QR dependency
- Unique titles, descriptions, canonical/OpenGraph metadata, `en-IN` language and LocalBusiness JSON-LD
- Unverified dates, delivery totals, customer totals and remote stock-photo fallbacks removed from public content
- Mobile journey reveals no longer introduce horizontal overflow
- Dead Privacy/Terms links removed because matching pages do not exist
- Public typography rebalanced with smaller display/page headings, relaxed line-height and lighter navigation, button, label and card weights on desktop and mobile

## Validation layers

- Frontend: required fields, format and minimum-length checks, slug/email uniqueness, order bounds and last-Super-Admin protection
- Public forms: strict name/email/phone/subject/message/rating schemas, honeypot handling and IP throttling
- Newsletter: strict email validation, throttling and case-insensitive deduplication
- Admin API: authentication, RBAC, strict per-resource schemas, unknown-field rejection, uniqueness and read-only activity protection
- Settings API: strict schemas for site content, agency, QR and sustainability
- Upload: role check, 5 MB limit, MIME allowlist, file magic-signature verification and collision-safe filenames
- Authentication: bcrypt, signed HttpOnly cookie, inactive-user handling, uniform error and 15-minute brute-force limit
- Database: constraints, unique indexes, collection transactions, audit logs and nested-settings repair
- HTTP: no-sniff, same-origin frame, strict referrer and browser permission headers

## Automated result

`npm run test:validation` covers authentication, Viewer/Support/Editor/Super Admin authorization, all collection GET/PUT operations, duplicate IDs/slugs, read-only and invalid payload cases, all settings, public submission, newsletter deduplication, uploads, QR, export and logout. Temporary users, submissions and uploads are removed.

`npm run test:browser` opens the live Next.js application in real headless Chrome and checks all 7 public routes at 320, 360, 375, 390, 414, 480, 768, 1024, 1280, 1440, 1600 and 1920 pixels. Final result: **84/84 renders passed** with zero JavaScript errors, broken images, broken internal links or horizontal overflow.

Final API/RBAC smoke result: **55/55 checks passed**. Production build completed successfully and `npm audit` reported **0 vulnerabilities**.

Final commands:

```text
npm run db:setup
npm run db:check
npm run lint
npm run typecheck
npm run build
npm run test:validation
npm run test:browser
npm audit
```
