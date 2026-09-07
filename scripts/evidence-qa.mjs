import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import pg from 'pg';
import { loadLocalEnv } from './env.mjs';

const require = createRequire(import.meta.url);
const WebSocketClient = require('next/dist/compiled/ws');

loadLocalEnv();

const baseUrl = (process.env.EVIDENCE_BASE_URL || 'http://localhost:3100').replace(/\/$/, '');
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
if (!adminEmail || !adminPassword) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required for evidence QA');
const screenshotDirectory = path.join(process.cwd(), 'docs', 'qa-screenshots');
const defaultAdminRoutes = [
  '/admin/dashboard', '/admin/bookings', '/admin/enquiries', '/admin/feedback', '/admin/products',
  '/admin/products/new', '/admin/gallery', '/admin/gallery/new', '/admin/journey', '/admin/journey/new',
  '/admin/achievements', '/admin/achievements/new', '/admin/sustainability', '/admin/sustainability/new',
  '/admin/sustainability/settings', '/admin/local-information', '/admin/local-information/localities/new',
  '/admin/local-information/settings', '/admin/home-page', '/admin/site-content', '/admin/qr-settings', '/admin/newsletter',
  '/admin/users', '/admin/settings',
];
const adminRoutes = process.env.EVIDENCE_ADMIN_ROUTES
  ? process.env.EVIDENCE_ADMIN_ROUTES.split(',').map((route) => route.trim()).filter(Boolean)
  : defaultAdminRoutes;
const responsiveWidths = process.env.EVIDENCE_WIDTHS
  ? process.env.EVIDENCE_WIDTHS.split(',').map(Number).filter((width) => Number.isInteger(width) && width >= 280)
  : [768, 1024, 1280, 1366, 1440, 1600, 1920];
const screenshots = [];
const uploadedPaths = [];
const originalCollections = new Map();
const browserFailures = [];
const evidenceId = Date.now();
const evidenceEmails = {
  booking: `evidence-booking-${evidenceId}@example.test`,
  enquiry: `evidence-enquiry-${evidenceId}@example.test`,
  feedback: `evidence-feedback-${evidenceId}@example.test`,
  newsletter: `evidence-newsletter-${evidenceId}@example.test`,
};
let adminCookie = '';
let originalSiteContent = null;
let originalSustainability = null;
let originalLocalDiscovery = null;
let database = null;

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function verify(condition, message) {
  if (!condition) throw new Error(message);
}

