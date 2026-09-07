import { query, transaction } from './db';

export const COLLECTIONS = [
  'products', 'bookings', 'enquiries', 'feedback', 'gallery', 'journey',
  'achievements', 'users', 'activity',
] as const;

export const SINGLETONS = ['site-content', 'home-content', 'page-heroes', 'site-sections', 'site-chrome', 'sustainability', 'local-discovery', 'qr-settings', 'agency-settings', 'contact-settings'] as const;

export function validCollection(value: string) {
  return (COLLECTIONS as readonly string[]).includes(value);
}

export function validSingleton(value: string) {
  return (SINGLETONS as readonly string[]).includes(value);
}

export async function getCollection<T = unknown>(resource: string): Promise<T[]> {
  const order = ['bookings', 'enquiries', 'feedback'].includes(resource)
    ? 'created_at DESC, sort_order ASC'
    : 'sort_order ASC, created_at ASC';
  const result = await query<{ data: T }>(
    `SELECT data FROM cms_documents WHERE resource = $1 ORDER BY ${order}`,
    [resource],
  );
  return result.rows.map((row) => row.data);
}

export async function replaceCollection(resource: string, items: Array<Record<string, unknown>>) {
  await transaction(async (client) => {
    await client.query('DELETE FROM cms_documents WHERE resource = $1', [resource]);
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const id = String(item.id || `${resource}-${Date.now()}-${index}`);
      await client.query(
        `INSERT INTO cms_documents (resource, document_id, data, sort_order)
         VALUES ($1, $2, $3::jsonb, $4)`,
        [resource, id, JSON.stringify({ ...item, id }), Number(item.displayOrder ?? index)],
      );
    }
  });
}

export async function getSingleton<T = unknown>(key: string): Promise<T | null> {
  const result = await query<{ data: T }>('SELECT data FROM cms_singletons WHERE key = $1', [key]);
  return result.rows[0]?.data ?? null;
}

export async function setSingleton(key: string, data: unknown) {
  await query(
    `INSERT INTO cms_singletons (key, data, updated_at) VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    [key, JSON.stringify(data)],
  );
}
