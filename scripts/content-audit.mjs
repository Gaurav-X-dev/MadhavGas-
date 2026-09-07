/**
 * Content audit.
 *
 * The public site is allowed to fall back to seed values when a record is
 * missing, so a page can look fine while the database is actually incomplete.
 * This script reports the opposite view: what the database really holds, which
 * runtime fallback each gap would trigger, and whether every referenced image
 * actually exists on disk.
 *
 * Run: npm run audit:content
 * Exit code 1 means at least one FAIL — the site would be running on a fallback
 * or pointing at a missing asset.
 */
import pg from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadLocalEnv } from './env.mjs';

loadLocalEnv();
if (!process.env.DATABASE_URI) throw new Error('DATABASE_URI is missing');

const client = new pg.Client({ connectionString: process.env.DATABASE_URI });
try {
  await client.connect();
} catch (error) {
  if (error?.code === '28P01') {
    console.error('[DATABASE] PostgreSQL rejected the username/password in DATABASE_URI. Run npm run db:check.');
  } else {
    console.error(`[DATABASE] ${error instanceof Error ? error.message : 'Unable to connect.'}`);
  }
  process.exit(1);
}

const results = [];
const record = (level, area, message) => results.push({ level, area, message });
const pass = (area, message) => record('PASS', area, message);
const warn = (area, message) => record('WARN', area, message);
const fail = (area, message) => record('FAIL', area, message);

/* --------------------------- expected content --------------------------- */

const SINGLETONS = {
  'site-content': {
    fallback: 'lib/mock-data.ts → siteContent',
    required: ['agencyIntro', 'phonePrimary', 'phoneSecondary', 'email', 'officeAddress',
      'businessHours', 'whatsappNumber', 'seoTitle', 'seoDescription',
      'bharatgasLogoUrl', 'bharatgasLogoAlt', 'mbgaLogoUrl', 'mbgaLogoAlt', 'heroSlides'],
    assets: ['bharatgasLogoUrl', 'mbgaLogoUrl'],
  },
  'home-content': {
    fallback: 'lib/home-defaults.json',
    required: ['quickLinks', 'qr', 'about', 'services', 'products', 'safety', 'trustStrip',
      'journey', 'achievements', 'partnership', 'sustainability', 'gallery', 'visit'],
    assets: [],
  },
  'page-heroes': {
    fallback: 'lib/page-hero-defaults.json',
    required: ['products', 'journey', 'achievements', 'gallery', 'contact'],
    assets: [],
  },
  'site-sections': {
    fallback: 'lib/site-section-defaults.json',
    required: ['assist', 'videoHub'],
    assets: [],
  },
  'site-chrome': {
    fallback: 'lib/site-chrome-defaults.json',
    required: ['loaderKicker', 'loaderTagline', 'hoursLabel', 'callButtonText', 'navigation',
      'newsletter', 'cta', 'footer', 'discovery'],
    assets: [],
  },
  sustainability: {
    fallback: 'lib/mock-data.ts → sustainabilityContent',
    required: ['heroTitle', 'heroDescription', 'heroImage', 'heroImageAlt', 'storyTitle',
      'storyDescription', 'storyImage', 'storyImageAlt', 'storyPoints', 'cards',
      'routePlanning', 'reusableCycle', 'digitalAssistance', 'supplyChainSteps'],
    assets: ['heroImage', 'storyImage'],
  },
  'local-discovery': {
    fallback: 'lib/mock-data.ts → localDiscoveryContent',
    required: ['heading', 'description', 'localities', 'categories', 'topics'],
    assets: [],
  },
  'qr-settings': {
    fallback: 'lib/mock-data.ts → qrSettings',
    required: ['whatsappNumber', 'defaultMessage'],
    assets: [],
  },
  'agency-settings': {
    fallback: 'lib/mock-data.ts → agencySettings',
    required: ['agencyName', 'tagline', 'phonePrimary', 'phoneSecondary', 'email',
      'officeAddress', 'businessHours', 'whatsappNumber'],
    assets: [],
  },
  'contact-settings': {
    fallback: 'lib/mock-data.ts → fallbackContactSettings',
    required: ['eyebrow', 'title', 'description', 'callButtonText', 'emailButtonText',
      'submitButtonText', 'statusText', 'unavailableText', 'formTypes'],
    assets: [],
  },
};

