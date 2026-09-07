import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { loadLocalEnv } from './env.mjs';

loadLocalEnv();

const base = (process.env.SMOKE_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
if (!adminEmail || !adminPassword) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required for validation QA');
const checks = [];
const qaEmailPattern = 'qa-%@example.test';
const qaIps = ['203.0.113.10', '203.0.113.20', '203.0.113.30', '203.0.113.40', '203.0.113.50'];
const savedReferences = [];
const originalCollections = new Map();
let cookie = '';
let uploadedPath = '';
let originalSiteContent = null;
let originalQrSettings = null;
let originalSustainability = null;
let originalLocalDiscovery = null;
let originalContactSettings = null;
let originalSiteChrome = null;
let database;

function verify(name, condition, detail = '') {
  if (!condition) throw new Error(`${name} failed${detail ? `: ${detail}` : ''}`);
  checks.push(`VERIFY ${name}`);
}

async function request(name, url, options = {}, expected = 200) {
  const headers = {
    ...(options.body && !(options.body instanceof FormData) ? { 'content-type': 'application/json' } : {}),
    ...(cookie ? { cookie } : {}),
    ...options.headers,
  };
  const response = await fetch(`${base}${url}`, { ...options, headers });
  const payload = (response.headers.get('content-type') || '').includes('json') ? await response.json() : await response.text();
  const statuses = Array.isArray(expected) ? expected : [expected];
  if (!statuses.includes(response.status)) {
    throw new Error(`${name}: ${options.method || 'GET'} ${url} expected ${statuses.join('/')}, received ${response.status}: ${JSON.stringify(payload)}`);
  }
  checks.push(`${name} -> ${response.status}`);
  return { response, payload };
}

async function loginAs(email, password, ip = qaIps[0]) {
  const result = await request(
    `Login ${email}`,
    '/api/auth/login',
    { method: 'POST', headers: { 'x-forwarded-for': ip }, body: JSON.stringify({ email, password }) },
  );
  cookie = (result.response.headers.get('set-cookie') || '').split(';')[0];
  verify(`Session cookie issued for ${email}`, Boolean(cookie));
  return result;
}

async function expectDbFailure(name, sql, params, allowedCodes) {
  try {
    await database.query(sql, params);
  } catch (error) {
    verify(name, allowedCodes.includes(error.code), `received PostgreSQL code ${error.code || 'unknown'}`);
    return;
  }
  throw new Error(`${name} failed: invalid database write unexpectedly succeeded`);
}

async function cleanQaData() {
  if (!database) return;
  const refs = await database.query("SELECT reference_no FROM submissions WHERE data->>'email' LIKE $1 OR data->>'name' LIKE 'QA Smoke%'", [qaEmailPattern]);
  const referenceNumbers = [...new Set([...savedReferences, ...refs.rows.map((row) => row.reference_no)])];
  if (referenceNumbers.length) {
    await database.query('DELETE FROM email_delivery_logs WHERE submission_reference = ANY($1::varchar[])', [referenceNumbers]);
    await database.query("DELETE FROM audit_logs WHERE metadata->>'reference' = ANY($1::text[])", [referenceNumbers]);
  }
  await database.query('DELETE FROM email_delivery_logs WHERE recipient LIKE $1', [qaEmailPattern]);
  await database.query("DELETE FROM cms_documents WHERE document_id LIKE 'qa-smoke-%' OR data->>'email' LIKE $1 OR data->>'customerName' LIKE 'QA Smoke%'", [qaEmailPattern]);
  await database.query("DELETE FROM submissions WHERE data->>'email' LIKE $1 OR data->>'name' LIKE 'QA Smoke%'", [qaEmailPattern]);
  await database.query('DELETE FROM newsletter_subscribers WHERE email LIKE $1', [qaEmailPattern]);
  await database.query("DELETE FROM admin_users WHERE email LIKE 'qa-%@example.test'");
  await database.query("DELETE FROM auth_attempts WHERE email LIKE 'qa-%@example.test' OR email=LOWER($1) OR ip = ANY($2::varchar[])", [adminEmail, qaIps]);
  await database.query('DELETE FROM public_request_events WHERE ip = ANY($1::varchar[])', [qaIps]);
}

async function restoreCollection(resource, items) {
  await database.query('BEGIN');
  try {
    await database.query('DELETE FROM cms_documents WHERE resource=$1', [resource]);
    for (const [index, item] of items.entries()) {
      await database.query(
        'INSERT INTO cms_documents(resource,document_id,data,sort_order) VALUES($1,$2,$3::jsonb,$4)',
        [resource, item.id, JSON.stringify(item), Number(item.displayOrder ?? index)],
      );
    }
    await database.query('COMMIT');
  } catch (error) {
    await database.query('ROLLBACK');
    throw error;
  }
}

async function collectionCrud(resource, item, changedField, changedValue) {
  const current = await request(`Load ${resource}`, `/api/admin/resources/${resource}`);
  originalCollections.set(resource, current.payload.items);
  await request(`Create ${resource} item`, `/api/admin/resources/${resource}`, {
    method: 'PUT', body: JSON.stringify({ items: [...current.payload.items, item] }),
  });
  const created = await request(`Read created ${resource} item`, `/api/admin/resources/${resource}`);
  verify(`${resource} create persisted`, created.payload.items.some((entry) => entry.id === item.id));
  const editedItems = created.payload.items.map((entry) => entry.id === item.id ? { ...entry, [changedField]: changedValue } : entry);
  await request(`Edit ${resource} item`, `/api/admin/resources/${resource}`, { method: 'PUT', body: JSON.stringify({ items: editedItems }) });
  const edited = await request(`Read edited ${resource} item`, `/api/admin/resources/${resource}`);
  verify(`${resource} edit persisted`, edited.payload.items.find((entry) => entry.id === item.id)?.[changedField] === changedValue);
  await request(`Delete ${resource} item`, `/api/admin/resources/${resource}`, { method: 'PUT', body: JSON.stringify({ items: current.payload.items }) });
  const removed = await request(`Verify deleted ${resource} item`, `/api/admin/resources/${resource}`);
  verify(`${resource} delete persisted`, !removed.payload.items.some((entry) => entry.id === item.id));
}

async function publicEmptyState(resource, publicPath, marker) {
  const original = originalCollections.get(resource);
  verify(`${resource} baseline captured before empty-state test`, Array.isArray(original));
  await request(`Save empty ${resource} collection`, `/api/admin/resources/${resource}`, { method: 'PUT', body: JSON.stringify({ items: [] }) });
  const content = await request(`Read empty public ${resource} data`, '/api/public/content');
  verify(`Public ${resource} does not fall back to demo data`, Array.isArray(content.payload[resource]) && content.payload[resource].length === 0);
  const page = await request(`Render public ${resource} empty state`, publicPath);
  verify(`Public ${resource} empty message renders`, typeof page.payload === 'string' && page.payload.includes(marker));
  await request(`Restore ${resource} after empty-state test`, `/api/admin/resources/${resource}`, { method: 'PUT', body: JSON.stringify({ items: original }) });
}

try {
  database = new pg.Client({ connectionString: process.env.DATABASE_URI });
  await database.connect();
  await cleanQaData();

  const signedOutAdminRoot = await request('Signed-out admin root redirects to login', '/admin', { redirect: 'manual' }, 307);
  verify(
    'Signed-out admin redirect target is correct',
    new URL(signedOutAdminRoot.response.headers.get('location') ?? '/', base).pathname === '/admin/login',
  );
  await request('Unauthenticated admin API is protected', '/api/admin/resources/products', {}, 401);
  await request('Unauthenticated newsletter admin API is protected', '/api/admin/newsletter', {}, 401);
  await request('Login rejects wrong content type', '/api/auth/login', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' }, 415);
  await request('Login rejects malformed JSON', '/api/auth/login', { method: 'POST', headers: { 'x-forwarded-for': qaIps[0] }, body: '{bad json' }, 400);
  await request('Login rejects wrong password', '/api/auth/login', { method: 'POST', headers: { 'x-forwarded-for': qaIps[0] }, body: JSON.stringify({ email: adminEmail, password: 'wrong-password' }) }, 401);
  const adminLogin = await loginAs(adminEmail, adminPassword);
  verify('Session cookie is HttpOnly', /HttpOnly/i.test(adminLogin.response.headers.get('set-cookie') || ''));
  verify('Session cookie uses SameSite Strict', /SameSite=Strict/i.test(adminLogin.response.headers.get('set-cookie') || ''));
  await request('Authenticated session lookup', '/api/auth/me');
  const signedInAdminRoot = await request('Signed-in admin root redirects to dashboard', '/admin', { redirect: 'manual' }, 307);
  verify(
    'Signed-in admin redirect target is correct',
    new URL(signedInAdminRoot.response.headers.get('location') ?? '/', base).pathname === '/admin/dashboard',
  );

  const home = await request('Public home responds', '/');
  verify('Security CSP header is present', Boolean(home.response.headers.get('content-security-policy')));
  verify('MIME sniffing protection is present', home.response.headers.get('x-content-type-options') === 'nosniff');
  await request('Unknown collection returns 404', '/api/admin/resources/not-a-resource', {}, 404);
  await request('Activity GET is available', '/api/admin/resources/activity');
  await request('Activity remains read-only', '/api/admin/resources/activity', { method: 'PUT', body: JSON.stringify({ items: [] }) }, 405);

  const productData = await request('Load products for validation', '/api/admin/resources/products');
  const firstProduct = productData.payload.items[0];
  verify('Seed product exists', Boolean(firstProduct));
  await request('Reject invalid product shape', '/api/admin/resources/products', { method: 'PUT', body: JSON.stringify({ items: [{ id: 'invalid' }] }) }, 400);
  await request('Reject duplicate product IDs', '/api/admin/resources/products', { method: 'PUT', body: JSON.stringify({ items: [firstProduct, { ...firstProduct }] }) }, 409);
  await request('Reject duplicate product slugs', '/api/admin/resources/products', { method: 'PUT', body: JSON.stringify({ items: [firstProduct, { ...firstProduct, id: 'qa-smoke-duplicate-slug' }] }) }, 409);
  await request('Reject cross-origin admin mutation', '/api/admin/resources/products', { method: 'PUT', headers: { origin: 'https://evil.example' }, body: JSON.stringify({ items: productData.payload.items }) }, 403);
  await request('Reject oversized JSON body', '/api/admin/resources/products', { method: 'PUT', body: JSON.stringify({ items: [], padding: 'x'.repeat(2 * 1024 * 1024 + 1000) }) }, 413);

  const invalidUpload = new FormData();
  invalidUpload.append('file', new File([new TextEncoder().encode('not an image')], 'fake.png', { type: 'image/png' }));
  await request('Reject incomplete image', '/api/admin/upload', { method: 'POST', body: invalidUpload }, 400);
  const svgUpload = new FormData();
  svgUpload.append('file', new File([new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>')], 'unsafe.svg', { type: 'image/svg+xml' }));
  await request('Reject SVG upload', '/api/admin/upload', { method: 'POST', body: svgUpload }, 400);
  const mismatchUpload = new FormData();
  mismatchUpload.append('file', new File([Buffer.from('iVBORw0KGgo=', 'base64')], 'mismatch.jpg', { type: 'image/png' }));
  await request('Reject image extension mismatch', '/api/admin/upload', { method: 'POST', body: mismatchUpload }, 400);
  const oversizedUpload = new FormData();
  oversizedUpload.append('file', new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'oversized.png', { type: 'image/png' }));
  await request('Reject image over 5 MB', '/api/admin/upload', { method: 'POST', body: oversizedUpload }, 400);

  const sourceHero = await fs.readFile(path.join(process.cwd(), 'public', 'assets', 'images', 'agency-support.webp'));
  const validUpload = new FormData();
  validUpload.append('file', new File([sourceHero], 'qa-hero.webp', { type: 'image/webp' }));
  const upload = await request('Upload valid replacement hero', '/api/admin/upload', { method: 'POST', body: validUpload });
  verify('Upload response uses randomized local path', /^\/uploads\/[0-9]+-[a-f0-9]{24}\.webp$/.test(upload.payload.url));
  verify('Upload reports image dimensions', upload.payload.width > 0 && upload.payload.height > 0);
  uploadedPath = path.join(process.cwd(), 'public', String(upload.payload.url).replace(/^\//, ''));
  const servedUpload = await request('Serve runtime upload in production', upload.payload.url);
  verify('Runtime upload has the correct MIME type', servedUpload.response.headers.get('content-type')?.startsWith('image/webp'));
  verify('Runtime upload prevents MIME sniffing', servedUpload.response.headers.get('x-content-type-options') === 'nosniff');
  await request('Reject unsafe upload filename route', '/uploads/../package.json', {}, 404);

  const site = await request('Load Site Content', '/api/admin/settings/site-content');
  originalSiteContent = site.payload.data;
  verify('Bharatgas logo has independent storage', Boolean(originalSiteContent.bharatgasLogoUrl && originalSiteContent.bharatgasLogoAlt));
  verify('MBGA logo has independent storage', Boolean(originalSiteContent.mbgaLogoUrl && originalSiteContent.mbgaLogoAlt));
  verify('Legacy merged logo field is absent', !Object.hasOwn(originalSiteContent, 'logoUrl'));
  const invalidHero = {
    ...originalSiteContent,
    heroSlides: [...originalSiteContent.heroSlides, { ...originalSiteContent.heroSlides[0], id: 'qa-smoke-invalid-hero', image: '' }],
  };
  const invalidHeroResult = await request('Reject missing hero image with friendly error', '/api/admin/settings/site-content', { method: 'PUT', body: JSON.stringify(invalidHero) }, 400);
  verify('Hero error identifies the exact slide and field', /Slide \d+ image is invalid/i.test(invalidHeroResult.payload.error), invalidHeroResult.payload.error);
  await request('Reject CMS markup injection', '/api/admin/settings/site-content', { method: 'PUT', body: JSON.stringify({ ...originalSiteContent, agencyIntro: '<script>alert(1)</script> unsafe copy' }) }, 400);
  const changedSite = {
    ...originalSiteContent,
    bharatgasLogoUrl: '/assets/brands/bharatgas-logo.svg?qa=bharatgas',
    mbgaLogoUrl: '/assets/brands/mbga-logo.svg?qa=mbga',
    heroSlides: originalSiteContent.heroSlides.map((slide, index) => index === 0 ? { ...slide, image: upload.payload.url } : slide),
  };
  await request('Save independent logos and replacement hero', '/api/admin/settings/site-content', { method: 'PUT', body: JSON.stringify(changedSite) });
  const changedSiteRead = await request('Reload Site Content after save', '/api/admin/settings/site-content');
  verify('Bharatgas logo persisted independently', changedSiteRead.payload.data.bharatgasLogoUrl.endsWith('?qa=bharatgas'));
  verify('MBGA logo persisted independently', changedSiteRead.payload.data.mbgaLogoUrl.endsWith('?qa=mbga'));
  verify('Replacement hero persisted', changedSiteRead.payload.data.heroSlides[0].image === upload.payload.url);
  const changedPublic = await request('Public content reflects logo and hero update', '/api/public/content');
  verify('Public Bharatgas logo is dynamic', changedPublic.payload.siteContent.bharatgasLogoUrl.endsWith('?qa=bharatgas'));
  verify('Public MBGA logo is dynamic', changedPublic.payload.siteContent.mbgaLogoUrl.endsWith('?qa=mbga'));
  verify('Public hero is dynamic', changedPublic.payload.siteContent.heroSlides[0].image === upload.payload.url);
  await request('Restore valid existing Site Content', '/api/admin/settings/site-content', { method: 'PUT', body: JSON.stringify(originalSiteContent) });

  const qr = await request('Load QR settings', '/api/admin/settings/qr-settings');
  originalQrSettings = qr.payload.data;
  await request('Save valid QR settings', '/api/admin/settings/qr-settings', { method: 'PUT', body: JSON.stringify(originalQrSettings) });
  await request('Reject unsafe QR protocol', '/api/admin/settings/qr-settings', { method: 'PUT', body: JSON.stringify({ ...originalQrSettings, bookingUrl: 'javascript:alert(1)' }) }, 400);
  await request('Reject malformed WhatsApp number', '/api/admin/settings/qr-settings', { method: 'PUT', body: JSON.stringify({ ...originalQrSettings, whatsappNumber: 'bad-number' }) }, 400);
  await request('Generate local public QR code', '/api/public/qr');

  const sustainability = await request('Load Sustainability settings', '/api/admin/settings/sustainability');
  originalSustainability = sustainability.payload.data;
  await request('Save Sustainability settings', '/api/admin/settings/sustainability', { method: 'PUT', body: JSON.stringify(originalSustainability) });
  await request('Reject invalid Sustainability card', '/api/admin/settings/sustainability', { method: 'PUT', body: JSON.stringify({ ...originalSustainability, cards: [{ id: 'qa-smoke-bad', title: 'Bad', description: 'short', icon: 'Leaf', displayOrder: 0 }] }) }, 400);
  const qaSustainability = {
    id: 'qa-smoke-sustainability', title: 'QA Responsible Handling',
    description: 'QA factual responsible handling content proves the admin to database to public Sustainability flow.',
    icon: 'ShieldCheck', imageUrl: '', imageAlt: '', displayOrder: 999, published: true,
  };
  await request('Create dynamic Sustainability item', '/api/admin/settings/sustainability', { method: 'PUT', body: JSON.stringify({ ...originalSustainability, cards: [...originalSustainability.cards, qaSustainability] }) });
  const sustainabilityRead = await request('Reload dynamic Sustainability item', '/api/admin/settings/sustainability');
  verify('Sustainability create persisted', sustainabilityRead.payload.data.cards.some((item) => item.id === qaSustainability.id));
  const sustainabilityPublic = await request('Read public Sustainability data', '/api/public/content');
  verify('Published Sustainability item appears publicly', sustainabilityPublic.payload.sustainability.cards.some((item) => item.id === qaSustainability.id));
  const sustainabilityPage = await request('Render dynamic Sustainability page', '/sustainability');
  verify('Dynamic Sustainability title renders in public HTML', sustainabilityPage.payload.includes(qaSustainability.title));
  await request('Restore Sustainability after dynamic test', '/api/admin/settings/sustainability', { method: 'PUT', body: JSON.stringify(originalSustainability) });

  const localDiscovery = await request('Load Local LPG Information', '/api/admin/settings/local-discovery');
  originalLocalDiscovery = localDiscovery.payload.data;
  const qaLocality = { id: 'qa-smoke-locality', label: 'QA Verified Locality', href: '/contact', displayOrder: 999, active: true };
  const qaCategory = { id: 'qa-smoke-category', label: 'QA Commercial Category', href: '/products', displayOrder: 999, active: true };
  const qaTopic = { id: 'qa-smoke-topic', label: 'QA Safety Topic', href: '/sustainability', displayOrder: 999, active: true };
  const changedDiscovery = { ...originalLocalDiscovery, localities: [...originalLocalDiscovery.localities, qaLocality], categories: [...originalLocalDiscovery.categories, qaCategory], topics: [...originalLocalDiscovery.topics, qaTopic] };
  await request('Create Local LPG entities', '/api/admin/settings/local-discovery', { method: 'PUT', body: JSON.stringify(changedDiscovery) });
  const discoveryRead = await request('Reload Local LPG entities', '/api/admin/settings/local-discovery');
  verify('Locality persisted in database', discoveryRead.payload.data.localities.some((item) => item.id === qaLocality.id));
  verify('Category persisted in database', discoveryRead.payload.data.categories.some((item) => item.id === qaCategory.id));
  verify('Topic persisted in database', discoveryRead.payload.data.topics.some((item) => item.id === qaTopic.id));
  const discoveryPublic = await request('Read public Local LPG entities', '/api/public/content');
  verify('Locality appears in public data', discoveryPublic.payload.localDiscovery.localities.some((item) => item.id === qaLocality.id));
  verify('Category appears in public data', discoveryPublic.payload.localDiscovery.categories.some((item) => item.id === qaCategory.id));
  verify('Topic appears in public data', discoveryPublic.payload.localDiscovery.topics.some((item) => item.id === qaTopic.id));
  const discoveryHome = await request('Render dynamic Local LPG Information', '/');
  verify('Dynamic Local LPG data is delivered to the homepage', discoveryHome.payload.includes(qaLocality.label) && discoveryHome.payload.includes(qaCategory.label) && discoveryHome.payload.includes(qaTopic.label));
  await request('Reject unsafe Local LPG destination', '/api/admin/settings/local-discovery', { method: 'PUT', body: JSON.stringify({ ...changedDiscovery, topics: [{ ...qaTopic, href: 'javascript:alert(1)' }] }) }, 400);
  await request('Restore Local LPG Information after dynamic test', '/api/admin/settings/local-discovery', { method: 'PUT', body: JSON.stringify(originalLocalDiscovery) });
  const agency = await request('Load Agency settings', '/api/admin/settings/agency-settings');
  await request('Save Agency settings', '/api/admin/settings/agency-settings', { method: 'PUT', body: JSON.stringify(agency.payload.data) });

  const siteChrome = await request('Load shared navigation and footer settings', '/api/admin/settings/site-chrome');
  originalSiteChrome = siteChrome.payload.data;
  const changedSiteChrome = {
    ...originalSiteChrome,
    footer: { ...originalSiteChrome.footer, supportTitle: 'QA Dynamic Helpdesk' },
  };
  await request('Save shared navigation and footer settings', '/api/admin/settings/site-chrome', { method: 'PUT', body: JSON.stringify(changedSiteChrome) });
  const publicChrome = await request('Read shared navigation and footer settings publicly', '/api/public/content');
  verify('Shared footer content is dynamic', publicChrome.payload.siteChrome.footer.supportTitle === 'QA Dynamic Helpdesk');
  await request('Reject unsafe navigation destination', '/api/admin/settings/site-chrome', { method: 'PUT', body: JSON.stringify({ ...changedSiteChrome, navigation: [{ ...changedSiteChrome.navigation[0], href: 'javascript:alert(1)' }] }) }, 400);
  await request('Restore shared navigation and footer settings', '/api/admin/settings/site-chrome', { method: 'PUT', body: JSON.stringify(originalSiteChrome) });

  const contactSettings = await request('Load Contact Settings', '/api/admin/settings/contact-settings');
  originalContactSettings = contactSettings.payload.data;
  const changedContactSettings = {
    ...originalContactSettings,
    formTypes: [
      { id: 'enquiry', label: 'LPG Enquiry', enabled: true, displayOrder: 1 },
      { id: 'booking', label: 'Commercial Cylinder Booking', enabled: false, displayOrder: 2 },
      { id: 'feedback', label: 'Feedback or Complaint', enabled: true, displayOrder: 3 },
    ]
  };
  await request('Save Contact Settings with disabled booking', '/api/admin/settings/contact-settings', { method: 'PUT', body: JSON.stringify(changedContactSettings) });
  await request('Reject disabled form type submission', '/api/public/submit', { method: 'POST', headers: { 'x-forwarded-for': qaIps[1] }, body: JSON.stringify({ type: 'booking', name: 'QA Smoke Booking', phone: '+91 98765 43210', email: 'qa-booking@example.test', businessName: 'QA Kitchen', cylinderType: '19 kg Commercial LPG Cylinder', quantity: 3, deliveryArea: 'Sector 70, Gurugram', message: 'QA booking notes' }) }, 400);
  await request('Restore valid existing Contact Settings', '/api/admin/settings/contact-settings', { method: 'PUT', body: JSON.stringify(originalContactSettings) });

  await collectionCrud('products', {
    ...firstProduct, id: 'qa-smoke-product', name: 'QA Smoke Commercial Cylinder', slug: 'qa-smoke-commercial-cylinder', displayOrder: 999,
  }, 'description', 'Updated QA product description that proves admin edit persistence.');
  await publicEmptyState('products', '/products', 'No LPG products are currently published.');
  await collectionCrud('gallery', {
    id: 'qa-smoke-gallery', type: 'Image', url: upload.payload.url, category: 'QA', altText: 'QA uploaded LPG service image', caption: 'QA gallery upload', displayOrder: 999, status: 'Published',
  }, 'caption', 'QA gallery item updated');
  await publicEmptyState('gallery', '/gallery', 'No gallery media is currently published.');

  const journeyCurrent = await request('Load Journey for published filtering', '/api/admin/resources/journey');
  originalCollections.set('journey', journeyCurrent.payload.items);
  const publishedJourney = { id: 'qa-smoke-journey-published', year: '', category: 'QA Service', title: 'QA MBGA Journey', description: 'Published QA milestone used to verify the Madhav Bharat Gas Journey data chain.', brand: 'MBGA', icon: 'Route', imageUrl: upload.payload.url, imageAlt: 'QA Journey service milestone', displayOrder: 998, published: true, featured: true };
  const bharatgasJourney = { ...publishedJourney, id: 'qa-smoke-journey-bharatgas', title: 'QA Bharatgas Journey', description: 'Published QA milestone used to verify the Bharatgas Journey data chain.', brand: 'Bharatgas', featured: false, displayOrder: 999 };
  const draftJourney = { ...publishedJourney, id: 'qa-smoke-journey-draft', title: 'QA Draft Journey', published: false, featured: false, displayOrder: 1000 };
  await request('Reject removed Shared Journey type', '/api/admin/resources/journey', { method: 'PUT', body: JSON.stringify({ items: [...journeyCurrent.payload.items, { ...publishedJourney, id: 'qa-smoke-shared', brand: 'Shared' }] }) }, 400);
  await request('Create both Journey tracks and a draft', '/api/admin/resources/journey', { method: 'PUT', body: JSON.stringify({ items: [...journeyCurrent.payload.items, publishedJourney, bharatgasJourney, draftJourney] }) });
  const journeyPublic = await request('Read filtered public Journey content', '/api/public/content');
  verify('Published MBGA Journey item appears publicly', journeyPublic.payload.journey.some((item) => item.id === publishedJourney.id && item.brand === 'MBGA'));
  verify('Published Bharatgas Journey item appears publicly', journeyPublic.payload.journey.some((item) => item.id === bharatgasJourney.id && item.brand === 'Bharatgas'));
  verify('Draft Journey item stays private', !journeyPublic.payload.journey.some((item) => item.id === draftJourney.id));
  const journeyPage = await request('Render dual-track Journey page', '/journey');
  verify('Both Journey track selectors render', journeyPage.payload.includes('Bharatgas Journey') && journeyPage.payload.includes('Madhav Bharat Gas Journey'));
  const journeyEdited = [...journeyCurrent.payload.items, { ...publishedJourney, description: 'Edited published Journey milestone with persisted admin content.' }, bharatgasJourney, draftJourney];
  await request('Edit Journey item', '/api/admin/resources/journey', { method: 'PUT', body: JSON.stringify({ items: journeyEdited }) });
  const journeyRead = await request('Reload edited Journey item', '/api/admin/resources/journey');
  verify('Journey edit persisted', journeyRead.payload.items.find((item) => item.id === publishedJourney.id)?.description.startsWith('Edited'));
  await request('Delete QA Journey items', '/api/admin/resources/journey', { method: 'PUT', body: JSON.stringify({ items: journeyCurrent.payload.items }) });
  await publicEmptyState('journey', '/journey', 'No Bharatgas Journey milestones are published yet.');

  const achievementCurrent = await request('Load Achievements', '/api/admin/resources/achievements');
  const firstAchievement = achievementCurrent.payload.items[0];
  await collectionCrud('achievements', {
    ...(firstAchievement || { type: 'Recognition', imageUrl: '', published: true }),
    id: 'qa-smoke-achievement', title: 'QA Achievement', description: 'QA recognition item used to prove achievement CRUD and public rendering.', year: 'QA', brand: 'MBGA',
  }, 'description', 'Updated QA recognition description that proves edit persistence.');
  await publicEmptyState('achievements', '/achievements', 'No achievements are currently published.');

  await request('Reject invalid public enquiry', '/api/public/submit', { method: 'POST', headers: { 'x-forwarded-for': qaIps[1] }, body: JSON.stringify({ type: 'enquiry', name: 'A', phone: 'bad', subject: '', message: 'short' }) }, 400);
  await request('Reject oversized public payload', '/api/public/submit', { method: 'POST', headers: { 'x-forwarded-for': qaIps[1] }, body: JSON.stringify({ type: 'enquiry', name: 'QA Smoke', phone: '+91 98765 43210', subject: 'Oversize', message: 'x'.repeat(33000) }) }, 413);
  await request('Reject invalid booking quantity', '/api/public/submit', { method: 'POST', headers: { 'x-forwarded-for': qaIps[1] }, body: JSON.stringify({ type: 'booking', name: 'QA Smoke Booking', phone: '+91 98765 43210', email: 'qa-booking@example.test', businessName: 'QA Kitchen', cylinderType: '19 kg Commercial LPG Cylinder', quantity: 0, deliveryArea: 'Gurugram', message: '' }) }, 400);
  await request('Reject invalid feedback rating', '/api/public/submit', { method: 'POST', headers: { 'x-forwarded-for': qaIps[1] }, body: JSON.stringify({ type: 'feedback', name: 'QA Smoke Feedback', phone: '+91 98765 43210', email: 'qa-feedback@example.test', rating: 6, message: 'This rating must be rejected by validation.' }) }, 400);

  const booking = await request('Create public booking', '/api/public/submit', { method: 'POST', headers: { 'x-forwarded-for': qaIps[1] }, body: JSON.stringify({ type: 'booking', name: 'QA Smoke Booking', phone: '+91 98765 43210', email: 'qa-booking@example.test', businessName: 'QA Kitchen', cylinderType: '19 kg Commercial LPG Cylinder', quantity: 3, deliveryArea: 'Sector 70, Gurugram', message: 'QA booking notes for persistence validation.' }) }, 201);
  savedReferences.push(booking.payload.reference);
  verify('Booking reference uses BKG prefix', /^BKG-\d{4}-[A-F0-9]{8}$/.test(booking.payload.reference));
  const enquiry = await request('Create public enquiry', '/api/public/submit', { method: 'POST', headers: { 'x-forwarded-for': qaIps[2] }, body: JSON.stringify({ type: 'enquiry', name: 'QA Smoke Enquiry', email: 'qa-enquiry@example.test', phone: '+91 98765 43210', subject: 'Commercial LPG requirement', message: 'This QA enquiry proves the public form to admin database workflow.' }) }, 201);
  savedReferences.push(enquiry.payload.reference);
  const feedbackMessage = '<script>globalThis.__qaXssExecuted=true</script> Safe stored customer feedback.';
  const feedback = await request('Create public feedback with escaped markup', '/api/public/submit', { method: 'POST', headers: { 'x-forwarded-for': qaIps[3] }, body: JSON.stringify({ type: 'feedback', name: 'QA Smoke Feedback', email: 'qa-feedback@example.test', phone: '+91 98765 43210', rating: 4, message: feedbackMessage }) }, 201);
  savedReferences.push(feedback.payload.reference);

  const bookingAdmin = await request('Booking appears in admin', '/api/admin/resources/bookings');
  const bookingItem = bookingAdmin.payload.items.find((item) => item.id === booking.payload.reference);
  verify('Booking has booking-specific data shape', bookingItem?.cylinderType === '19 kg Commercial LPG Cylinder' && bookingItem.quantity === 3 && bookingItem.deliveryArea.includes('Gurugram') && !Object.hasOwn(bookingItem, 'subject'));
  await request('Update booking status and note', '/api/admin/resources/bookings', { method: 'PUT', body: JSON.stringify({ items: bookingAdmin.payload.items.map((item) => item.id === booking.payload.reference ? { ...item, status: 'Confirmed', notes: [...item.notes, 'QA admin note'] } : item) }) });
  const bookingUpdated = await request('Reload updated booking', '/api/admin/resources/bookings');
  verify('Booking status persisted', bookingUpdated.payload.items.find((item) => item.id === booking.payload.reference)?.status === 'Confirmed');

  const enquiryAdmin = await request('Enquiry appears in admin', '/api/admin/resources/enquiries');
  verify('Enquiry data shape is correct', enquiryAdmin.payload.items.find((item) => item.id === enquiry.payload.reference)?.subject === 'Commercial LPG requirement');
  const feedbackAdmin = await request('Feedback appears in admin', '/api/admin/resources/feedback');
  const feedbackItem = feedbackAdmin.payload.items.find((item) => item.id === feedback.payload.reference);
  verify('Feedback rating persisted', feedbackItem?.rating === 4);
  verify('Untrusted feedback remains inert data', feedbackItem?.message === feedbackMessage);
  const search = await request('Global search finds public booking', `/api/admin/search?q=${encodeURIComponent('QA Smoke Booking')}`);
  verify('Global search result links to bookings', search.payload.items.some((item) => item.id === booking.payload.reference && item.href === '/admin/bookings'));
  await request('Global search rejects oversized query', `/api/admin/search?q=${'x'.repeat(81)}`, {}, 400);

  for (let index = 0; index < 5; index += 1) {
    const limited = await request(`Rate-limit setup enquiry ${index + 1}`, '/api/public/submit', { method: 'POST', headers: { 'x-forwarded-for': qaIps[4] }, body: JSON.stringify({ type: 'enquiry', name: `QA Smoke Rate ${index + 1}`, email: `qa-rate-${index + 1}@example.test`, phone: '+91 98765 43210', subject: 'Rate limit QA', message: 'Valid temporary enquiry used only to prove rate limiting.' }) }, 201);
    savedReferences.push(limited.payload.reference);
  }
  await request('Public submission rate limit activates', '/api/public/submit', { method: 'POST', headers: { 'x-forwarded-for': qaIps[4] }, body: JSON.stringify({ type: 'enquiry', name: 'QA Smoke Rate 6', email: 'qa-rate-6@example.test', phone: '+91 98765 43210', subject: 'Rate limit QA', message: 'This request must be blocked after the configured limit.' }) }, 429);

  await request('Reject invalid newsletter email', '/api/public/newsletter', { method: 'POST', headers: { 'x-forwarded-for': qaIps[2] }, body: JSON.stringify({ email: 'not-an-email' }) }, 400);
  const newsletter = await request('Create normalized newsletter subscription', '/api/public/newsletter', { method: 'POST', headers: { 'x-forwarded-for': qaIps[2] }, body: JSON.stringify({ email: 'QA-NEWSLETTER@EXAMPLE.TEST' }) }, 201);
  verify('Newsletter records email delivery state', ['Sent', 'Failed', 'Skipped'].includes(newsletter.payload.confirmationEmail));
  const duplicateNewsletter = await request('Newsletter duplicate is idempotent', '/api/public/newsletter', { method: 'POST', headers: { 'x-forwarded-for': qaIps[2] }, body: JSON.stringify({ email: 'qa-newsletter@example.test' }) }, 200);
  verify('Duplicate newsletter response is explicit', duplicateNewsletter.payload.alreadySubscribed === true);
  const subscriberList = await request('Admin lists normalized newsletter subscriber', '/api/admin/newsletter?q=qa-newsletter');
  const subscriber = subscriberList.payload.items.find((item) => item.email === 'qa-newsletter@example.test');
  verify('Newsletter email is stored lowercase', Boolean(subscriber));
  await request('Admin unsubscribes newsletter subscriber', '/api/admin/newsletter', { method: 'PATCH', body: JSON.stringify({ id: subscriber.id, active: false }) });
  const unsubscribed = await request('Filter unsubscribed newsletter subscribers', '/api/admin/newsletter?status=unsubscribed&q=qa-newsletter');
  verify('Newsletter unsubscribe persisted', unsubscribed.payload.items.some((item) => item.id === subscriber.id && item.active === false));
  await request('Admin reactivates newsletter subscriber', '/api/admin/newsletter', { method: 'PATCH', body: JSON.stringify({ id: subscriber.id, active: true }) });
  await request('Reject invalid newsletter filter', '/api/admin/newsletter?status=invalid', {}, 400);

  const emailStatus = await request('Read safe SMTP status', '/api/admin/email/status');
  verify('SMTP status never exposes a password', !Object.hasOwn(emailStatus.payload, 'password') && !JSON.stringify(emailStatus.payload).includes(process.env.SMTP_PASSWORD || '__not_configured__'));
  await request('Reject invalid SMTP test recipient', '/api/admin/email/test', { method: 'POST', body: JSON.stringify({ recipient: 'bad-email' }) }, 400);
  if (!emailStatus.payload.configured) {
    await request('SMTP test reports missing configuration honestly', '/api/admin/email/test', { method: 'POST', body: JSON.stringify({ recipient: 'qa-smtp@example.test' }) }, 409);
  }

  const publicContent = await request('Read public dynamic content', '/api/public/content');
  verify('Public API omits notification preferences', !Object.keys(publicContent.payload.agencySettings || {}).some((key) => key.startsWith('notify')));
  verify('Public API omits email templates', !Object.keys(publicContent.payload.agencySettings || {}).some((key) => key.startsWith('emailTemplate')));
  await request('Export endpoint works for authenticated admin', '/api/admin/export');

  const rolePassword = 'RoleTest@2026';
  const roleHash = await bcrypt.hash(rolePassword, 10);
  for (const [email, role] of [['qa-editor@example.test', 'Editor'], ['qa-support@example.test', 'Support Staff'], ['qa-viewer@example.test', 'Viewer']]) {
    await database.query(
      'INSERT INTO admin_users(name,email,password_hash,role,active) VALUES($1,$2,$3,$4,TRUE) ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash,role=EXCLUDED.role,active=TRUE',
      [`QA ${role}`, email, roleHash, role],
    );
  }

  await loginAs('qa-viewer@example.test', rolePassword, qaIps[0]);
  await request('Viewer can read products', '/api/admin/resources/products');
  await request('Viewer cannot change feedback', '/api/admin/resources/feedback', { method: 'PUT', body: JSON.stringify({ items: feedbackAdmin.payload.items }) }, 403);
  await request('Viewer cannot update newsletter', '/api/admin/newsletter', { method: 'PATCH', body: JSON.stringify({ id: subscriber.id, active: false }) }, 403);
  await database.query("UPDATE admin_users SET active=FALSE WHERE email='qa-viewer@example.test'");
  await request('Deactivated user session is rejected immediately', '/api/admin/resources/products', {}, 401);
  await database.query("UPDATE admin_users SET active=TRUE WHERE email='qa-viewer@example.test'");

  await loginAs('qa-support@example.test', rolePassword, qaIps[0]);
  const currentFeedback = await request('Support can read feedback', '/api/admin/resources/feedback');
  await request('Support can update feedback', '/api/admin/resources/feedback', { method: 'PUT', body: JSON.stringify({ items: currentFeedback.payload.items }) });
  await request('Support cannot change products', '/api/admin/resources/products', { method: 'PUT', body: JSON.stringify({ items: productData.payload.items }) }, 403);
  await request('Support cannot upload media', '/api/admin/upload', { method: 'POST', body: validUpload }, 403);

  await loginAs('qa-editor@example.test', rolePassword, qaIps[0]);
  const currentProducts = await request('Editor can read products', '/api/admin/resources/products');
  await request('Editor can update products', '/api/admin/resources/products', { method: 'PUT', body: JSON.stringify({ items: currentProducts.payload.items }) });
  const usersForRbac = await request('Editor can read users', '/api/admin/resources/users');
  await request('Editor cannot change users', '/api/admin/resources/users', { method: 'PUT', body: JSON.stringify({ items: usersForRbac.payload.items }) }, 403);
  await request('Editor cannot send SMTP tests', '/api/admin/email/test', { method: 'POST', body: JSON.stringify({ recipient: 'qa-smtp@example.test' }) }, 403);

  await loginAs(adminEmail, adminPassword, qaIps[0]);
  const users = await request('Super Admin reads user management', '/api/admin/resources/users');
  await request('Reject removing every active Super Admin', '/api/admin/resources/users', { method: 'PUT', body: JSON.stringify({ items: users.payload.items.map((item) => ({ ...item, active: item.role === 'Super Admin' ? false : item.active })) }) }, 400);
  const duplicateUser = { ...users.payload.items[0], id: crypto.randomUUID(), password: 'Duplicate@2026' };
  await request('Reject duplicate admin email', '/api/admin/resources/users', { method: 'PUT', body: JSON.stringify({ items: [...users.payload.items, duplicateUser] }) }, 409);

  await expectDbFailure('Database rejects invalid CMS resource', "INSERT INTO cms_documents(resource,document_id,data) VALUES('invalid-resource','qa-smoke-invalid','{}'::jsonb)", [], ['23514']);
  await expectDbFailure('Database rejects invalid public request type', "INSERT INTO public_request_events(ip,request_type) VALUES('203.0.113.99','invalid')", [], ['23514']);
  await expectDbFailure('Database rejects non-normalized newsletter email', "INSERT INTO newsletter_subscribers(email,unsubscribe_token_hash) VALUES('QA-DB@EXAMPLE.TEST',$1)", ['a'.repeat(64)], ['23514']);
  await expectDbFailure('Database enforces case-insensitive admin email uniqueness', 'INSERT INTO admin_users(name,email,password_hash,role,active) SELECT $1,UPPER(email),password_hash,role,TRUE FROM admin_users WHERE LOWER(email)=LOWER($2) LIMIT 1', ['QA Duplicate', adminEmail], ['23505']);

  const activity = await request('Activity feed reflects real audit rows', '/api/admin/resources/activity');
  verify('Activity feed is populated', activity.payload.items.length > 0);
  await request('Logout rejects cross-origin request', '/api/auth/logout', { method: 'POST', headers: { origin: 'https://evil.example' } }, 403);
  await request('Authenticated logout succeeds', '/api/auth/logout', { method: 'POST' });
  cookie = '';
  await request('Logged-out session cannot access admin API', '/api/auth/me', {}, 401);

  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
} catch (error) {
  console.error(error.stack || error);
  process.exitCode = 1;
} finally {
  if (database) {
    try {
      if (originalSiteContent) await database.query("UPDATE cms_singletons SET data=$1::jsonb,updated_at=NOW() WHERE key='site-content'", [JSON.stringify(originalSiteContent)]);
      if (originalQrSettings) await database.query("UPDATE cms_singletons SET data=$1::jsonb,updated_at=NOW() WHERE key='qr-settings'", [JSON.stringify(originalQrSettings)]);
      if (originalSustainability) await database.query("UPDATE cms_singletons SET data=$1::jsonb,updated_at=NOW() WHERE key='sustainability'", [JSON.stringify(originalSustainability)]);
      if (originalLocalDiscovery) await database.query("UPDATE cms_singletons SET data=$1::jsonb,updated_at=NOW() WHERE key='local-discovery'", [JSON.stringify(originalLocalDiscovery)]);
      if (originalContactSettings) await database.query("UPDATE cms_singletons SET data=$1::jsonb,updated_at=NOW() WHERE key='contact-settings'", [JSON.stringify(originalContactSettings)]);
      if (originalSiteChrome) await database.query("UPDATE cms_singletons SET data=$1::jsonb,updated_at=NOW() WHERE key='site-chrome'", [JSON.stringify(originalSiteChrome)]);
      for (const [resource, items] of originalCollections.entries()) await restoreCollection(resource, items);
      await cleanQaData();
    } catch (cleanupError) {
      console.error(`QA cleanup warning: ${cleanupError.message}`);
      process.exitCode = 1;
    }
    await database.end().catch(() => undefined);
  }
  if (uploadedPath) await fs.unlink(uploadedPath).catch(() => undefined);
}
