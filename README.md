# Madhav Bharat Gas Agency - Dynamic Website & Admin

Full-stack Next.js 16 and PostgreSQL application. The public UI follows the approved `MadhavGas-deploy` design while all business content remains manageable from the admin panel.

## Included

- Responsive Home, Products, Journey, Achievements, Sustainability, Gallery and Contact pages
- A fully database-driven home page: every block's copy, imagery, order and visibility is editable under **Admin → Website → Home Page**
- Two independently managed MBGA and Bharatgas logo assets in the navbar, Journey and footer
- QR booking on the home page, contact page and footer
- Premium loader, scroll progress, reveal motion, mobile drawer, timeline animation, gallery filters/lightbox and mobile action bar
- Unique metadata, canonical/OpenGraph tags, LocalBusiness structured data, skip navigation and reduced-motion support
- Dynamic hero slides, products, content, gallery, milestones, achievements and settings
- Commercial and industrial LPG artwork in `public/assets/industrial`, matched to where each
  cylinder size is actually used — a 5 kg at a tea stall, 19 kg behind a restaurant range,
  35 kg feeding a canteen line, and a 47.5 kg manifold on a plant furnace — plus bulk terminal,
  tanker, manifold bank, safety and account-desk scenes
- Gallery images **and videos**: upload an MP4/WebM file (or link a hosted video), give it a
  thumbnail, and it plays in the on-page lightbox with working seek support
- Booking, enquiry, feedback and normalized newsletter subscriber storage in PostgreSQL
- Subscriber administration, unsubscribe tokens, SMTP status and authenticated test-email flow
- bcrypt authentication, signed HttpOnly cookies, role-aware access and audit logs
- Strict frontend and API validation, request throttling and structural JPG/PNG/WebP decoding checks

## Home page content

The home page is assembled at request time from the database — there is no static template
for it. Its structure lives in the `home-content` singleton and is edited under
**Admin → Website → Home Page**:

- **Layout** — reorder any block and switch it on or off without losing its content.
- **Intro & QR / About / Commitments / Safety / Brand & Proof** — copy, imagery and repeatable
  lists (quick tiles, benefit chips, checklist points, metrics, safety steps, trust principles).
- **Linked Sections** — headings and item limits for the blocks that pull live records:
  Products, Journey, Achievements, Sustainability and Gallery. Editing those pages updates the
  home page automatically.

Contact details, hours, address, WhatsApp and the logos come from **Site Content** and
**QR Settings**, so they are never duplicated. Quick tiles accept the tokens `tel:`,
`whatsapp:`, `maps:` and `email:` to reuse those saved values.

Seed values live in `lib/home-defaults.json`, which both the app fallback
(`lib/home-defaults.ts`) and the database seed (`scripts/setup-db.mjs`) read, so the two
cannot drift apart.

### Fallbacks vs. real content

Every public page keeps a seed fallback so a missing record degrades to an empty state
instead of a 500. That safety net can also hide an incomplete database, so
`npm run audit:content` reports the difference: which records really exist, which fallback
each gap would trigger, and whether every referenced image resolves to a file in `public/`.
A clean install seeds all ten singletons and every content collection, so a fresh
`npm run db:setup` starts with **0 failures** — nothing has to be filled in by hand before
launch.

## Artwork

The site ships with vector illustrations so it looks complete before real photography exists.
Every image slot is uploadable from the admin panel — see
[`docs/PHOTO_REPLACEMENT_GUIDE.md`](docs/PHOTO_REPLACEMENT_GUIDE.md) for the full list of
slots, the shape each one crops to and what to photograph for each.


Every image is chosen for its context, not decoration. The `use-*.svg` scenes show the
cylinder in the setting it belongs to:

| Artwork | Shows | Used for |
| --- | --- | --- |
| `use-small-shop.svg` | 5 kg under a tea-stall counter | Gallery |
| `use-restaurant.svg` | 19 kg pair beside a restaurant range | 19 kg product |
| `use-canteen.svg` | 35 kg bank behind a canteen line | 35 kg product |
| `use-industrial.svg` | 47.5 kg manifold feeding a furnace | 47.5 kg product |

The plain cylinder renders (`cylinder-19kg.svg`, `cylinder-35kg.svg`, `cylinder-475kg.svg`)
are kept as alternatives — paste the path into any image field to use one instead.

## Site-wide sections

Two blocks that used to be fixed markup are now stored and editable:

- **Assist panel** — the "How can we assist you?" block shown under the banner on every page.
  Edit at **Site Content → Assist Panel**: the kicker, heading, description, the assistance
  options (icon, title, link) and the footer note.
- **Video hub** — the video section on the gallery page. Edit at **Gallery → Page Content**:
  the featured embed, its copy, and the list of other video topics with their thumbnails.

The admin sidebar also shows the uploaded MBGA logo with the saved agency name beneath it, so
changing either in Site Content updates the panel too.

The **Site Content → Navigation & Footer** tab controls the shared navigation,
newsletter, assistance CTA, footer/QR copy, trust badges, Local LPG Information labels,
and the enabled Contact/Booking/Feedback form modes. These settings are stored in the
`site-chrome` and `contact-settings` singletons and are used by every public route.

