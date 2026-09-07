import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (origin && host) {
    try {
      if (new URL(origin).host.toLowerCase() !== host.toLowerCase()) return NextResponse.json({ error: 'Cross-site request rejected' }, { status: 403 });
    } catch { return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 }); }
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 0 });
  return response;
}
