import { Pool, type PoolClient, type QueryResultRow } from 'pg';

const connectionString = process.env.DATABASE_URI;

if (!connectionString) {
  throw new Error('DATABASE_URI is not configured');
}

const globalForDb = globalThis as unknown as { mbgaPool?: Pool };

export const db =
  globalForDb.mbgaPool ??
  new Pool({
    connectionString,
    max: process.env.NODE_ENV === 'production' ? 10 : 5,
    idleTimeoutMillis: 30_000,
  });

if (process.env.NODE_ENV !== 'production') globalForDb.mbgaPool = db;

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  return db.query<T>(text, values);
}

export async function transaction<T>(callback: (client: PoolClient) => Promise<T>) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

