import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '@/lib/db';
import { createSessionToken, SESSION_COOKIE } from '@/lib/auth';
import { clientIp, jsonRequestError } from '@/lib/request-security';

const schema = z.object({ email: z.string().email(), password: z.string().min(6), remember: z.boolean().optional() });

export async function POST(request: NextRequest) {
  try {
    const requestError = jsonRequestError(request, 4 * 1024);
    if (requestError) return NextResponse.json({ error: requestError.error }, { status: requestError.status });
    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 }); }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Valid email and password are required' }, { status: 400 });

    const ip = clientIp(request);
    const attempts = await query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM auth_attempts WHERE (ip=$1 OR LOWER(email)=LOWER($2)) AND succeeded=FALSE AND created_at > NOW() - INTERVAL '15 minutes'`, [ip, parsed.data.email]);
    if (Number(attempts.rows[0]?.count || 0) >= 8) return NextResponse.json({ error: 'Too many sign-in attempts. Try again after 15 minutes.' }, { status: 429, headers: { 'Retry-After': '900' } });

    const result = await query<{ id: string; name: string; email: string; password_hash: string; role: string; active: boolean }>(
      'SELECT id, name, email, password_hash, role, active FROM admin_users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [parsed.data.email],
    );
    const user = result.rows[0];
    if (!user || !user.active || !(await bcrypt.compare(parsed.data.password, user.password_hash))) {
      await query('INSERT INTO auth_attempts (ip,email,succeeded) VALUES ($1,$2,FALSE)', [ip, parsed.data.email.toLowerCase()]);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    await query('INSERT INTO auth_attempts (ip,email,succeeded) VALUES ($1,$2,TRUE)', [ip, parsed.data.email.toLowerCase()]);
    await query(`DELETE FROM auth_attempts WHERE created_at < NOW() - INTERVAL '7 days'`);
    await query('UPDATE admin_users SET last_active = NOW() WHERE id = $1', [user.id]);
    const token = await createSessionToken({ id: user.id, name: user.name, email: user.email, role: user.role });
    const response = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' || Boolean(process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https://')),
      sameSite: 'strict',
      path: '/',
      maxAge: parsed.data.remember === false ? 60 * 60 * 12 : 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    console.error('Login failed', error);
    return NextResponse.json({ error: 'Unable to sign in. Check the database connection.' }, { status: 500 });
  }
}
