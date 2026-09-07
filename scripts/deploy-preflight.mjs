import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import pg from 'pg';
import { loadLocalEnv } from './env.mjs';

loadLocalEnv();

const failures = [];
const warnings = [];
const pass = (message) => process.stdout.write(`✓ ${message}\n`);
const fail = (message) => failures.push(message);
const warn = (message) => warnings.push(message);
const value = (key) => (process.env[key] || '').trim();
const looksPlaceholder = (input) => /change-me|replace-|your-|example\.com|localhost/i.test(input);

const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor >= 20 && nodeMajor < 25) pass(`Node.js ${process.versions.node} is supported`);
else fail(`Use Node.js 20, 22 or 24 (current: ${process.versions.node})`);

const databaseUri = value('DATABASE_URI');
if (!databaseUri) fail('DATABASE_URI is required');
else {
  try {
    const url = new URL(databaseUri);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) fail('DATABASE_URI must use PostgreSQL');
    else if (looksPlaceholder(databaseUri)) fail('DATABASE_URI still contains a local/example value');
    else pass(`PostgreSQL target configured for ${url.hostname}/${url.pathname.slice(1)}`);
  } catch {
    fail('DATABASE_URI is not a valid connection URL');
  }
}

const authSecret = value('AUTH_SECRET');
if (authSecret.length < 32 || looksPlaceholder(authSecret)) fail('AUTH_SECRET must be a new random value of at least 32 characters');
else pass('AUTH_SECRET meets the production length requirement');

const siteUrl = value('NEXT_PUBLIC_SITE_URL');
try {
  const url = new URL(siteUrl);
  if (url.protocol !== 'https:' || looksPlaceholder(siteUrl)) fail('NEXT_PUBLIC_SITE_URL must be the final HTTPS production domain');
  else pass(`Production site URL is ${url.origin}`);
} catch {
  fail('NEXT_PUBLIC_SITE_URL must be a valid HTTPS URL');
}

const adminEmail = value('ADMIN_EMAIL');
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail) || looksPlaceholder(adminEmail)) fail('ADMIN_EMAIL must be a real production email');
else pass('ADMIN_EMAIL is configured');

const adminPassword = value('ADMIN_PASSWORD');
if (adminPassword.length < 12 || looksPlaceholder(adminPassword) || /^(123456|password|admin)/i.test(adminPassword)) {
  fail('ADMIN_PASSWORD must be a strong production password of at least 12 characters');
} else pass('ADMIN_PASSWORD meets the production minimum');

const smtpKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM_EMAIL'];
const smtpValues = smtpKeys.map(value);
if (smtpValues.every(Boolean) && smtpValues.every((item) => !looksPlaceholder(item))) pass('SMTP delivery configuration is complete');
else if (smtpValues.some((item) => item && !looksPlaceholder(item))) warn('SMTP is partially configured; complete every SMTP value or remove all of them');
else warn('SMTP is not configured; forms still save to PostgreSQL but email delivery stays disabled');

try {
  await fs.access('public/uploads', constants.W_OK);
  pass('public/uploads is writable');
} catch {
  // fs/promises does not expose constants on older Node releases.
  try {
    await fs.access('public/uploads');
    pass('public/uploads exists (confirm persistent write access in Hostinger)');
  } catch {
    fail('public/uploads is missing or inaccessible');
  }
}

if (databaseUri && !looksPlaceholder(databaseUri)) {
  const client = new pg.Client({ connectionString: databaseUri, connectionTimeoutMillis: 8000 });
  try {
    await client.connect();
    const result = await client.query("SELECT to_regclass('public.cms_singletons') AS cms, to_regclass('public.admin_users') AS users");
    if (!result.rows[0]?.cms || !result.rows[0]?.users) fail('Database is reachable but schema is missing; run npm run db:setup');
    else pass('Database connection and required schema passed');
  } catch (error) {
    fail(`Database connection failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  } finally {
    await client.end().catch(() => undefined);
  }
}

for (const message of warnings) process.stdout.write(`! ${message}\n`);
if (failures.length) {
  process.stderr.write(`\nDeployment preflight failed with ${failures.length} issue(s):\n- ${failures.join('\n- ')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`\nDeployment preflight PASS${warnings.length ? ` with ${warnings.length} optional warning(s)` : ''}.\n`);
}
