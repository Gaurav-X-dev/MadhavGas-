import pg from 'pg';
import { loadLocalEnv } from './env.mjs';

loadLocalEnv();
if (!process.env.DATABASE_URI) {
  console.error('[DATABASE] DATABASE_URI is missing from .env.local.');
  process.exit(1);
}

const configuredUrl = new URL(process.env.DATABASE_URI);
const targetDatabase = configuredUrl.pathname.slice(1);
const maintenanceUrl = new URL(configuredUrl);
maintenanceUrl.pathname = '/postgres';
const client = new pg.Client({ connectionString: maintenanceUrl.toString() });
try {
  await client.connect();
  const connection = await client.query('SELECT current_user AS username');
  const target = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [targetDatabase]);
  console.log('[DATABASE] PostgreSQL credentials passed.');
  console.log({ username: connection.rows[0]?.username, targetDatabase, targetExists: Boolean(target.rowCount) });
} catch (error) {
  if (error?.code === '28P01') {
    console.error('[DATABASE] Login failed: the PostgreSQL username/password in DATABASE_URI is not accepted.');
    console.error('[DATABASE] Update DATABASE_URI with the real PostgreSQL password, then run this command again.');
  } else if (error?.code === '3D000') {
    console.error('[DATABASE] The configured database does not exist. Connect with the same credentials and create it, or run npm run db:setup.');
  } else if (error?.code === 'ECONNREFUSED') {
    console.error('[DATABASE] PostgreSQL is not reachable. Start the PostgreSQL service and check host/port.');
  } else {
    console.error(`[DATABASE] ${error instanceof Error ? error.message : 'Connection check failed.'}`);
  }
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
