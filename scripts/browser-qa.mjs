import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const WebSocketClient = require('next/dist/compiled/ws');

const baseUrl = (process.env.BROWSER_QA_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const defaultRoutes = ['/', '/products', '/journey', '/achievements', '/sustainability', '/gallery', '/contact'];
const defaultWidths = [320, 360, 390, 414, 768, 1024, 1280, 1366, 1440, 1600, 1920];
const routes = process.env.BROWSER_QA_ROUTES
  ? process.env.BROWSER_QA_ROUTES.split(',').map((route) => route.trim()).filter(Boolean)
  : defaultRoutes;
const widths = process.env.BROWSER_QA_WIDTHS
  ? process.env.BROWSER_QA_WIDTHS.split(',').map(Number).filter((width) => Number.isInteger(width) && width >= 280)
  : defaultWidths;
const screenshotsEnabled = process.env.BROWSER_QA_SCREENSHOTS === '1';
const loaderScreenshotsEnabled = process.env.BROWSER_QA_LOADER_SCREENSHOTS === '1';
const screenshotTargets = new Set(['/@360', '/@1440', '/products@390', '/products@1440', '/journey@390', '/gallery@1280', '/contact@390']);
const artifactDirectory = path.join(process.cwd(), 'qa-artifacts');

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

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

function chromeExecutable() {
  const candidates = process.platform === 'win32'
    ? [
        process.env.CHROME_PATH,
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      ]
    : [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
  return candidates.find(Boolean);
}

async function waitForDebugger(port) {
  const endpoint = `http://127.0.0.1:${port}/json/version`;
  let lastError;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) return response.json();
    } catch (error) {
      lastError = error;
    }
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
      const timeout = setTimeout(() => reject(new Error('CDP WebSocket connection timed out')), 10000);
      this.socket.once('open', () => {
        clearTimeout(timeout);
        resolve();
      });
      this.socket.once('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Unable to connect to Chrome DevTools: ${error.message}`));
      });
    });
    this.socket.on('message', (data) => {
      if (process.env.BROWSER_QA_DEBUG === '1') {
        process.stderr.write(`[CDP message] ${typeof data} ${data?.constructor?.name || ''}\n`);
      }
      let raw;
      if (typeof data === 'string') raw = data;
      else if (data instanceof ArrayBuffer) raw = Buffer.from(data).toString('utf8');
      else if (ArrayBuffer.isView(data)) raw = Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('utf8');
      else raw = String(data);
      let message;
      try {
        message = JSON.parse(raw);
      } catch (error) {
        for (const pending of this.pending.values()) {
          clearTimeout(pending.timeout);
          pending.reject(new Error(`Chrome DevTools returned an unreadable message: ${error.message}`));
        }
        this.pending.clear();
        return;
      }
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
    this.socket.on('error', (error) => {
      if (process.env.BROWSER_QA_DEBUG === '1') {
        process.stderr.write(`[CDP error] ${error?.message || 'unknown'}\n`);
      }
    });
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) || [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, 60000);
      this.pending.set(id, { method, resolve, reject, timeout });
      this.socket.send(JSON.stringify({ id, method, params }), (error) => {
        if (!error) return;
        clearTimeout(timeout);
        this.pending.delete(id);
        reject(new Error(`${method} could not be sent: ${error.message}`));
      });
    });
  }

  close() {
    this.socket?.close();
  }
}

async function evaluate(session, expression) {
  const result = await session.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Browser evaluation failed');
  }
  return result.result.value;
}

async function waitForPage(session) {
  let lastState;
  for (let attempt = 0; attempt < 160; attempt += 1) {
    const ready = await evaluate(session, `({
      complete: document.readyState === 'complete',
      ready: document.readyState === 'interactive' || document.readyState === 'complete',
      readyState: document.readyState,
      runtime: window.__MBGA_RUNTIME_LOADED__ === true,
      shell: Boolean(document.querySelector('#main-content') && document.querySelector('.site-header') && document.querySelector('.premium-footer')),
      url: location.href,
      title: document.title,
      main: Boolean(document.querySelector('#main-content')),
      header: Boolean(document.querySelector('.site-header')),
      footer: Boolean(document.querySelector('.premium-footer')),
      nextError: document.body?.innerText?.slice(0, 240) || ''
    })`);
    lastState = ready;
    if (ready.ready && ready.runtime && ready.shell) {
      await evaluate(session, `Promise.all([...document.images].map((image) => {
        image.loading = 'eager';
        if (image.complete) return true;
        return new Promise((resolve) => {
          image.addEventListener('load', () => resolve(true), { once: true });
          image.addEventListener('error', () => resolve(false), { once: true });
          setTimeout(() => resolve(false), 3500);
        });
      }))`);
      await sleep(850);
      return;
    }
    await sleep(100);
  }
  throw new Error(`Page shell did not finish loading: ${JSON.stringify(lastState)}`);
}

