import pg from 'pg';
import bcrypt from 'bcryptjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadLocalEnv } from './env.mjs';

loadLocalEnv();

if (!process.env.DATABASE_URI) throw new Error('DATABASE_URI is missing');
if (!process.env.ADMIN_EMAIL?.trim()) throw new Error('ADMIN_EMAIL is missing');
if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 8) {
  throw new Error('ADMIN_PASSWORD must be at least 8 characters');
}

const { Client } = pg;

function failConnection(error) {
  if (error?.code === '28P01') {
    console.error('[DATABASE] PostgreSQL rejected the username/password in DATABASE_URI.');
    console.error('[DATABASE] Correct the password in the deployment environment, then run npm run db:check.');
  } else if (error?.code === 'ECONNREFUSED') {
    console.error('[DATABASE] PostgreSQL is not reachable. Start the service and verify the configured host/port.');
  } else {
    console.error(`[DATABASE] ${error instanceof Error ? error.message : 'Unable to connect.'}`);
  }
  process.exit(1);
}

const configuredUrl = new URL(process.env.DATABASE_URI);
const databaseName = configuredUrl.pathname.slice(1);
let client = new Client({ connectionString: process.env.DATABASE_URI });

try {
  await client.connect();
} catch (error) {
  if (error?.code !== '3D000') failConnection(error);

  const maintenanceUrl = new URL(configuredUrl);
  maintenanceUrl.pathname = '/postgres';
  const maintenance = new Client({ connectionString: maintenanceUrl.toString() });
  try {
    await maintenance.connect();
    const safeName = databaseName.replace(/"/g, '""');
    await maintenance.query(`CREATE DATABASE "${safeName}"`);
    console.log(`Created database ${databaseName}`);
  } catch (maintenanceError) {
    failConnection(maintenanceError);
  } finally {
    await maintenance.end().catch(() => undefined);
  }

  client = new Client({ connectionString: process.env.DATABASE_URI });
  try {
    await client.connect();
  } catch (retryError) {
    failConnection(retryError);
  }
}

await client.query(`
  CREATE EXTENSION IF NOT EXISTS pgcrypto;

  CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(40) NOT NULL DEFAULT 'Super Admin',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    last_active TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS cms_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource VARCHAR(50) NOT NULL,
    document_id VARCHAR(160) NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(resource, document_id)
  );
  CREATE INDEX IF NOT EXISTS cms_documents_resource_idx ON cms_documents(resource, sort_order);

  CREATE TABLE IF NOT EXISTS cms_singletons (
    key VARCHAR(80) PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(30) NOT NULL,
    reference_no VARCHAR(40) NOT NULL UNIQUE,
    data JSONB NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'New',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS submissions_type_date_idx ON submissions(type, created_at DESC);
  CREATE UNIQUE INDEX IF NOT EXISTS newsletter_email_unique_idx ON submissions (LOWER(data->>'email')) WHERE type = 'newsletter';

  CREATE TABLE IF NOT EXISTS auth_attempts (
    id BIGSERIAL PRIMARY KEY,
    ip VARCHAR(80) NOT NULL,
    email VARCHAR(255) NOT NULL,
    succeeded BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS auth_attempts_lookup_idx ON auth_attempts(ip, email, created_at DESC);

  CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    action VARCHAR(120) NOT NULL,
    resource VARCHAR(50),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_users_role_check') THEN
      ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check CHECK (role IN ('Super Admin','Editor','Support Staff','Viewer'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'submissions_type_check') THEN
      ALTER TABLE submissions ADD CONSTRAINT submissions_type_check CHECK (type IN ('enquiry','feedback','booking','newsletter'));
    END IF;
  END $$;
`);

await client.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name VARCHAR(180) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`);

const migrationDirectory = path.join(process.cwd(), 'migrations');
const migrationFiles = (await fs.readdir(migrationDirectory)).filter((name) => name.endsWith('.sql')).sort();

for (const name of migrationFiles) {
  const applied = await client.query('SELECT 1 FROM schema_migrations WHERE name=$1', [name]);
  if (applied.rowCount) continue;

  const sql = await fs.readFile(path.join(migrationDirectory, name), 'utf8');
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [name]);
    await client.query('COMMIT');
    console.log(`Applied migration ${name}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

const adminEmail = process.env.ADMIN_EMAIL.trim().toLowerCase();
const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
await client.query(
  `INSERT INTO admin_users (name, email, password_hash, role)
   VALUES ('MBGA Administrator', $1, $2, 'Super Admin')
   ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, active = TRUE, updated_at = NOW()`,
  [adminEmail, passwordHash],
);

await client.end();
console.log('CMS seed sync skipped. Manage website content from the admin panel.');
console.log(`Database ready. Admin login: ${adminEmail}`);
