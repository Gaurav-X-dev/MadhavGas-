import { NextRequest, NextResponse } from 'next/server';
import { requireApiSession } from '@/lib/api-auth';
import { query } from '@/lib/db';
import { sendBrandedMail } from '@/lib/mail';
import { emailTestSchema, validationMessage } from '@/lib/validation';
import { jsonRequestError } from '@/lib/request-security';

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(request);
  if (auth.response) return auth.response;
  if (auth.session!.role !== 'Super Admin') return NextResponse.json({ error: 'Only a Super Admin can send SMTP test emails' }, { status: 403 });
  const requestError = jsonRequestError(request, 4 * 1024);
  if (requestError) return NextResponse.json({ error: requestError.error }, { status: requestError.status });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 }); }
  const parsed = emailTestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 });
  const result = await sendBrandedMail({ to: parsed.data.recipient.toLowerCase(), subject: 'MBGA SMTP test email', heading: 'Email Service Test', introduction: 'The Madhav Bharat Gas Agency SMTP connection is configured and working.', rows: [['Requested by', auth.session!.email], ['Environment', process.env.NODE_ENV || 'development']] });
  await query('INSERT INTO email_delivery_logs(message_type,recipient,status,safe_error) VALUES($1,$2,$3,$4)', ['smtp.test', parsed.data.recipient.toLowerCase(), result.status, result.safeError]);
  await query('INSERT INTO audit_logs(user_id,action,resource,metadata) VALUES($1,$2,$3,$4::jsonb)', [auth.session!.id, 'smtp.test', 'settings', JSON.stringify({ status: result.status })]);
  if (result.status === 'Skipped') return NextResponse.json({ error: result.safeError, status: result.status }, { status: 409 });
  if (result.status === 'Failed') return NextResponse.json({ error: result.safeError, status: result.status }, { status: 502 });
  return NextResponse.json({ ok: true, status: result.status });
}
