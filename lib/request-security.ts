import type { NextRequest } from 'next/server';
import { transaction } from './db';

export function clientIp(request: NextRequest) {
  return (request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown').trim().slice(0, 80);
}

export function jsonRequestError(request: NextRequest, maxBytes: number) {
  const type = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') return { error: 'Content-Type must be application/json', status: 415 };
  const length = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(length) && length > maxBytes) return { error: 'Request body is too large', status: 413 };
  return null;
}

export async function publicRateLimited(ip: string, type: string, limit = 5, minutes = 10) {
  return transaction(async (client) => {
    const result = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM public_request_events
       WHERE request_type=$1 AND ip=$2 AND created_at > NOW() - ($3 * INTERVAL '1 minute')`,
      [type, ip, minutes],
    );
    const limited = Number(result.rows[0]?.count || 0) >= limit;
    if (!limited) await client.query('INSERT INTO public_request_events(ip,request_type) VALUES($1,$2)', [ip, type]);
    if (Math.random() < 0.01) await client.query(`DELETE FROM public_request_events WHERE created_at < NOW() - INTERVAL '2 days'`);
    return limited;
  });
}
