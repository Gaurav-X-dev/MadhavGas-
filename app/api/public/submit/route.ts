import { NextRequest, NextResponse } from 'next/server';
import { transaction } from '@/lib/db';
import { publicSubmissionSchema, validationMessage } from '@/lib/validation';
import { clientIp, jsonRequestError, publicRateLimited } from '@/lib/request-security';
import { notifySubmission } from '@/lib/notifications';
import { getSingleton } from '@/lib/resources';
import type { ContactSettings } from '@/lib/types';
import { fallbackContactSettings } from '@/lib/mock-data';

export async function POST(request: NextRequest) {
  const requestError = jsonRequestError(request, 32 * 1024);
  if (requestError) return NextResponse.json({ error: requestError.error }, { status: requestError.status });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 }); }
  const parsed = publicSubmissionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: validationMessage(parsed.error) }, { status: 400 });
  if (parsed.data.website) return NextResponse.json({ ok: true });

  const contactSettings = (await getSingleton<ContactSettings>('contact-settings')) ?? fallbackContactSettings;
  const formConfig = contactSettings.formTypes.find((f) => f.id === parsed.data.type);
  if (!formConfig || !formConfig.enabled) {
    return NextResponse.json({ error: 'This contact method is currently unavailable.' }, { status: 400 });
  }

  const ip = clientIp(request);
  if (await publicRateLimited(ip, parsed.data.type)) return NextResponse.json({ error: 'Too many requests. Please try again after 10 minutes.' }, { status: 429, headers: { 'Retry-After': '600' } });

  const prefix = parsed.data.type === 'booking' ? 'BKG' : parsed.data.type === 'feedback' ? 'FBK' : 'ENQ';
  const reference = `${prefix}-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const now = new Date().toISOString();
  const resource = parsed.data.type === 'enquiry' ? 'enquiries' : parsed.data.type === 'booking' ? 'bookings' : 'feedback';
  const document = parsed.data.type === 'feedback'
    ? { id: reference, customerName: parsed.data.name, email: parsed.data.email || '', phone: parsed.data.phone, rating: parsed.data.rating, message: parsed.data.message, status: 'New', date: now, type: 'Feedback' }
    : parsed.data.type === 'booking'
      ? { id: reference, customerName: parsed.data.name, businessName: parsed.data.businessName || '', email: parsed.data.email || '', phone: parsed.data.phone, cylinderType: parsed.data.cylinderType, quantity: parsed.data.quantity, deliveryArea: parsed.data.deliveryArea, source: 'Website', date: now, status: 'New', notes: parsed.data.message ? [parsed.data.message] : [] }
      : { id: reference, customerName: parsed.data.name, email: parsed.data.email || '', phone: parsed.data.phone, enquiryType: parsed.data.subject, subject: parsed.data.subject, message: parsed.data.message, assignedStaff: '', status: 'Open', priority: 'Medium', internalNotes: [], date: now };

  try {
    await transaction(async (client) => {
      await client.query('INSERT INTO submissions (type, reference_no, data) VALUES ($1, $2, $3::jsonb)', [parsed.data.type, reference, JSON.stringify({ ...parsed.data, ip })]);
      await client.query('INSERT INTO cms_documents (resource, document_id, data, sort_order) VALUES ($1, $2, $3::jsonb, 0)', [resource, reference, JSON.stringify(document)]);
      await client.query('INSERT INTO audit_logs(action,resource,metadata) VALUES($1,$2,$3::jsonb)', ['public-submission.created', resource, JSON.stringify({ reference })]);
    });
  } catch (error) {
    console.error('Public submission persistence failed', { type: parsed.data.type });
    return NextResponse.json({ error: 'Your request could not be saved. Please try again or call the agency.' }, { status: 500 });
  }

  try { await notifySubmission(parsed.data.type, reference, parsed.data as unknown as Record<string, unknown>); }
  catch { console.error('Submission email workflow failed after persistence', { reference }); }
  return NextResponse.json({ ok: true, reference }, { status: 201 });
}