// Collections the public pages read. `minPublished` is what each page needs to
// render real content instead of an empty state.
const COLLECTIONS = {
  products: { minPublished: 1, isPublished: (d) => !d.archived, assets: ['image'], page: '/products' },
  journey: { minPublished: 1, isPublished: (d) => d.published, assets: ['imageUrl'], page: '/journey' },
  achievements: { minPublished: 1, isPublished: (d) => d.published, assets: ['imageUrl'], page: '/achievements' },
  gallery: { minPublished: 1, isPublished: (d) => d.status === 'Published', assets: ['url'], page: '/gallery' },
};

/* ------------------------------- helpers -------------------------------- */

const publicDirectory = path.join(process.cwd(), 'public');
const assetCache = new Map();

async function assetExists(reference) {
  const value = String(reference || '').trim();
  if (!value) return 'empty';
  if (/^https?:\/\//i.test(value)) return 'external';
  if (!value.startsWith('/')) return 'invalid';
  if (assetCache.has(value)) return assetCache.get(value);
  const target = path.resolve(publicDirectory, `.${value}`);
  if (!target.startsWith(publicDirectory)) {
    assetCache.set(value, 'invalid');
    return 'invalid';
  }
  const found = await fs.access(target).then(() => 'ok').catch(() => 'missing');
  assetCache.set(value, found);
  return found;
}

/** Walks any nested value and yields every string that looks like an asset path. */
function* assetReferences(value, trail = '') {
  if (typeof value === 'string') {
    if (/^\/(assets|uploads)\//.test(value)) yield [trail, value];
    return;
  }
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) yield* assetReferences(item, `${trail}[${index}]`);
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) yield* assetReferences(item, trail ? `${trail}.${key}` : key);
  }
}

const isBlank = (value) => value === undefined || value === null
  || (typeof value === 'string' && value.trim() === '')
  || (Array.isArray(value) && value.length === 0);

/* ------------------------------ singletons ------------------------------ */

const singletonRows = await client.query('SELECT key, data FROM cms_singletons');
const stored = new Map(singletonRows.rows.map((row) => [row.key, row.data]));

for (const [key, spec] of Object.entries(SINGLETONS)) {
  const data = stored.get(key);
  if (!data) {
    fail(`singleton:${key}`, `Not in the database — the site would render from ${spec.fallback}`);
    continue;
  }
  const missing = spec.required.filter((field) => isBlank(data[field]));
  if (missing.length) fail(`singleton:${key}`, `Empty field(s): ${missing.join(', ')}`);
  else pass(`singleton:${key}`, `All ${spec.required.length} fields populated from the database`);
}

/* --------------------- home page section completeness ------------------- */

const home = stored.get('home-content');
if (home) {
  const listFields = {
    quickLinks: 'items', qr: 'benefits', services: 'cards', trustStrip: 'items', safety: 'steps',
  };
  for (const [section, listKey] of Object.entries(listFields)) {
    const items = home[section]?.[listKey];
    if (!Array.isArray(items) || items.length === 0) {
      fail(`home:${section}`, `"${listKey}" is empty — the block renders an empty state`);
    } else {
      const visible = items.filter((item) => item.published !== false).length;
      if (visible === 0) fail(`home:${section}`, `All ${items.length} ${listKey} are hidden`);
      else pass(`home:${section}`, `${visible} visible ${listKey}`);
    }
  }
  const aboutLists = ['checkItems', 'metrics'];
  for (const listKey of aboutLists) {
    const items = home.about?.[listKey];
    if (!Array.isArray(items) || items.length === 0) warn('home:about', `"${listKey}" is empty`);
    else pass('home:about', `${items.length} ${listKey}`);
  }
  const hidden = Object.entries(home).filter(([, section]) => section?.published === false).map(([name]) => name);
  if (hidden.length) warn('home:layout', `Hidden section(s): ${hidden.join(', ')}`);
  else pass('home:layout', `All ${Object.keys(home).length} sections are published`);
}

/* -------------------------------- hero ---------------------------------- */

