# Public Dynamic Map

All operational and editable public content below is sourced from PostgreSQL. `MadhavGas-deploy` remains a read-only visual reference; it is not a second runtime application.

| Public feature | Admin source | Database source | Server/API path | Public consumers | Publish rule |
| --- | --- | --- | --- | --- | --- |
| Hero slides | Site Content | `cms_singletons.site-content.heroSlides` | `/api/admin/settings/site-content` | Home hero and dynamic metadata | Only configured slides; schema requires at least one valid slide |
| Bharatgas logo | Site Content | `site-content.bharatgasLogoUrl/Alt` | Admin settings + `/uploads/[filename]` | Header, agency cards, Journey and footer | Independent from MBGA asset |
| MBGA logo | Site Content | `site-content.mbgaLogoUrl/Alt` | Admin settings + `/uploads/[filename]` | Header, agency cards, Journey and footer | Independent from Bharatgas asset |
| Navigation, newsletter, CTA and footer copy | Site Content → Navigation & Footer | `cms_singletons.site-chrome` | `/api/admin/settings/site-chrome` | Shared public header and footer runtime on every page | Visibility/order and all customer-facing labels are stored |
| Page banners | Each module's Page Content screen | `cms_singletons.page-heroes` | `/api/admin/settings/page-heroes` | Products, Journey, Achievements, Gallery and Contact headers | Per-page image, alt text and copy |
| Assist panel and gallery video hub | Site Content / Gallery Page Content | `cms_singletons.site-sections` | `/api/admin/settings/site-sections` | Shared agency-assistance panel and Gallery video section | Each section has its own visibility switch |
| Products | Products | `cms_documents`, resource `products` | `/api/admin/resources/products` | Home product section, Products page, booking product selector | Excludes `archived=true` |
| Gallery | Gallery | `cms_documents`, resource `gallery` | `/api/admin/resources/gallery` | Gallery filters/lightbox | Only `status=Published` |
| Journey | Journey | `cms_documents`, resource `journey` | `/api/admin/resources/journey` | Home featured story and Journey timeline | Only `published=true`; featured prioritized at home |
| Achievements | Achievements | `cms_documents`, resource `achievements` | `/api/admin/resources/achievements` | Achievements page | Only `published=true` |
| Sustainability | Sustainability | `cms_singletons.sustainability` | `/api/admin/settings/sustainability` | Sustainability cards, detailed content and supply-chain flow | All saved structured fields |
| Agency contact/settings | Settings | `cms_singletons.agency-settings` | `/api/admin/settings/agency-settings` | Public shell, contact CTAs, footer, structured data and emails | Private notification/template fields removed from public API |
| QR booking | QR Settings | `cms_singletons.qr-settings` | `/api/admin/settings/qr-settings`, `/api/public/qr` | Home, Contact and footer Safety First/booking block | Safe local or HTTP(S) URL; WhatsApp fallback |
| Local LPG information | Local Information | `cms_singletons.local-discovery` | `/api/admin/settings/local-discovery` | Shared desktop chip grid and mobile accordions | Active items only, ordered independently by group |
| Contact form copy/modes | Site Content → Navigation & Footer | `cms_singletons.contact-settings` | `/api/admin/settings/contact-settings` | Contact request form and `/api/public/submit` | Disabled modes are rejected by the server as well as hidden in UI |
| Booking | Public Contact form | `submissions` + `cms_documents.bookings` | `/api/public/submit` | Admin Bookings, Dashboard and search | DB commit is primary; email is secondary |
| Enquiry | Public Contact form | `submissions` + `cms_documents.enquiries` | `/api/public/submit` | Admin Enquiries, Dashboard and search | DB commit is primary; email is secondary |
| Feedback | Public Contact form | `submissions` + `cms_documents.feedback` | `/api/public/submit` | Admin Feedback, Dashboard and search | Rating 1-5; React/HTML/email output escapes untrusted text |
| Newsletter | Footer/newsletter form | `newsletter_subscribers` | `/api/public/newsletter`, `/api/admin/newsletter` | Admin Newsletter and token unsubscribe page | Normalized lowercase email; active/unsubscribed lifecycle |
| Admin users | Users | `admin_users` | `/api/admin/resources/users` | Authentication, authorization and user management | At least one active Super Admin required |
| Activity | System-generated | `audit_logs` | `/api/admin/resources/activity` | Dashboard activity feed | Authenticated read-only feed |

## Public pages

`/`, `/products`, `/journey`, `/achievements`, `/sustainability`, `/gallery`, `/contact`, and `/newsletter/unsubscribe` all use the shared dynamic agency shell. The public content endpoint intentionally omits notification preferences and email templates.