const pageAuditExpression = `(() => {
  const description = document.querySelector('meta[name="description"]')?.content || '';
  const canonical = document.querySelector('link[rel="canonical"]')?.href || '';
  const ogTitle = document.querySelector('meta[property="og:title"]')?.content || '';
  const ogDescription = document.querySelector('meta[property="og:description"]')?.content || '';
  const images = [...document.images];
  const brokenImages = images
    .filter((image) => !image.complete || image.naturalWidth === 0)
    .map((image) => image.currentSrc || image.src || image.alt)
    .slice(0, 12);
  const imagesWithoutAlt = images.filter((image) => !image.hasAttribute('alt')).map((image) => image.src).slice(0, 12);
  const duplicateIds = [...document.querySelectorAll('[id]')]
    .map((element) => element.id)
    .filter((id, index, values) => id && values.indexOf(id) !== index)
    .filter((id, index, values) => values.indexOf(id) === index);
  const internalLinks = [...document.querySelectorAll('a[href]')]
    .map((link) => link.href)
    .filter((href) => {
      try {
        const url = new URL(href);
        return url.origin === location.origin && ['http:', 'https:'].includes(url.protocol);
      } catch {
        return false;
      }
    })
    .map((href) => {
      const url = new URL(href);
      return url.pathname + url.search;
    });
  const documentWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  const overflow = Math.max(0, Math.round(documentWidth - innerWidth));
  const overflowElements = overflow === 0 ? [] : [...document.querySelectorAll('body *')]
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden' && (rect.right > innerWidth + 1 || rect.left < -1);
    })
    .slice(0, 8)
    .map((element) => element.tagName.toLowerCase() + (element.id ? '#' + element.id : '') + (element.classList.length ? '.' + [...element.classList].slice(0, 2).join('.') : ''));
  const headingLevels = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((heading) => Number(heading.tagName.slice(1)));
  const headingJumps = headingLevels.filter((level, index) => index > 0 && level - headingLevels[index - 1] > 1);
  return {
    title: document.title.trim(),
    description: description.trim(),
    canonical,
    ogTitle: ogTitle.trim(),
    ogDescription: ogDescription.trim(),
    language: document.documentElement.lang,
    h1Count: document.querySelectorAll('h1').length,
    mainCount: document.querySelectorAll('main#main-content').length,
    hasHeader: Boolean(document.querySelector('.site-header')),
    hasNewsletter: Boolean(document.querySelector('.newsletter-section')),
    hasDiscovery: Boolean(document.querySelector('.local-discovery')),
    hasFooter: Boolean(document.querySelector('.premium-footer')),
    hasSkipLink: Boolean(document.querySelector('.skip-link[href="#main-content"]')),
    hasMobileActions: Boolean(document.querySelector('.mobile-bar')),
    overflow,
    overflowElements,
    brokenImages,
    imagesWithoutAlt,
    duplicateIds,
    headingJumps,
    internalLinks: [...new Set(internalLinks)],
  };
})()`;

function validateAudit(label, audit, titles, descriptions, failures) {
  const required = [
    ['exactly one H1', audit.h1Count === 1],
    ['main#main-content', audit.mainCount === 1],
    ['shared navbar', audit.hasHeader],
    ['newsletter', audit.hasNewsletter],
    ['local discovery', audit.hasDiscovery],
    ['premium footer', audit.hasFooter],
    ['skip link', audit.hasSkipLink],
    ['mobile actions', audit.hasMobileActions],
    ['page title', Boolean(audit.title)],
    ['meta description', Boolean(audit.description)],
    ['canonical URL', Boolean(audit.canonical)],
    ['OpenGraph basics', Boolean(audit.ogTitle && audit.ogDescription)],
    ['document language', audit.language === 'en-IN'],
    ['zero horizontal overflow', audit.overflow === 0],
    ['zero broken images', audit.brokenImages.length === 0],
    ['image alt attributes', audit.imagesWithoutAlt.length === 0],
    ['unique element IDs', audit.duplicateIds.length === 0],
    ['logical heading levels', audit.headingJumps.length === 0],
  ];
  for (const [name, passed] of required) {
    if (!passed) failures.push(`${label}: ${name} failed`);
  }
  if (audit.overflowElements.length) failures.push(`${label}: overflow candidates ${audit.overflowElements.join(', ')}`);
  if (audit.brokenImages.length) failures.push(`${label}: broken images ${audit.brokenImages.join(', ')}`);
  if (audit.imagesWithoutAlt.length) failures.push(`${label}: missing alt ${audit.imagesWithoutAlt.join(', ')}`);
  if (audit.duplicateIds.length) failures.push(`${label}: duplicate IDs ${audit.duplicateIds.join(', ')}`);
  titles.set(label.split('@')[0], audit.title);
  descriptions.set(label.split('@')[0], audit.description);
}