const siteContent = stored.get('site-content');
if (siteContent) {
  const slides = Array.isArray(siteContent.heroSlides) ? siteContent.heroSlides : [];
  const published = slides.filter((slide) => slide.published);
  if (published.length === 0) {
    fail('hero', 'No published hero slide — the home page falls back to a hard-coded slide in lib/home-ui.ts');
  } else if (published.length === 1) {
    warn('hero', 'Only 1 published slide — the carousel arrows and dots have nothing to move to');
  } else {
    pass('hero', `${published.length} published slides`);
  }
  const untitled = published.filter((slide) => isBlank(slide.title) || isBlank(slide.subtitle) || isBlank(slide.image));
  if (untitled.length) fail('hero', `${untitled.length} published slide(s) missing title, subtitle or image`);
}

/* ------------------------------ collections ----------------------------- */

const documentRows = await client.query('SELECT resource, document_id, data FROM cms_documents');
const byResource = new Map();
for (const row of documentRows.rows) {
  if (!byResource.has(row.resource)) byResource.set(row.resource, []);
  byResource.get(row.resource).push(row);
}

for (const [resource, spec] of Object.entries(COLLECTIONS)) {
  const rows = byResource.get(resource) || [];
  if (rows.length === 0) {
    fail(`collection:${resource}`, `No records — ${spec.page} renders an empty state`);
    continue;
  }
  const visible = rows.filter((row) => spec.isPublished(row.data));
  if (visible.length < spec.minPublished) {
    fail(`collection:${resource}`, `${rows.length} record(s) but none published — ${spec.page} renders an empty state`);
  } else {
    pass(`collection:${resource}`, `${visible.length} of ${rows.length} record(s) published`);
  }
}

/* ------------------------------ page banners ---------------------------- */

const heroes = stored.get('page-heroes');
if (heroes) {
  for (const [name, hero] of Object.entries(heroes)) {
    const gaps = ['eyebrow', 'title', 'description', 'image', 'imageAlt'].filter((field) => isBlank(hero?.[field]));
    if (gaps.length) fail(`hero:${name}`, `Empty field(s): ${gaps.join(', ')}`);
    else pass(`hero:${name}`, `Banner copy and artwork set (${hero.image})`);
  }
}

/* ---------------------------- gallery videos ---------------------------- */

const galleryRows = byResource.get('gallery') || [];
const videos = galleryRows.filter((row) => row.data.type === 'Video');
if (videos.length) {
  const withoutPoster = videos.filter((row) => !String(row.data.thumbnailUrl || '').trim());
  if (withoutPoster.length) {
    fail('gallery:video', `${withoutPoster.length} video(s) have no thumbnail and render as a blank tile: ${withoutPoster.map((row) => row.document_id).join(', ')}`);
  } else {
    pass('gallery:video', `${videos.length} video(s), all with a thumbnail`);
  }
  const uploaded = videos.filter((row) => /^\/uploads\/[\w.-]+\.(mp4|webm)$/i.test(String(row.data.url || '')));
  pass('gallery:video', `${uploaded.length} uploaded file(s), ${videos.length - uploaded.length} external link(s)`);
}

/* ------------------------------- assets --------------------------------- */

const everything = [
  ...singletonRows.rows.map((row) => [`singleton:${row.key}`, row.data]),
  ...documentRows.rows.map((row) => [`${row.resource}:${row.document_id}`, row.data]),
];

let checked = 0;
const broken = [];
for (const [label, data] of everything) {
  for (const [trail, reference] of assetReferences(data)) {
    checked += 1;
    const state = await assetExists(reference);
    if (state === 'missing' || state === 'invalid') broken.push(`${label} → ${trail} = ${reference}`);
  }
}
if (broken.length) {
  fail('assets', `${broken.length} of ${checked} image reference(s) do not exist:`);
  for (const entry of broken) fail('assets', `    ${entry}`);
} else {
  pass('assets', `All ${checked} image references resolve to a file in public/`);
}

/* ------------------------------- report --------------------------------- */

await client.end();

const width = Math.max(...results.map((r) => r.area.length));
for (const { level, area, message } of results) {
  const icon = level === 'PASS' ? '✓' : level === 'WARN' ? '!' : '✗';
  console.log(`${icon} ${level.padEnd(4)} ${area.padEnd(width)}  ${message}`);
}

const failures = results.filter((r) => r.level === 'FAIL').length;
const warnings = results.filter((r) => r.level === 'WARN').length;
console.log(`\n${results.length - failures - warnings} passed, ${warnings} warning(s), ${failures} failure(s)`);
if (failures) console.log('A failure means the live site is running on a fallback or a missing asset.');
process.exit(failures ? 1 : 0);
