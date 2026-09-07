import { NextRequest, NextResponse } from 'next/server';
import { requireApiSession } from '@/lib/api-auth';
import { query } from '@/lib/db';
import { newsletterAdminUpdateSchema, validationMessage } from '@/lib/validation';
import { jsonRequestError } from '@/lib/request-security';

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if (auth.response) return auth.response;
  const q = (request.nextUrl.searchParams.get('q') || '').trim().slice(0, 120);
  const status = request.nextUrl.searchParams.get('status') || 'all';
  if (!['all', 'active', 'unsubscribed'].includes(status)) return NextResponse.json({ error: 'Invalid subscriber status filter' }, { status: 400 });
  const result = await query<{ id: string; email: string; active: boolean; subscribed_at: Date; unsubscribed_at: Date | null; last_mail_status: 'Not sent' | 'Sent' | 'Failed' | 'Skipped' }>(
    `SELECT id,email,active,subscribed_at,unsubscribed_at,last_mail_status
     FROM newsletter_subscribers
     WHERE ($1='' OR email ILIKE $2)
       AND ($3='all' OR ($3='active' AND active=TRUE) OR ($3='unsubscribed' AND active=FALSE))
     ORDER BY subscribed_at DESC LIMIT 500`,
    [q, `%${q.replaceAll('%', '\\%').replaceAll('_', '\\_')}%`, status],
  );
  return NextResponse.json({ items: result.rows.map((item) => ({ id: item.id, email: item.email, active: item.active, subscribedAt: item.subscribed_at.toISOString(), unsubscribedAt: item.unsubscribed_at?.toISOString() || null, lastMailStatus: item.last_mail_status })) });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiSession(request);
  if (auth.response) return auth.response;
  if (auth.session!.role === 'Viewer' || auth.session!.role === 'Support Staff') return NextResponse.json({ error: 'Your role cannot update subscribers' }, { status: 403 });
  const requestError = jsonRequestError(request, 4 * 1024);
  if (requestError) return NextResponse.json({ error: requestError.error }, { status: requestError.status });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 }); }
  const parsed = newsletterAdminUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 });
  const result = await query('UPDATE newsletter_subscribers SET active=$1,unsubscribed_at=CASE WHEN $1 THEN NULL ELSE NOW() END,updated_at=NOW() WHERE id=$2', [parsed.data.active, parsed.data.id]);
  if (!result.rowCount) return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
  await query('INSERT INTO audit_logs(user_id,action,resource,metadata) VALUES($1,$2,$3,$4::jsonb)', [auth.session!.id, 'newsletter.status-updated', 'newsletter', JSON.stringify({ id: parsed.data.id, active: parsed.data.active })]);
  return NextResponse.json({ ok: true });
}