async function testMobileMenu(session, label, failures) {
  const opened = await evaluate(session, `(() => {
    const button = document.querySelector('.menu-toggle');
    button?.click();
    return Boolean(button && button.getAttribute('aria-expanded') === 'true' && document.querySelector('.nav.open') && document.body.classList.contains('menu-open'));
  })()`);
  if (!opened) failures.push(`${label}: mobile navigation did not open correctly`);
  await session.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await session.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  const closed = await evaluate(session, `(() => {
    const button = document.querySelector('.menu-toggle');
    return Boolean(button && button.getAttribute('aria-expanded') === 'false' && !document.querySelector('.nav.open') && !document.body.classList.contains('menu-open'));
  })()`);
  if (!closed) failures.push(`${label}: Escape did not close mobile navigation`);
}

async function testPageInteractions(session, route, width, label, failures) {
  if (width <= 480) await testMobileMenu(session, label, failures);

  if (width === 390) {
    const accordion = await evaluate(session, `(() => {
      const button = document.querySelector('.discovery-toggle');
      if (!button) return false;
      button.click();
      return button.getAttribute('aria-expanded') === 'true' && button.closest('.discovery-group')?.classList.contains('open');
    })()`);
    if (!accordion) failures.push(`${label}: discovery accordion failed`);
  }

  if (route === '/' && width === 1440) {
    const hero = await evaluate(session, `(() => {
      const slider = document.querySelector('.hero-slider');
      const before = [...slider?.querySelectorAll('.hero-slide') || []].findIndex((slide) => slide.classList.contains('is-active'));
      slider?.querySelector('.slider-next')?.click();
      const after = [...slider?.querySelectorAll('.hero-slide') || []].findIndex((slide) => slide.classList.contains('is-active'));
      return Boolean(slider && before >= 0 && after >= 0 && (slider.querySelectorAll('.hero-slide').length === 1 || before !== after));
    })()`);
    if (!hero) failures.push(`${label}: hero arrow interaction failed`);
  }

  if (route === '/journey' && width === 390) {
    const timeline = await evaluate(session, `(async () => {
      const element = document.querySelector('[data-timeline]');
      const firstItem = element?.querySelector('.timeline-item');
      if (!element || !firstItem) return { passed: false, reason: 'missing timeline or first milestone' };
      const previousScrollBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, firstItem.getBoundingClientRect().top + scrollY - innerHeight * 0.45);
      window.dispatchEvent(new Event('scroll'));
      await new Promise((resolve) => setTimeout(resolve, 80));
      document.documentElement.style.scrollBehavior = previousScrollBehavior;
      const fill = parseFloat(element.querySelector('.timeline-progress span')?.style.height || '0');
      const bounds = element.getBoundingClientRect();
      const active = element.querySelectorAll('.timeline-item.is-active').length;
      return {
        passed: fill > 0 && active > 0,
        fill,
        active,
        scrollY,
        innerHeight,
        timelineTop: Math.round(bounds.top),
        timelineHeight: Math.round(bounds.height),
        firstTop: Math.round(firstItem.getBoundingClientRect().top),
      };
    })()`);
    if (!timeline.passed) failures.push(`${label}: timeline scroll activation failed ${JSON.stringify(timeline)}`);
  }

  if (route === '/gallery' && width === 390) {
    const gallery = await evaluate(session, `(async () => {
      const filter = document.querySelector('.filter:not([data-filter="all"])');
      if (!filter) return false;
      filter.click();
      await new Promise((resolve) => setTimeout(resolve, 240));
      const visible = document.querySelector('.gallery-item[data-category]:not(.hidden)');
      visible?.click();
      await new Promise((resolve) => setTimeout(resolve, 80));
      return Boolean(visible && document.querySelector('.modal.open[aria-hidden="false"]'));
    })()`);
    if (!gallery) failures.push(`${label}: gallery filter/lightbox failed`);
    await session.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await session.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    const closed = await evaluate(session, `!document.querySelector('.modal.open') && document.querySelector('.modal')?.getAttribute('aria-hidden') === 'true'`);
    if (!closed) failures.push(`${label}: Escape did not close gallery lightbox`);
  }

  if (route === '/contact' && width === 390) {
    const contactValidation = await evaluate(session, `(() => {
      const form = document.querySelector('#contact-form');
      if (!form) return false;
      const required = [...form.querySelectorAll('[required]')];
      return required.length > 0 && !form.checkValidity();
    })()`);
    if (!contactValidation) failures.push(`${label}: contact form required-field validation missing`);
  }

  if (width === 390) {
    const newsletter = await evaluate(session, `(async () => {
      const form = document.querySelector('.newsletter-form');
      const input = form?.querySelector('input[type="email"]');
      if (!form || !input) return false;
      input.value = 'invalid-email';
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await new Promise((resolve) => setTimeout(resolve, 50));
      return form.classList.contains('is-error') && Boolean(form.querySelector('.newsletter-message')?.textContent.trim());
    })()`);
    if (!newsletter) failures.push(`${label}: newsletter validation failed`);
  }
}

