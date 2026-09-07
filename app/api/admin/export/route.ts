import { NextRequest, NextResponse } from 'next/server';
import { requireApiSession } from '@/lib/api-auth';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const auth = await requireApiSession(request);
  if (auth.response) return auth.response;
  if (auth.session!.role !== 'Super Admin') return NextResponse.json({ error: 'Only a Super Admin can export all data' }, { status: 403 });
  const [documents, settings, submissions, subscribers, emailDelivery, audit] = await Promise.all([
    query('SELECT resource, document_id, data, sort_order, created_at, updated_at FROM cms_documents ORDER BY resource, sort_order'),
    query('SELECT key, data, updated_at FROM cms_singletons ORDER BY key'),
    query('SELECT type, reference_no, data, status, created_at, updated_at FROM submissions ORDER BY created_at DESC'),
    query('SELECT email, active, subscribed_at, unsubscribed_at, last_mail_status, created_at, updated_at FROM newsletter_subscribers ORDER BY subscribed_at DESC'),
    query('SELECT submission_reference, message_type, recipient, status, safe_error, created_at FROM email_delivery_logs ORDER BY created_at DESC'),
    query('SELECT action, resource, metadata, created_at FROM audit_logs ORDER BY created_at DESC'),
  ]);
  const payload = JSON.stringify({ exportedAt: new Date().toISOString(), documents: documents.rows, settings: settings.rows, submissions: submissions.rows, newsletterSubscribers: subscribers.rows, emailDeliveryLogs: emailDelivery.rows, auditLogs: audit.rows }, null, 2);
  return new NextResponse(payload, { headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="mbga-backup-${new Date().toISOString().slice(0,10)}.json"` } });
}
