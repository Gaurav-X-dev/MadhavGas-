import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { query } from '@/lib/db';
import { newsletterSchema, validationMessage } from '@/lib/validation';
import { clientIp, jsonRequestError, publicRateLimited } from '@/lib/request-security';
import { sendNewsletterConfirmation } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  const requestError = jsonRequestError(request, 4 * 1024);
  if (requestError) return NextResponse.json({ error: requestError.error }, { status: requestError.status });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 }); }
  const parsed = newsletterSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 });
  if (parsed.data.website) return NextResponse.json({ ok: true });
  const ip = clientIp(request);
  if (await publicRateLimited(ip, 'newsletter', 8, 30)) return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: { 'Retry-After': '1800' } });

  const email = parsed.data.email.trim().toLowerCase();
  const existing = await query<{ id: string; active: boolean }>('SELECT id,active FROM newsletter_subscribers WHERE email=$1', [email]);
  if (existing.rows[0]?.active) return NextResponse.json({ ok: true, alreadySubscribed: true });

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const subscriber = existing.rows[0]
    ? await query<{ id: string }>(`UPDATE newsletter_subscribers SET active=TRUE,unsubscribe_token_hash=$1,subscribed_at=NOW(),unsubscribed_at=NULL,last_mail_status='Not sent',last_mail_error=NULL,updated_at=NOW() WHERE id=$2 RETURNING id`, [tokenHash, existing.rows[0].id])
    : await query<{ id: string }>(`INSERT INTO newsletter_subscribers(email,unsubscribe_token_hash) VALUES($1,$2) RETURNING id`, [email, tokenHash]);
  const base = process.env.NEXT_PUBLIC_SITE_URL?.trim() || request.nextUrl.origin;
  const unsubscribeUrl = new URL('/newsletter/unsubscribe', base);
  unsubscribeUrl.searchParams.set('token', token);
  let confirmationEmail: 'Sent' | 'Failed' | 'Skipped' = 'Skipped';
  try {
    const mail = await sendNewsletterConfirmation(email, unsubscribeUrl.toString());
    confirmationEmail = mail.status;
    await query('UPDATE newsletter_subscribers SET last_mail_status=$1,last_mail_error=$2,updated_at=NOW() WHERE id=$3', [mail.status, mail.safeError, subscriber.rows[0].id]);
  } catch {
    confirmationEmail = 'Failed';
    console.error('Newsletter email workflow failed after the subscription was saved', { subscriberId: subscriber.rows[0].id });
    await query(
      "UPDATE newsletter_subscribers SET last_mail_status='Failed',last_mail_error=$1,updated_at=NOW() WHERE id=$2",
      ['Email delivery status could not be recorded. Check the server logs and database connection.', subscriber.rows[0].id],
    ).catch(() => undefined);
  }
  return NextResponse.json({ ok: true, reactivated: Boolean(existing.rows[0]), confirmationEmail }, { status: existing.rows[0] ? 200 : 201 });
}