async function checkLinks(paths, failures) {
  for (const internalPath of [...paths].sort()) {
    const response = await fetch(`${baseUrl}${internalPath}`, { redirect: 'manual' });
    if (response.status >= 400) failures.push(`Broken internal link: ${internalPath} returned ${response.status}`);
  }
}

async function main() {
  const chromePath = chromeExecutable();
  if (!chromePath) throw new Error('Google Chrome/Chromium not found. Set CHROME_PATH and retry.');
  await fetch(baseUrl, { signal: AbortSignal.timeout(5000) }).then((response) => {
    if (!response.ok) throw new Error(`Website returned HTTP ${response.status}`);
  });

  const port = await getFreePort();
  const profileDirectory = await mkdtemp(path.join(os.tmpdir(), 'mbga-browser-qa-'));
  const chromeDiagnostics = [];
  let chromeExit = '';
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-features=MediaRouter,Translate',
    '--disable-gpu',
    '--disable-gpu-compositing',
    '--disable-gpu-sandbox',
    '--disable-dev-shm-usage',
    '--disable-software-rasterizer',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-allow-origins=*',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDirectory}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });

  chrome.stderr.on('data', (chunk) => {
    chromeDiagnostics.push(chunk.toString('utf8'));
    if (chromeDiagnostics.length > 40) chromeDiagnostics.shift();
  });
  chrome.on('exit', (code, signal) => {
    chromeExit = `Chrome exited with code ${code ?? 'unknown'}${signal ? ` and signal ${signal}` : ''}`;
  });

  let session;
  try {
    await waitForDebugger(port);
    const targetResponse = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
    if (!targetResponse.ok) throw new Error(`Unable to create Chrome target: HTTP ${targetResponse.status}`);
    const target = await targetResponse.json();
    if (!target.webSocketDebuggerUrl) throw new Error('Chrome did not expose a debuggable page target');
    session = new CdpSession(target.webSocketDebuggerUrl);
    await session.connect();
    await Promise.all([
      session.send('Page.enable'),
      session.send('Runtime.enable'),
      session.send('Log.enable'),
      session.send('Network.enable'),
    ]);

    const failures = [];
    const internalPaths = new Set(routes);
    const titles = new Map();
    const descriptions = new Map();
    let currentLabel = 'startup';

    session.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
      const message = exceptionDetails?.exception?.description || exceptionDetails?.text || 'unknown exception';
      failures.push(`${currentLabel}: uncaught JavaScript error: ${message}`);
    });
    session.on('Log.entryAdded', ({ entry }) => {
      if (entry?.level === 'error' && entry?.source === 'javascript') failures.push(`${currentLabel}: console error: ${entry.text}`);
    });
    session.on('Network.responseReceived', ({ response }) => {
      if (response?.url?.startsWith(baseUrl) && response.status >= 400) {
        failures.push(`${currentLabel}: HTTP ${response.status} ${response.url}`);
      }
    });
    session.on('Network.loadingFailed', ({ errorText, canceled, type }) => {
      if (!canceled && ['Document', 'Script', 'Stylesheet', 'Image', 'Fetch', 'XHR'].includes(type)) {
        failures.push(`${currentLabel}: network ${type} failed: ${errorText}`);
      }
    });

    if (screenshotsEnabled) await mkdir(artifactDirectory, { recursive: true });

    for (const route of routes) {
      for (const width of widths) {
        currentLabel = `${route}@${width}`;
        await session.send('Emulation.setDeviceMetricsOverride', {
          width,
          height: width <= 480 ? 900 : 1000,
          deviceScaleFactor: 1,
          mobile: width <= 480,
          screenWidth: width,
          screenHeight: width <= 480 ? 900 : 1000,
        });
        await session.send('Emulation.setTouchEmulationEnabled', { enabled: width <= 480, maxTouchPoints: width <= 480 ? 5 : 1 });
        await session.send('Page.navigate', { url: `${baseUrl}${route}` });
        try {
          await waitForPage(session);
        } catch (error) {
          const recentDiagnostics = failures.slice(-12).join(' | ');
          throw new Error(`${error.message}${recentDiagnostics ? ` | Browser diagnostics: ${recentDiagnostics}` : ''}`);
        }
        const audit = await evaluate(session, pageAuditExpression);
        validateAudit(currentLabel, audit, titles, descriptions, failures);
        for (const internalPath of audit.internalLinks) internalPaths.add(internalPath);
        await testPageInteractions(session, route, width, currentLabel, failures);

        if (loaderScreenshotsEnabled && route === '/' && [390, 1440].includes(width)) {
          await mkdir(artifactDirectory, { recursive: true });
          await evaluate(session, `(() => { const loader = document.querySelector('#loader'); if (!loader) return false; loader.classList.remove('hidden'); loader.style.opacity = '1'; loader.style.visibility = 'visible'; return true; })()`);
          await sleep(550);
          const capture = await session.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
          await writeFile(path.join(artifactDirectory, `bottling-plant-loader-${width}.png`), Buffer.from(capture.data, 'base64'));
          await evaluate(session, `(() => { const loader = document.querySelector('#loader'); if (!loader) return; loader.classList.add('hidden'); loader.style.removeProperty('opacity'); loader.style.removeProperty('visibility'); })()`);
        }

        if (screenshotsEnabled && screenshotTargets.has(`${route}@${width}`)) {
          if (route === '/products') {
            await evaluate(session, `document.querySelector('.catalog-product')?.scrollIntoView({ block: 'center' })`);
            await sleep(350);
          } else {
            await evaluate(session, 'scrollTo(0, 0)');
          }
          const capture = await session.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
          const routeName = route === '/' ? 'home' : route.slice(1);
          await writeFile(path.join(artifactDirectory, `${routeName}-${width}.png`), Buffer.from(capture.data, 'base64'));
        }
      }
      process.stdout.write(`✓ ${route} — ${widths.length} viewport widths\n`);
    }

    if (new Set(titles.values()).size !== routes.length) failures.push('SEO titles are not unique across all public routes');
    if (new Set(descriptions.values()).size !== routes.length) failures.push('Meta descriptions are not unique across all public routes');
    await checkLinks(internalPaths, failures);

    const uniqueFailures = [...new Set(failures)];
    if (uniqueFailures.length) {
      process.stderr.write(`\nBrowser QA failed with ${uniqueFailures.length} issue(s):\n- ${uniqueFailures.join('\n- ')}\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`\nBrowser QA PASS: ${routes.length} routes × ${widths.length} widths = ${routes.length * widths.length} renders; 0 console errors, broken images, broken links or horizontal overflow.\n`);
  } catch (error) {
    const diagnostics = chromeDiagnostics.join('').trim().slice(-4000);
    const details = [chromeExit, diagnostics].filter(Boolean).join('\n');
    throw new Error(`${error.message}${details ? `\nChrome diagnostics:\n${details}` : ''}`, { cause: error });
  } finally {
    session?.close();
    const chromeExited = new Promise((resolve) => chrome.once('exit', resolve));
    chrome.kill();
    await Promise.race([chromeExited, sleep(2000)]);
    if (path.basename(profileDirectory).startsWith('mbga-browser-qa-')) {
      try {
        await rm(profileDirectory, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
      } catch (error) {
        process.stderr.write(`Warning: temporary Chrome profile cleanup was deferred (${error.message}).\n`);
      }
    }
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
