import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from './auth';
import { query } from './db';

export async function requireApiSession(request: NextRequest) {
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return { session: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    if (origin && host) {
      try {
        if (new URL(origin).host.toLowerCase() !== host.toLowerCase()) return { session: null, response: NextResponse.json({ error: 'Cross-site request rejected' }, { status: 403 }) };
      } catch {
        return { session: null, response: NextResponse.json({ error: 'Invalid request origin' }, { status: 403 }) };
      }
    }
  }
  const current = await query<{ name: string; email: string; role: string; active: boolean }>('SELECT name,email,role,active FROM admin_users WHERE id=$1', [session.id]);
  const user = current.rows[0];
  if (!user?.active) return { session: null, response: NextResponse.json({ error: 'Session is no longer active' }, { status: 401 }) };
  return { session: { ...session, name: user.name, email: user.email, role: user.role }, response: null };
}