## Page banners

Each page's heading strip is edited from that page's own section, via the **Page Content**
button on its list screen — the same place the Sustainability banner has always lived:

| Page | Edit at |
| --- | --- |
| Products | Catalog → Products → **Page Content** |
| Our Journey | Brand Story → Journey → **Page Content** |
| Achievements | Brand Story → Achievements → **Page Content** |
| Gallery | Catalog → Gallery → **Page Content** |
| Sustainability | Brand Story → Sustainability → **Page Content** |
| Contact | Website → Site Content → **Contact & Footer** |

Each one sets the eyebrow, heading, description and the background artwork that sits behind
the dark blue overlay, with a live preview of how the banner will look.

The renderer passes the chosen image to the stylesheet as `--page-hero-image`, so no page
background is hard-coded any more. Seed values live in `lib/page-hero-defaults.json`, shared
by the app fallback and the database seed.

## Newsletter

**Admin → Operations → Newsletter** has two tabs:

- **Compose & Send** — write a subject, heading, opening line, message and an optional button,
  send a test to yourself, then send to every active subscriber. A one-click unsubscribe link
  and `List-Unsubscribe` header are added to every email automatically, and each recipient gets
  a fresh single-use token. Every send is recorded with its delivery counts.
- **Subscribers** — the stored list, with per-address delivery status and unsubscribe/reactivate.

Sending is blocked with a clear message while SMTP is unconfigured, so a campaign can never
look sent when nothing left the server. Viewer and Support Staff roles cannot send.

## Gallery videos

A gallery item can be an image or a video (**Admin → Catalog → Gallery → Media type**).

- **Video file** — upload an MP4 or WebM up to 48 MB. The upload is checked against the real
  container signature, so a renamed image is rejected. Uploaded files are served through
  `/uploads/[filename]` with HTTP byte-range support, so the player's scrubber works.
- **Hosted link** — paste a YouTube (or similar) URL instead of uploading.
- **Thumbnail** — every video needs a poster image; without one the tile would render blank,
  so saving is blocked until one is set.

On the public gallery the tile shows the thumbnail with a play badge. An uploaded file opens
in the page's lightbox; a hosted link opens in a new tab.

## Local setup

1. Install Node.js 20 or 22 and PostgreSQL.
2. Copy `.env.example` to `.env.local` and update the values.
3. Run `npm install`.
4. Run `npm run db:setup`.
5. Run `npm run dev`.

Admin URL: `/admin/login`. The initial account is read from `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

## Environment

```env
DATABASE_URI=postgresql://USER:PASSWORD@HOST:5432/DATABASE
AUTH_SECRET=A_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS
NEXT_PUBLIC_SITE_URL=https://your-domain.example
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=use-a-strong-initial-password
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=smtp-user@example.com
SMTP_PASSWORD=provider-password
SMTP_FROM_EMAIL=no-reply@example.com
SMTP_FROM_NAME=Madhav Bharat Gas Agency
ADMIN_NOTIFICATION_EMAIL=operations@example.com
```

Never commit `.env.local`. Change the initial admin password and `AUTH_SECRET` before production.

## Commands

- `npm run dev` - development server
- `npm run lint` - ESLint checks
- `npm run typecheck` - TypeScript checks
- `npm run build` - production build
- `npm start` - production server
- `npm run db:setup` - idempotent schema setup and seed
- `npm run db:check` - database health check
- `npm run audit:content` - reports whether the live site is running on real database content or on a seed fallback, and verifies every referenced image exists
- `npm run test:validation` - comprehensive API/RBAC/validation checks against a running server on port 3000 (override with `SMOKE_BASE_URL`)
- `npm run test:browser` - renders all 7 public routes in Chrome at 11 responsive widths and checks links, images, console errors, SEO and overflow
- `npm run test:evidence` - creates 57 focused screenshots and audits 24 admin routes at 7 responsive widths (override with `EVIDENCE_BASE_URL`)

SMTP credentials are optional for local UI/database work. Without them, submissions still persist and the admin shows a safe “Email service not configured” status. See `docs/SMTP_SETUP.md`.

For the compact public browser artifact set:

```powershell
$env:BROWSER_QA_SCREENSHOTS='1'; npm.cmd run test:browser
```

## Hostinger deployment

Use a Hostinger plan supporting Node.js applications or a VPS. Set Node.js 22 and configure all environment variables in hPanel. Upload source without `node_modules`, `.next`, `.env.local`, logs or screenshots.

- Build command: `npm run build`
- Start command: `npm start`
- Run once against production PostgreSQL: `npm run db:setup`

Standard Web/Cloud hosting does not provide local PostgreSQL. Use external PostgreSQL or a Hostinger VPS. `public/uploads` must be writable persistent storage and included in backups; uploaded images are served through the validated `/uploads/[filename]` runtime route.

Final QA and deployment documentation is under `docs/`. The delivery archive retains evidence screenshots; a production-only upload may omit `docs/qa-screenshots` if the owner stores the evidence separately.
