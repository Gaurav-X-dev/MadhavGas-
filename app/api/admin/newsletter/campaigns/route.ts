import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { requireApiSession } from '@/lib/api-auth';
import { query } from '@/lib/db';
import { getEmailServiceStatus, sendBrandedMail } from '@/lib/mail';
import { jsonRequestError } from '@/lib/request-security';
import { newsletterCampaignSchema, validationMessage } from '@/lib/validation';

/** Addresses are contacted in small batches so a large list cannot stall the request. */
const batchSize = 12;
const maxRecipients = 2000;

function siteBase(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured && /^https?:\/\//i.test(configured)) return configured.replace(/\/$/, '');
  return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if (auth.response) return auth.response;
  const result = await query<{
    id: string; subject: string; heading: string; status: string;
    recipient_count: number; sent_count: number; failed_count: number;
    created_at: Date; sent_at: Date | null; author: string | null;
  }>(
    `SELECT c.id::text, c.subject, c.heading, c.status, c.recipient_count, c.sent_count, c.failed_count,
            c.created_at, c.sent_at, u.name AS author
     FROM newsletter_campaigns c
     LEFT JOIN admin_users u ON u.id = c.created_by
     ORDER BY c.created_at DESC LIMIT 50`,
  );
  return NextResponse.json({
    items: result.rows.map((row) => ({
      id: row.id,
      subject: row.subject,
      heading: row.heading,
      status: row.status,
      recipientCount: row.recipient_count,
      sentCount: row.sent_count,
      failedCount: row.failed_count,
      createdAt: row.created_at.toISOString(),
      sentAt: row.sent_at?.toISOString() || null,
      author: row.author || 'System',
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(request);
  if (auth.response) return auth.response;
  const role = auth.session!.role;
  if (role === 'Viewer' || role === 'Support Staff') {
    return NextResponse.json({ error: 'Your role cannot send newsletters' }, { status: 403 });
  }

  const requestError = jsonRequestError(request, 32 * 1024);
  if (requestError) return NextResponse.json({ error: requestError.error }, { status: requestError.status });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 }); }
  const parsed = newsletterCampaignSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 });
  const campaign = parsed.data;

  const status = getEmailServiceStatus();
  if (!status.configured) {
    return NextResponse.json(
      { error: `Email is not configured, so nothing was sent. Missing: ${status.missing.join(', ')}.` },
      { status: 409 },
    );
  }

  const base = siteBase(request);
  const action = campaign.ctaLabel && campaign.ctaUrl ? { label: campaign.ctaLabel, url: campaign.ctaUrl } : undefined;

  // A test send never touches the subscriber list or the campaign history.
  if (campaign.testRecipient) {
    const preview = await sendBrandedMail({
      to: campaign.testRecipient,
      subject: `[Test] ${campaign.subject}`,
      heading: campaign.heading,
      introduction: campaign.introduction,
      body: campaign.body,
      action,
      unsubscribeUrl: `${base}/newsletter/unsubscribe`,
    });
    await query(
      'INSERT INTO email_delivery_logs(submission_reference,message_type,recipient,status,safe_error) VALUES($1,$2,$3,$4,$5)',
      [null, 'newsletter-test', campaign.testRecipient.toLowerCase(), preview.status, preview.safeError],
    );
    if (preview.status !== 'Sent') {
      return NextResponse.json({ error: preview.safeError || 'The test email could not be sent.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, test: true, recipient: campaign.testRecipient });
  }

  const subscribers = await query<{ id: string; email: string }>(
    'SELECT id, email FROM newsletter_subscribers WHERE active = TRUE ORDER BY subscribed_at ASC LIMIT $1',
    [maxRecipients],
  );
  if (!subscribers.rowCount) {
    return NextResponse.json({ error: 'There are no active subscribers to send to.' }, { status: 409 });
  }

  const created = await query<{ id: string }>(
    `INSERT INTO newsletter_campaigns (subject, heading, introduction, body, cta_label, cta_url, status, recipient_count, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,'Sending',$7,$8) RETURNING id::text`,
    [campaign.subject, campaign.heading, campaign.introduction, campaign.body, campaign.ctaLabel, campaign.ctaUrl, subscribers.rowCount, auth.session!.id],
  );
  const campaignId = created.rows[0].id;

  let sent = 0;
  let failed = 0;
  for (let index = 0; index < subscribers.rows.length; index += batchSize) {
    const batch = subscribers.rows.slice(index, index + batchSize);
    const results = await Promise.all(batch.map(async (subscriber) => {
      // Only the hash is stored, so a fresh opt-out token is issued per send.
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await query('UPDATE newsletter_subscribers SET unsubscribe_token_hash=$1, updated_at=NOW() WHERE id=$2', [tokenHash, subscriber.id]);
      const unsubscribeUrl = `${base}/newsletter/unsubscribe?token=${token}`;
      const delivery = await sendBrandedMail({
        to: subscriber.email,
        subject: campaign.subject,
        heading: campaign.heading,
        introduction: campaign.introduction,
        body: campaign.body,
        action,
        unsubscribeUrl,
      });
      await query(
        'UPDATE newsletter_subscribers SET last_mail_status=$1, last_mail_error=$2, updated_at=NOW() WHERE id=$3',
        [delivery.status, delivery.safeError, subscriber.id],
      );
      await query(
        'INSERT INTO email_delivery_logs(submission_reference,message_type,recipient,status,safe_error) VALUES($1,$2,$3,$4,$5)',
        [campaignId, 'newsletter-campaign', subscriber.email.toLowerCase(), delivery.status, delivery.safeError],
      );
      return delivery.status;
    }));
    sent += results.filter((value) => value === 'Sent').length;
    failed += results.filter((value) => value !== 'Sent').length;
  }

  await query(
    `UPDATE newsletter_campaigns SET status=$1, sent_count=$2, failed_count=$3, sent_at=NOW() WHERE id=$4`,
    [sent > 0 ? 'Sent' : 'Failed', sent, failed, campaignId],
  );
  await query(
    'INSERT INTO audit_logs(user_id,action,resource,metadata) VALUES($1,$2,$3,$4::jsonb)',
    [auth.session!.id, 'newsletter.campaign-sent', 'newsletter', JSON.stringify({ campaignId, sent, failed })],
  );

  return NextResponse.json({ ok: true, campaignId, recipients: subscribers.rowCount, sent, failed });
}