function chromeExecutable() {
  const candidates = process.platform === 'win32'
    ? [process.env.CHROME_PATH, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe']
    : [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  return candidates.find(Boolean);
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function waitForDebugger(port) {
  let lastError;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return;
    } catch (error) { lastError = error; }
    await sleep(100);
  }
  throw new Error(`Chrome DevTools did not become ready: ${lastError?.message || 'timeout'}`);
}

class CdpSession {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async connect() {
    this.socket = new WebSocketClient(this.webSocketUrl, { perMessageDeflate: false });
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('CDP connection timed out')), 10000);
      this.socket.once('open', () => { clearTimeout(timeout); resolve(); });
      this.socket.once('error', (error) => { clearTimeout(timeout); reject(new Error(`Unable to connect to Chrome DevTools: ${error.message}`)); });
    });
    this.socket.on('message', (data) => {
      const message = JSON.parse(Buffer.isBuffer(data) ? data.toString('utf8') : String(data));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        clearTimeout(pending.timeout);
        if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`));
        else pending.resolve(message.result);
        return;
      }
      for (const listener of this.listeners.get(message.method) || []) listener(message.params || {});
    });
    this.socket.on('close', (code, reason) => {
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timeout);
        pending.reject(new Error(`Chrome DevTools connection closed unexpectedly (${code}: ${reason || 'no reason'})`));
      }
      this.pending.clear();
    });
  }

  on(method, listener) {
    this.listeners.set(method, [...(this.listeners.get(method) || []), listener]);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { this.pending.delete(id); reject(new Error(`${method} timed out`)); }, 30000);
      this.pending.set(id, { method, resolve, reject, timeout });
      this.socket.send(JSON.stringify({ id, method, params }), (error) => {
        if (!error) return;
        clearTimeout(timeout);
        this.pending.delete(id);
        reject(new Error(`${method} could not be sent: ${error.message}`));
      });
    });
  }

  close() { this.socket?.close(); }
}

async function evaluate(session, expression) {
  const result = await session.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Browser evaluation failed');
  return result.result.value;
}

async function setViewport(session, width, height = width <= 480 ? 900 : 1000) {
  await session.send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: width <= 480, screenWidth: width, screenHeight: height,
  });
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: width <= 480, maxTouchPoints: width <= 480 ? 5 : 1 });
}

async function waitForExpression(session, expression, timeout = 15000) {
  const end = Date.now() + timeout;
  let value;
  while (Date.now() < end) {
    try { value = await evaluate(session, expression); } catch { value = false; }
    if (value) return value;
    await sleep(100);
  }
  throw new Error(`Browser condition timed out: ${expression.slice(0, 180)}`);
}

async function navigate(session, pathname, { publicPage = false } = {}) {
  const url = `${baseUrl}${pathname}`;
  await session.send('Page.navigate', { url });
  await waitForExpression(session, `location.href === ${JSON.stringify(url)} && document.readyState === 'complete'`);
  if (publicPage) await waitForExpression(session, 'window.__MBGA_RUNTIME_LOADED__ === true && Boolean(document.querySelector("#main-content"))');
  else await waitForExpression(session, '!document.body.innerText.includes("This page could not be found") && Boolean(document.querySelector("main") || document.querySelector("form"))');
  await evaluate(session, `(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    for (const image of document.images) image.loading = 'eager';
    return Promise.all([...document.images].map((image) => image.complete ? true : new Promise((resolve) => {
      image.addEventListener('load', () => resolve(true), { once: true });
      image.addEventListener('error', () => resolve(false), { once: true });
      setTimeout(() => resolve(false), 2500);
    })));
  })()`);
  await sleep(650);
}

async function scrollToText(session, text) {
  const found = await evaluate(session, `(() => {
    const target = [...document.querySelectorAll('h1,h2,h3,h4,p,span,strong,label,td')]
      .filter((element) => (element.textContent || '').trim().includes(${JSON.stringify(text)}))
      .sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)[0];
    if (!target) return false;
    target.scrollIntoView({ block: 'center', inline: 'nearest' });
    return true;
  })()`);
  verify(found, `Could not find visible evidence text: ${text}`);
  await sleep(350);
}

async function scrollToSelector(session, selector) {
  const found = await evaluate(session, `(() => { const target = document.querySelector(${JSON.stringify(selector)}); if (!target) return false; target.scrollIntoView({ block: 'center' }); return true; })()`);
  verify(found, `Could not find evidence selector: ${selector}`);
  await sleep(350);
}

async function capture(session, fileName, module, proof) {
  const result = await session.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
  await fs.writeFile(path.join(screenshotDirectory, fileName), Buffer.from(result.data, 'base64'));
  screenshots.push({ fileName, module, proof });
  process.stdout.write(`Captured ${fileName}\n`);
}

async function api(url, options = {}, expected = 200) {
  const response = await fetch(`${baseUrl}${url}`, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { 'content-type': 'application/json' } : {}),
      ...(adminCookie ? { cookie: adminCookie } : {}),
      ...options.headers,
    },
  });
  const payload = (response.headers.get('content-type') || '').includes('json') ? await response.json() : await response.text();
  if (response.status !== expected) throw new Error(`${options.method || 'GET'} ${url}: expected ${expected}, received ${response.status}: ${JSON.stringify(payload)}`);
  return { response, payload };
}

async function putCollection(resource, items) {
  await api(`/api/admin/resources/${resource}`, { method: 'PUT', body: JSON.stringify({ items }) });
}

async function uploadFile(filePath, name, type) {
  const form = new FormData();
  form.append('file', new File([await fs.readFile(filePath)], name, { type }));
  const result = await api('/api/admin/upload', { method: 'POST', body: form });
  uploadedPaths.push(path.join(process.cwd(), 'public', String(result.payload.url).replace(/^\//, '')));
  return result.payload.url;
}

async function rasterizeSvg(session, sourcePath, outputPath) {
  await setViewport(session, 420, 140);
  await session.send('Page.navigate', { url: `${baseUrl}${sourcePath}` });
  await waitForExpression(session, 'document.readyState === "complete"');
  await sleep(350);
  const result = await session.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
  await fs.writeFile(outputPath, Buffer.from(result.data, 'base64'));
}

async function seedDynamicEvidence(session, temporaryDirectory) {
  const bharatgasRaster = path.join(temporaryDirectory, 'bharatgas-evidence.png');
  const mbgaRaster = path.join(temporaryDirectory, 'mbga-evidence.png');
  await rasterizeSvg(session, '/assets/brands/bharatgas-logo.svg', bharatgasRaster);
  await rasterizeSvg(session, '/assets/brands/mbga-logo.svg', mbgaRaster);
  const bharatgasLogo = await uploadFile(bharatgasRaster, 'bharatgas-evidence.png', 'image/png');
  const mbgaLogo = await uploadFile(mbgaRaster, 'mbga-evidence.png', 'image/png');
  const heroImage = await uploadFile(path.join(process.cwd(), 'public', 'assets', 'images', 'lpg-delivery.webp'), 'hero-evidence.webp', 'image/webp');

  const site = await api('/api/admin/settings/site-content');
  originalSiteContent = site.payload.data;
  const evidenceSite = {
    ...originalSiteContent,
    bharatgasLogoUrl: bharatgasLogo,
    bharatgasLogoAlt: 'Bharatgas independent brand logo',
    mbgaLogoUrl: mbgaLogo,
    mbgaLogoAlt: 'Madhav Bharat Gas Agency independent logo',
    heroSlides: originalSiteContent.heroSlides.map((slide, index) => index === 0 ? {
      ...slide,
      title: 'QA - Hero Test: Dependable LPG Supply',
      subtitle: 'Temporary evidence content proving uploaded hero persistence and public rendering.',
      image: heroImage,
    } : slide),
  };
  await api('/api/admin/settings/site-content', { method: 'PUT', body: JSON.stringify(evidenceSite) });

  for (const resource of ['products', 'gallery', 'journey', 'achievements']) {
    const current = await api(`/api/admin/resources/${resource}`);
    originalCollections.set(resource, current.payload.items);
  }
  await putCollection('products', [{
    id: 'qa-evidence-product', name: 'QA - Commercial Cylinder Evidence', slug: 'qa-commercial-cylinder-evidence', category: 'Commercial', cylinderCapacity: '19 kg',
    description: 'Temporary QA product proving the complete admin, API, database and public rendering chain.',
    features: ['Validated admin save', 'Published public card', 'Responsive image'], image: heroImage, availability: 'In Stock', displayOrder: 0, archived: false,
  }, ...originalCollections.get('products')]);
  await putCollection('gallery', [{
    id: 'qa-evidence-gallery', type: 'Image', url: heroImage, category: 'QA Evidence', altText: 'QA evidence of an LPG delivery vehicle', caption: 'QA - Gallery Upload Evidence', displayOrder: 0, status: 'Published',
  }, ...originalCollections.get('gallery')]);
  await putCollection('journey', [{
    id: 'qa-evidence-journey', year: '', category: 'Digital Service', title: 'QA - Dynamic MBGA Journey Evidence',
    description: 'Temporary published milestone proving MBGA Journey content flows from admin to the public timeline.', brand: 'MBGA', icon: 'Route', imageUrl: heroImage,
    imageAlt: 'QA evidence milestone for dynamic LPG service', displayOrder: 0, published: true, featured: true,
  }, {
    id: 'qa-evidence-bharatgas-journey', year: '', category: 'Brand Service', title: 'QA - Dynamic Bharatgas Journey Evidence',
    description: 'Temporary published milestone proving Bharatgas Journey content flows from admin to the public timeline.', brand: 'Bharatgas', icon: 'ShieldCheck', imageUrl: heroImage,
    imageAlt: 'QA evidence milestone for Bharatgas service', displayOrder: 0, published: true, featured: false,
  }, ...originalCollections.get('journey')]);
  await putCollection('achievements', [{
    id: 'qa-evidence-achievement', type: 'Recognition', title: 'QA - Dynamic Achievement Evidence', description: 'Temporary recognition proving achievement content persists and renders publicly.', year: 'QA', brand: 'MBGA & Bharatgas', imageUrl: heroImage, published: true,
  }, ...originalCollections.get('achievements')]);

  const sustainability = await api('/api/admin/settings/sustainability');
  originalSustainability = sustainability.payload.data;
  await api('/api/admin/settings/sustainability', {
    method: 'PUT', body: JSON.stringify({ ...originalSustainability, routePlanning: 'QA Evidence: saved route-planning content renders from the database on the public Sustainability page.', cards: [{ id: 'qa-evidence-sustainability', title: 'QA - Responsible Handling Evidence', description: 'Temporary factual practice proving Sustainability content flows from admin to the public page.', icon: 'ShieldCheck', imageUrl: heroImage, imageAlt: 'QA evidence for responsible LPG handling', displayOrder: 0, published: true }, ...originalSustainability.cards] }),
  });

  const discovery = await api('/api/admin/settings/local-discovery');
  originalLocalDiscovery = discovery.payload.data;
  await api('/api/admin/settings/local-discovery', {
    method: 'PUT', body: JSON.stringify({ ...originalLocalDiscovery, localities: [{ id: 'qa-evidence-locality', label: 'QA - Dynamic Locality Evidence', href: '/contact', displayOrder: 0, active: true }, ...originalLocalDiscovery.localities] }),
  });
}

async function submitContactEvidence(session, type, email, valid = true) {
  await setViewport(session, 1440, 1000);
  await navigate(session, '/contact', { publicPage: true });
  await scrollToSelector(session, '#contact-form');
  const result = await evaluate(session, `(async () => {
    const form = document.querySelector('#contact-form');
    const set = (name, value) => {
      const field = form.elements.namedItem(name);
      if (!field) return;
      field.value = value;
      field.dispatchEvent(new Event(field.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    };
    set('type', ${JSON.stringify(type)});
    set('name', ${JSON.stringify(`QA - ${type[0].toUpperCase()}${type.slice(1)} Test`)});
    set('phone', '+91 98765 43210');
    set('email', ${JSON.stringify(email)});
    if (${JSON.stringify(valid)}) {
      if (${JSON.stringify(type)} === 'booking') {
        set('businessName', 'QA Evidence Kitchen');
        const cylinder = form.elements.namedItem('cylinderType');
        set('cylinderType', cylinder.options[1]?.value || '19 kg Commercial LPG Cylinder');
        set('quantity', '2');
        set('deliveryArea', 'Sector 70, Gurugram');
        set('bookingMessage', 'QA booking submission screenshot evidence.');
      } else if (${JSON.stringify(type)} === 'feedback') {
        set('rating', '4');
        set('feedbackMessage', 'QA feedback success proves validation and database persistence.');
      } else {
        set('subject', 'QA commercial LPG enquiry');
        set('enquiryMessage', 'QA enquiry success proves the public-to-admin workflow.');
      }
    }
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    return true;
  })()`);
  verify(result, `Unable to submit ${type} evidence form`);
  if (!valid) {
    await waitForExpression(session, `document.querySelectorAll('#contact-form .error').length > 0 && [...document.querySelectorAll('#contact-form .error')].some((element) => element.textContent.trim())`);
    return null;
  }
  const reference = await waitForExpression(session, `(() => { const text = document.querySelector('.toast')?.textContent || ''; const match = text.match(/(?:BKG|ENQ|FBK)-\\d{4}-[A-F0-9]{8}/); return match?.[0] || false; })()`);
  return reference;
}

async function newsletterEvidence(session, valid) {
  await setViewport(session, 1440, 1000);
  await navigate(session, '/', { publicPage: true });
  await scrollToSelector(session, '.newsletter-section');
  await evaluate(session, `(() => {
    const form = document.querySelector('.newsletter-form');
    const input = form.querySelector('input[type="email"]');
    input.value = ${JSON.stringify(valid ? evidenceEmails.newsletter : 'invalid-email')};
    input.dispatchEvent(new Event('input', { bubbles: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  })()`);
  await waitForExpression(session, valid ? `document.querySelector('.newsletter-form')?.classList.contains('is-success')` : `document.querySelector('.newsletter-form')?.classList.contains('is-error')`);
}

async function auditAdminResponsive(session) {
  let audited = 0;
  for (const route of adminRoutes) {
    for (const width of responsiveWidths) {
      await setViewport(session, width, width <= 480 ? 900 : 1000);
      await navigate(session, route);
      try {
        await waitForExpression(session, `Boolean(document.querySelector('main h1, main h2'))`, 30000);
      } catch (error) {
        const diagnostic = await evaluate(session, `({ url: location.href, title: document.title, text: document.body.innerText.slice(0, 1200), html: document.querySelector('main')?.innerHTML.slice(0, 1200) || '' })`);
        throw new Error(`${route}@${width} did not finish rendering a heading: ${JSON.stringify(diagnostic)} | browser=${JSON.stringify(browserFailures.slice(-12))} | ${error.message}`);
      }
      const audit = await evaluate(session, `(() => {
        const documentWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
        const overflowElements = [...document.querySelectorAll('body *')]
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return style.display !== 'none' && style.visibility !== 'hidden' && (rect.right > innerWidth + 1 || rect.left < -1);
          })
          .slice(0, 12)
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              selector: element.tagName.toLowerCase() + (element.id ? '#' + element.id : '') + (element.classList.length ? '.' + [...element.classList].slice(0, 3).join('.') : ''),
              left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), text: (element.textContent || '').trim().slice(0, 80),
            };
          });
        return {
          url: location.pathname,
          notFound: document.body.innerText.includes('This page could not be found'),
          overflow: Math.max(0, Math.round(documentWidth - innerWidth)),
          hasMain: Boolean(document.querySelector('main')),
          hasHeading: Boolean(document.querySelector('h1,h2')),
          overflowElements,
        };
      })()`);
      verify(audit.url === route, `${route}@${width} redirected unexpectedly to ${audit.url}`);
      verify(!audit.notFound, `${route}@${width} rendered a 404`);
      verify(audit.overflow === 0, `${route}@${width} has ${audit.overflow}px horizontal overflow; candidates: ${JSON.stringify(audit.overflowElements)}`);
      verify(audit.hasMain && audit.hasHeading, `${route}@${width} is missing its admin content landmark or heading`);
      audited += 1;
    }
    process.stdout.write(`Audited ${route} at ${responsiveWidths.length} widths\n`);
  }
  return audited;
}

async function restoreAndCleanup() {
  if (!database) return;
  if (originalSiteContent) await database.query("UPDATE cms_singletons SET data=$1::jsonb,updated_at=NOW() WHERE key='site-content'", [JSON.stringify(originalSiteContent)]);
  if (originalSustainability) await database.query("UPDATE cms_singletons SET data=$1::jsonb,updated_at=NOW() WHERE key='sustainability'", [JSON.stringify(originalSustainability)]);
  if (originalLocalDiscovery) await database.query("UPDATE cms_singletons SET data=$1::jsonb,updated_at=NOW() WHERE key='local-discovery'", [JSON.stringify(originalLocalDiscovery)]);
  for (const [resource, items] of originalCollections.entries()) {
    await database.query('BEGIN');
    try {
      await database.query('DELETE FROM cms_documents WHERE resource=$1', [resource]);
      for (const [index, item] of items.entries()) {
        await database.query('INSERT INTO cms_documents(resource,document_id,data,sort_order) VALUES($1,$2,$3::jsonb,$4)', [resource, item.id, JSON.stringify(item), Number(item.displayOrder ?? index)]);
      }
      await database.query('COMMIT');
    } catch (error) {
      await database.query('ROLLBACK');
      throw error;
    }
  }
  const emails = Object.values(evidenceEmails);
  const references = await database.query("SELECT reference_no FROM submissions WHERE data->>'email'=ANY($1::text[])", [emails]);
  const referenceNumbers = references.rows.map((row) => row.reference_no);
  if (referenceNumbers.length) {
    await database.query('DELETE FROM email_delivery_logs WHERE submission_reference=ANY($1::varchar[])', [referenceNumbers]);
    await database.query("DELETE FROM audit_logs WHERE metadata->>'reference'=ANY($1::text[])", [referenceNumbers]);
  }
  await database.query('DELETE FROM email_delivery_logs WHERE recipient=ANY($1::text[])', [emails]);
  await database.query("DELETE FROM cms_documents WHERE data->>'email'=ANY($1::text[]) OR data->>'customerName' LIKE 'QA - % Test'", [emails]);
  await database.query("DELETE FROM submissions WHERE data->>'email'=ANY($1::text[])", [emails]);
  await database.query('DELETE FROM newsletter_subscribers WHERE email=ANY($1::text[])', [emails]);
  for (const file of uploadedPaths) await fs.unlink(file).catch(() => undefined);
}

async function main() {
  await fs.mkdir(screenshotDirectory, { recursive: true });
  await fetch(baseUrl, { signal: AbortSignal.timeout(5000) }).then((response) => verify(response.ok, `Evidence server returned HTTP ${response.status}`));
  database = new pg.Client({ connectionString: process.env.DATABASE_URI });
  await database.connect();

  const chromePath = chromeExecutable();
  verify(chromePath, 'Google Chrome/Chromium was not found');
  const debugPort = await getFreePort();
  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'mbga-evidence-'));
  const chrome = spawn(chromePath, [
    '--headless=new', '--disable-background-networking', '--disable-component-update', '--disable-default-apps',
    '--disable-extensions', '--disable-features=MediaRouter,Translate', '--disable-gpu', '--disable-gpu-compositing',
    '--disable-gpu-sandbox', '--disable-dev-shm-usage', '--disable-software-rasterizer', '--no-first-run',
    '--no-default-browser-check', '--remote-allow-origins=*',
    `--remote-debugging-port=${debugPort}`, `--user-data-dir=${path.join(temporaryDirectory, 'chrome-profile')}`, 'about:blank',
  ], { stdio: 'ignore', windowsHide: true });
  let session;
  let responsiveRenders = 0;
  try {
    await waitForDebugger(debugPort);
    const targetResponse = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
    verify(targetResponse.ok, `Unable to create Chrome target: HTTP ${targetResponse.status}`);
    const target = await targetResponse.json();
    session = new CdpSession(target.webSocketDebuggerUrl);
    await session.connect();
    await Promise.all([session.send('Page.enable'), session.send('Runtime.enable'), session.send('Network.enable'), session.send('Log.enable')]);

    session.on('Runtime.exceptionThrown', ({ exceptionDetails }) => browserFailures.push(`Uncaught JavaScript error: ${exceptionDetails?.exception?.description || exceptionDetails?.text || 'unknown'}`));
    session.on('Log.entryAdded', ({ entry }) => { if (entry?.level === 'error' && entry?.source === 'javascript') browserFailures.push(`Console error: ${entry.text}`); });
    session.on('Network.responseReceived', ({ response }) => {
      if (response?.url?.startsWith(baseUrl) && response.status >= 400) browserFailures.push(`HTTP ${response.status}: ${response.url}`);
    });

    await setViewport(session, 1440, 1000);
    await navigate(session, '/admin/login');
    await capture(session, '01-admin-login.png', 'Authentication', 'Admin login route renders without a 404 or redirect loop.');

    const login = await api('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    adminCookie = (login.response.headers.get('set-cookie') || '').split(';')[0];
    const [cookieName, cookieValue] = adminCookie.split('=');
    verify(cookieName && cookieValue, 'Admin API did not issue a session cookie');
    await session.send('Network.setCookie', { name: cookieName, value: cookieValue, url: baseUrl, path: '/', httpOnly: true, secure: false, sameSite: 'Strict' });

    if (process.env.EVIDENCE_AUDIT_ONLY === '1') {
      responsiveRenders = await auditAdminResponsive(session);
      verify(browserFailures.length === 0, `Focused admin audit found browser errors: ${browserFailures.join(' | ')}`);
      process.stdout.write(`Focused admin audit PASS: ${responsiveRenders} renders.\n`);
      return;
    }

    await navigate(session, '/admin/dashboard');
    await capture(session, '02-dashboard-baseline.png', 'Dashboard', 'Dashboard loads from the clean operational baseline.');

    await seedDynamicEvidence(session, temporaryDirectory);

    await setViewport(session, 1440, 1000);
    await navigate(session, '/admin/site-content');
    await waitForExpression(session, `document.body.innerText.includes('Bharatgas Brand Asset')`);
    await scrollToText(session, 'Bharatgas Brand Asset');
    await capture(session, '03-bharatgas-logo-upload.png', 'Two-logo branding', 'Independent Bharatgas logo upload, preview, URL and alt-text field.');
    await scrollToText(session, 'Madhav Bharat Gas Brand Asset');
    await capture(session, '04-mbga-logo-upload.png', 'Two-logo branding', 'Independent MBGA logo upload, preview, URL and alt-text field.');

    await setViewport(session, 1440, 900);
    await navigate(session, '/', { publicPage: true });
    await capture(session, '05-public-header-two-logos.png', 'Public header', 'Desktop header renders two separately stored logo assets in a compact lockup.');

    await navigate(session, '/admin/site-content');
    await evaluate(session, `(() => { const tab = [...document.querySelectorAll('[role="tab"]')].find((element) => element.textContent.trim() === 'Hero'); if (!tab) return false; tab.focus(); tab.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerType: 'mouse' })); tab.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 })); tab.click(); return true; })()`);
    await waitForExpression(session, `document.body.innerText.includes('Hero Slides')`);
    await capture(session, '06-hero-admin.png', 'Hero', 'Hero admin loads the persisted title, image and controls.');
    const removed = await evaluate(session, `(() => { const button = document.querySelector('button[aria-label="Remove slide image"]'); button?.click(); return Boolean(button); })()`);
    verify(removed, 'Hero remove-image control was not found');
    await evaluate(session, `(() => { const button = [...document.querySelectorAll('button')].find((element) => element.textContent.includes('Save Changes')); button?.click(); return Boolean(button); })()`);
    await waitForExpression(session, `document.querySelector('[role="alert"]')?.textContent.includes('Slide 1 image')`);
    await capture(session, '07-hero-validation-error.png', 'Hero validation', 'A missing hero image shows a friendly, field-specific inline error.');
    await navigate(session, '/admin/site-content');
    await evaluate(session, `(() => { const tab = [...document.querySelectorAll('[role="tab"]')].find((element) => element.textContent.trim() === 'Hero'); if (!tab) return false; tab.focus(); tab.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerType: 'mouse' })); tab.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 })); tab.click(); return true; })()`);
    await waitForExpression(session, `document.body.innerText.includes('Hero Slides')`);
    await scrollToText(session, 'Slide image');
    await capture(session, '08-hero-image-upload.png', 'Hero upload', 'Uploaded replacement hero preview and randomized local URL persist after reload.');
    await navigate(session, '/', { publicPage: true });
    await capture(session, '09-hero-public-result.png', 'Public hero', 'The uploaded hero and QA title render on the public home page with refined typography.');

    await navigate(session, '/admin/products');
    await scrollToText(session, 'QA - Commercial Cylinder Evidence');
    await capture(session, '10-product-admin.png', 'Products', 'QA product persisted in the admin catalog.');
    await navigate(session, '/products', { publicPage: true });
    await scrollToText(session, 'QA - Commercial Cylinder Evidence');
    await capture(session, '11-product-public.png', 'Products', 'QA product renders publicly with its configured image and content.');

    await navigate(session, '/admin/gallery');
    await scrollToText(session, 'QA - Gallery Upload Evidence');
    await capture(session, '12-gallery-admin.png', 'Gallery', 'Uploaded QA gallery item is visible in admin.');
    await navigate(session, '/gallery', { publicPage: true });
    await scrollToText(session, 'QA - Gallery Upload Evidence');
    await capture(session, '13-gallery-public.png', 'Gallery', 'Published QA gallery item renders publicly.');

    await navigate(session, '/admin/journey');
    await scrollToText(session, 'QA - Dynamic MBGA Journey Evidence');
    await capture(session, '14-journey-admin.png', 'Journey', 'Published, featured QA Journey milestone is visible in admin.');
    await navigate(session, '/journey', { publicPage: true });
    await evaluate(session, `document.querySelector('[data-journey-tab="MBGA"]')?.click()`);
    await waitForExpression(session, `document.querySelector('[data-journey-panel="MBGA"]')?.classList.contains('is-active')`);
    await scrollToText(session, 'QA - Dynamic MBGA Journey Evidence');
    await capture(session, '15-journey-public.png', 'Journey', 'QA Journey milestone renders in the public timeline.');

    await navigate(session, '/admin/achievements');
    await scrollToText(session, 'QA - Dynamic Achievement Evidence');
    await capture(session, '16-achievement-admin.png', 'Achievements', 'QA achievement is persisted and published in admin.');
    await navigate(session, '/achievements', { publicPage: true });
    await scrollToText(session, 'QA - Dynamic Achievement Evidence');
    await capture(session, '17-achievement-public.png', 'Achievements', 'Published QA achievement renders publicly.');

    await navigate(session, '/admin/sustainability');
    await scrollToText(session, 'QA - Responsible Handling Evidence');
    await capture(session, '18-sustainability-admin.png', 'Sustainability', 'Saved responsible-operation content is present in the admin list.');
    await navigate(session, '/sustainability', { publicPage: true });
    await scrollToText(session, 'QA - Responsible Handling Evidence');
    await capture(session, '19-sustainability-public.png', 'Sustainability', 'Saved sustainability content renders publicly.');

    await submitContactEvidence(session, 'booking', evidenceEmails.booking, true);
    await capture(session, '20-booking-submission-success.png', 'Booking form', 'Valid booking submission returns a BKG reference in the public UI.');
    await navigate(session, '/admin/bookings');
    await scrollToText(session, 'QA - Booking Test');
    await capture(session, '21-booking-admin.png', 'Bookings', 'Public booking appears in the admin operations table.');

    await submitContactEvidence(session, 'enquiry', evidenceEmails.enquiry, true);
    await capture(session, '22-enquiry-submission-success.png', 'Enquiry form', 'Valid enquiry submission returns an ENQ reference in the public UI.');
    await navigate(session, '/admin/enquiries');
    await scrollToText(session, 'QA - Enquiry Test');
    await capture(session, '23-enquiry-admin.png', 'Enquiries', 'Public enquiry appears in the admin operations table.');

    await submitContactEvidence(session, 'feedback', evidenceEmails.feedback, false);
    await capture(session, '24-feedback-validation.png', 'Feedback form', 'Missing rating/message produce visible field validation.');
    await submitContactEvidence(session, 'feedback', evidenceEmails.feedback, true);
    await capture(session, '25-feedback-success.png', 'Feedback form', 'Valid feedback returns an FBK reference in the public UI.');
    await navigate(session, '/admin/feedback');
    await scrollToText(session, 'QA - Feedback Test');
    await capture(session, '26-feedback-admin.png', 'Feedback', 'Public feedback and rating appear in admin.');

    await newsletterEvidence(session, false);
    await capture(session, '27-newsletter-invalid.png', 'Newsletter', 'Invalid newsletter email displays an inline validation message.');
    await newsletterEvidence(session, true);
    await capture(session, '28-newsletter-success.png', 'Newsletter', 'Valid newsletter subscription displays a success state.');
    await navigate(session, '/admin/newsletter');
    await scrollToText(session, evidenceEmails.newsletter);
    await capture(session, '29-newsletter-admin.png', 'Newsletter admin', 'Normalized subscriber appears in the authenticated admin list.');

    await navigate(session, '/admin/settings');
    await capture(session, '30-site-settings.png', 'Site settings', 'Agency settings render from the database with a clear Save Changes action.');
    await navigate(session, '/admin/qr-settings');
    await capture(session, '31-qr-settings.png', 'QR settings', 'Local QR preview and safe booking fields render correctly.');
    await navigate(session, '/admin/settings');
    const emailTabActivated = await evaluate(session, `(() => {
      const tab = [...document.querySelectorAll('[role="tab"]')].find((element) => element.textContent.includes('Email Templates'));
      if (!tab) return false;
      tab.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
      tab.click();
      return true;
    })()`);
    verify(emailTabActivated, 'Email Templates settings tab was not found');
    await waitForExpression(session, `document.body.innerText.includes('SMTP Email Service')`);
    await waitForExpression(session, `document.body.innerText.includes('Email service not configured') || document.body.innerText.includes('Email service configured')`, 30000);
    await capture(session, '32-smtp-status-test.png', 'SMTP', 'Admin exposes safe configured/not-configured status and the real test action without secrets.');

    await setViewport(session, 390, 900);
    await navigate(session, '/', { publicPage: true });
    await capture(session, '33-public-mobile-header.png', 'Public mobile header', 'Two-logo mobile header stays compact at 390 px.');
    await scrollToText(session, 'Scan the QR. Start Your Booking.');
    await capture(session, '34-public-mobile-page.png', 'Public mobile page', 'Home content and QR booking section remain readable at 390 px.');

    await navigate(session, '/admin/dashboard');
    await evaluate(session, `(() => { const control = [...document.querySelectorAll('button')].find((button) => button.textContent.includes('Open menu')); control?.click(); return Boolean(control); })()`);
    await waitForExpression(session, `document.querySelector('[role="dialog"]') !== null`);
    await capture(session, '35-admin-responsive-menu.png', 'Admin responsive layout', 'Mobile admin navigation opens without page overflow.');

    await setViewport(session, 1440, 1000);
    await navigate(session, '/admin/dashboard');
    await capture(session, '36-final-dashboard-test-data.png', 'Dashboard', 'Final dashboard reflects temporary booking, enquiry and feedback test data.');
    await navigate(session, '/', { publicPage: true });
    await evaluate(session, 'scrollTo(0, document.documentElement.scrollHeight)');
    await sleep(600);
    await capture(session, '37-footer-branding-qr.png', 'Footer', 'Footer shows both brand assets and the requested Safety First QR booking block.');

    await setViewport(session, 1440, 1000);
    await navigate(session, '/', { publicPage: true });
    await capture(session, '38-homepage-1380-container-desktop.png', 'Global layout', 'Homepage uses the centered 1380px content system with balanced large-screen density.');

    await navigate(session, '/journey', { publicPage: true });
    await capture(session, '39-journey-1380-bharatgas-selected.png', 'Journey', 'Desktop Journey page shows the Bharatgas track in the 1380px layout.');
    await evaluate(session, `document.querySelector('[data-journey-tab="MBGA"]')?.click()`);
    await waitForExpression(session, `document.querySelector('[data-journey-panel="MBGA"]')?.classList.contains('is-active')`);
    await capture(session, '40-journey-mbga-selected.png', 'Journey', 'Segmented Journey control switches to the distinct Madhav Bharat Gas track.');

    await setViewport(session, 390, 900);
    await navigate(session, '/journey', { publicPage: true });
    await capture(session, '41-journey-mobile-390.png', 'Journey responsive', 'Journey becomes a clean single vertical timeline with the two-track selector at 390px.');

    await setViewport(session, 1440, 1000);
    await navigate(session, '/sustainability', { publicPage: true });
    await capture(session, '42-sustainability-editorial-hero.png', 'Sustainability', 'New editorial hero uses MBGA brand styling with a restrained sustainability accent.');
    await scrollToText(session, 'QA - Responsible Handling Evidence');
    await capture(session, '43-sustainability-content-desktop.png', 'Sustainability', 'Dynamic responsible-practice cards render in the desktop content grid.');

    await setViewport(session, 390, 900);
    await navigate(session, '/sustainability', { publicPage: true });
    await capture(session, '44-sustainability-mobile-390.png', 'Sustainability responsive', 'Editorial hero and content reflow without horizontal overflow at 390px.');

    await setViewport(session, 1440, 1000);
    await navigate(session, '/', { publicPage: true });
    await scrollToText(session, 'Local LPG Information');
    await capture(session, '45-local-lpg-information-desktop.png', 'Local LPG Information', 'Dynamic localities, categories and topics use a composed desktop discovery grid.');

    await setViewport(session, 390, 900);
    await navigate(session, '/', { publicPage: true });
    await scrollToText(session, 'Local LPG Information');
    await evaluate(session, `document.querySelector('.discovery-toggle')?.click()`);
    await waitForExpression(session, `document.querySelector('.discovery-toggle')?.getAttribute('aria-expanded') === 'true'`);
    await capture(session, '46-local-lpg-mobile-accordion.png', 'Local LPG Information responsive', 'Mobile discovery uses an accessible expanded accordion with dynamic locality data.');

    await setViewport(session, 1440, 1000);
    await navigate(session, '/admin/journey');
    await capture(session, '47-journey-admin-list.png', 'Journey admin', 'Journey list shows track, order, publication status and consistent actions.');
    await navigate(session, '/admin/journey/new');
    await capture(session, '48-journey-new-full-page.png', 'Journey admin', 'Add Journey Item opens a dedicated full-page form with publishing sidebar and sticky actions.');
    await navigate(session, '/admin/sustainability');
    await capture(session, '49-sustainability-admin-list.png', 'Sustainability admin', 'Sustainability uses a searchable professional list instead of a form drawer.');
    await navigate(session, '/admin/sustainability/new');
    await capture(session, '50-sustainability-new-full-page.png', 'Sustainability admin', 'Add Sustainability Item uses the shared full-page CRUD pattern.');
    await navigate(session, '/admin/products/new');
    await capture(session, '51-product-new-full-page.png', 'Product admin', 'Product creation uses structured main content, publishing sidebar and sticky Save action.');
    await navigate(session, '/admin/gallery/new');
    await capture(session, '52-gallery-new-full-page.png', 'Gallery admin', 'Gallery creation uses accessible media fields in a dedicated page.');
    await navigate(session, '/admin/achievements/new');
    await capture(session, '53-achievement-new-full-page.png', 'Achievements admin', 'Achievement creation shares the same professional full-page form system.');

    await setViewport(session, 1600, 1000);
    await navigate(session, '/admin/dashboard');
    await capture(session, '54-admin-dashboard-wide-1600.png', 'Dashboard', 'Wide dashboard uses four metrics and a balanced two-thirds/one-third chart layout.');
    await setViewport(session, 768, 1000);
    await navigate(session, '/admin/journey');
    await capture(session, '55-admin-tablet-768.png', 'Admin responsive', 'Admin navigation and Journey records remain usable at the required tablet width.');

    await setViewport(session, 1440, 1000);
    await navigate(session, '/', { publicPage: true });
    await scrollToText(session, 'QA - Dynamic Locality Evidence');
    await capture(session, '56-dynamic-admin-db-public-result.png', 'Dynamic verification', 'Temporary admin-saved locality is visibly rendered through API and PostgreSQL on the public homepage.');
    await evaluate(session, 'scrollTo(0, document.documentElement.scrollHeight)');
    await sleep(600);
    await capture(session, '57-final-public-footer.png', 'Footer', 'Final public footer retains both brands, Safety First QR and responsive column balance.');

    responsiveRenders = await auditAdminResponsive(session);
    const uniqueFailures = [...new Set(browserFailures.filter((failure) => !failure.includes('/api/admin/settings/site-content')) )];
    verify(uniqueFailures.length === 0, `Browser evidence QA found errors:\n- ${uniqueFailures.join('\n- ')}`);
    verify(screenshots.length === 57, `Expected 57 evidence screenshots, created ${screenshots.length}`);

    await fs.writeFile(path.join(process.cwd(), 'docs', 'qa-evidence.json'), JSON.stringify({
      generatedAt: new Date().toISOString(), screenshots,
      publicEvidenceViewportWidths: [390, 1440, 1600],
      publicResponsiveAuditCommand: 'npm run test:browser',
      adminResponsiveRenders: responsiveRenders, browserFailures: uniqueFailures,
    }, null, 2));
    process.stdout.write(`\nEvidence QA PASS: ${screenshots.length} screenshots and ${responsiveRenders} responsive admin renders.\n`);
  } finally {
    try { await restoreAndCleanup(); } catch (error) { process.stderr.write(`Evidence cleanup failed: ${error.stack || error.message}\n`); process.exitCode = 1; }
    session?.close();
    const chromeExited = new Promise((resolve) => chrome.once('exit', resolve));
    chrome.kill();
    await Promise.race([chromeExited, sleep(2500)]);
    await fs.rm(temporaryDirectory, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 }).catch(() => undefined);
    await database?.end().catch(() => undefined);
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
