import 'server-only';
import { query } from './db';
import { getSingleton } from './resources';
import { sendBrandedMail, type MailDeliveryResult } from './mail';
import type { AgencySettings } from './types';

type SubmissionType = 'booking' | 'enquiry' | 'feedback';

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value);
}

async function recordDelivery(reference: string | null, type: string, recipient: string, result: MailDeliveryResult) {
  await query(
    'INSERT INTO email_delivery_logs(submission_reference,message_type,recipient,status,safe_error) VALUES($1,$2,$3,$4,$5)',
    [reference, type, recipient.toLowerCase(), result.status, result.safeError],
  );
}

function templateValue(template: string, values: Record<string, string>) {
  return Object.entries(values).reduce((content, [key, value]) => content.replaceAll(`{{${key}}}`, value), template);
}

export async function notifySubmission(type: SubmissionType, reference: string, data: Record<string, unknown>) {
  const agency = await getSingleton<AgencySettings>('agency-settings');
  const enabled = type === 'booking' ? agency?.notifyNewBookings : type === 'enquiry' ? agency?.notifyNewEnquiries : agency?.notifyNewFeedback;
  const admin = process.env.ADMIN_NOTIFICATION_EMAIL?.trim().toLowerCase() || '';
  const title = type.charAt(0).toUpperCase() + type.slice(1);
  const rows: Array<[string, string]> = [
    ['Reference', reference],
    ['Customer', stringValue(data.name)],
    ['Phone', stringValue(data.phone)],
    ['Email', stringValue(data.email) || 'Not supplied'],
  ];
  if (type === 'booking') rows.push(['Cylinder', stringValue(data.cylinderType)], ['Quantity', stringValue(data.quantity)], ['Delivery area', stringValue(data.deliveryArea)]);
  if (type === 'enquiry') rows.push(['Subject', stringValue(data.subject)]);
  if (type === 'feedback') rows.push(['Rating', `${stringValue(data.rating)}/5`]);

  let adminResult: MailDeliveryResult = { status: 'Skipped', safeError: enabled ? 'Admin notification email is not configured.' : 'This notification type is disabled in Settings.', messageId: null };
  if (enabled && admin) adminResult = await sendBrandedMail({ to: admin, subject: `New ${type} · ${reference}`, heading: `New ${title} Received`, introduction: 'A new website submission has been saved successfully and is ready for admin review.', rows, body: stringValue(data.message) });
  await recordDelivery(reference, `${type}.admin-notification`, admin || 'not-configured', adminResult);

  const customer = stringValue(data.email).trim().toLowerCase();
  if (!customer) return { admin: adminResult, customer: null };
  const values = {
    customer_name: stringValue(data.name), booking_id: reference, enquiry_id: reference,
    quantity: stringValue(data.quantity), cylinder_type: stringValue(data.cylinderType),
    delivery_area: stringValue(data.deliveryArea), delivery_date: 'to be confirmed',
    enquiry_type: stringValue(data.subject),
  };
  const template = type === 'booking' ? agency?.emailTemplateBooking : type === 'enquiry' ? agency?.emailTemplateEnquiry : agency?.emailTemplateFeedback;
  const customerResult = await sendBrandedMail({ to: customer, subject: `${title} received · ${reference}`, heading: `We Received Your ${title}`, introduction: `Hello ${stringValue(data.name)}, your request has been saved with reference ${reference}.`, body: templateValue(template || 'Our team will review your submission and respond using the contact details provided.', values) });
  await recordDelivery(reference, `${type}.customer-acknowledgement`, customer, customerResult);
  return { admin: adminResult, customer: customerResult };
}

export async function sendNewsletterConfirmation(email: string, unsubscribeUrl: string) {
  const result = await sendBrandedMail({
    to: email,
    subject: 'MBGA newsletter subscription confirmed',
    heading: 'Subscription Confirmed',
    introduction: 'You are subscribed to occasional Madhav Bharat Gas Agency service notices and LPG safety updates.',
    body: 'We will keep messages useful and limited. You can unsubscribe at any time using the button below.',
    action: { label: 'Unsubscribe', url: unsubscribeUrl },
  });
  await recordDelivery(null, 'newsletter.confirmation', email, result);
  return result;
}
