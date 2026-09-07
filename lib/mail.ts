import 'server-only';
import nodemailer from 'nodemailer';
import type { EmailServiceStatus } from './types';

export type MailDeliveryStatus = 'Sent' | 'Failed' | 'Skipped';

export interface MailDeliveryResult {
  status: MailDeliveryStatus;
  safeError: string | null;
  messageId: string | null;
}

interface BrandedMail {
  to: string;
  subject: string;
  heading: string;
  introduction: string;
  rows?: Array<[string, string]>;
  body?: string;
  action?: { label: string; url: string };
  /** Adds a one-click unsubscribe footer. Required for newsletter campaigns. */
  unsubscribeUrl?: string;
}

const requiredVariables = [
  'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD',
  'SMTP_FROM_EMAIL', 'SMTP_FROM_NAME', 'ADMIN_NOTIFICATION_EMAIL',
] as const;

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function validEmail(value: string) {
  return !/[\r\n]/.test(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function getEmailServiceStatus(): EmailServiceStatus {
  const missing = requiredVariables.filter((key) => !process.env[key]?.trim());
  const port = Number(process.env.SMTP_PORT || 0);
  if (process.env.SMTP_PORT && (!Number.isInteger(port) || port < 1 || port > 65535)) missing.push('SMTP_PORT');
  const fromAddress = process.env.SMTP_FROM_EMAIL?.trim() || null;
  const adminAddress = process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || null;
  if (fromAddress && !validEmail(fromAddress)) missing.push('SMTP_FROM_EMAIL');
  if (adminAddress && !validEmail(adminAddress)) missing.push('ADMIN_NOTIFICATION_EMAIL');
  return {
    configured: missing.length === 0,
    missing: [...new Set(missing)],
    fromAddress: fromAddress && validEmail(fromAddress) ? fromAddress : null,
    adminNotificationAddress: adminAddress && validEmail(adminAddress) ? adminAddress : null,
  };
}

function safeMailError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (['EAUTH', 'EENVELOPE'].includes(code)) return 'Email provider authentication or sender settings were rejected.';
  if (['ETIMEDOUT', 'ECONNECTION', 'ESOCKET'].includes(code)) return 'The email provider could not be reached. Check SMTP host, port and TLS settings.';
  return 'Email delivery failed. Check the server email configuration.';
}

function emailHtml(message: BrandedMail) {
  const rows = (message.rows || []).map(([label, value]) => `<tr><td style="padding:9px 12px;color:#5d7185;border-bottom:1px solid #e4edf5;font-size:13px">${escapeHtml(label)}</td><td style="padding:9px 12px;color:#082f57;border-bottom:1px solid #e4edf5;font-size:13px;font-weight:600">${escapeHtml(value)}</td></tr>`).join('');
  const paragraphs = message.body ? message.body.split(/\n{2,}/).map((part) => `<p style="margin:0 0 14px;white-space:pre-line">${escapeHtml(part)}</p>`).join('') : '';
  const action = message.action && /^https?:\/\//i.test(message.action.url)
    ? `<p style="margin:24px 0 0"><a href="${escapeHtml(message.action.url)}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#ffd21c;color:#082f57;text-decoration:none;font-weight:700">${escapeHtml(message.action.label)}</a></p>`
    : '';
  const footerNote = message.unsubscribeUrl && /^https?:\/\//i.test(message.unsubscribeUrl)
    ? `You are receiving this because you subscribed to Madhav Bharat Gas Agency updates. <a href="${escapeHtml(message.unsubscribeUrl)}" style="color:#0057a8">Unsubscribe</a>.`
    : 'This transactional email was sent by Madhav Bharat Gas Agency. Please do not share confidential information by reply.';
  return `<!doctype html><html><body style="margin:0;background:#f2f7fb;font-family:Arial,sans-serif;color:#20384f"><div style="max-width:640px;margin:0 auto;padding:28px 14px"><div style="overflow:hidden;border-radius:16px;background:#fff;box-shadow:0 10px 35px rgba(8,47,87,.10)"><div style="padding:22px 26px;background:#082f57;color:#fff"><div style="font-size:12px;font-weight:700;letter-spacing:.12em;color:#ffd21c">MBGA · BHARATGAS</div><div style="margin-top:6px;font-size:20px;font-weight:700">Madhav Bharat Gas Agency</div></div><div style="padding:26px"><h1 style="margin:0 0 12px;color:#082f57;font-size:24px;line-height:1.25">${escapeHtml(message.heading)}</h1><p style="margin:0 0 20px;line-height:1.65">${escapeHtml(message.introduction)}</p>${rows ? `<table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #e4edf5;border-radius:8px">${rows}</table>` : ''}${paragraphs}${action}</div><div style="padding:16px 26px;background:#f7fafc;color:#718396;font-size:12px;line-height:1.5">${footerNote}</div></div></div></body></html>`;
}

export async function sendBrandedMail(message: BrandedMail): Promise<MailDeliveryResult> {
  const status = getEmailServiceStatus();
  if (!status.configured) return { status: 'Skipped', safeError: 'Email service is not configured. Add the required SMTP environment variables.', messageId: null };
  if (!validEmail(message.to)) return { status: 'Failed', safeError: 'The recipient email address is invalid.', messageId: null };
  try {
    const port = Number(process.env.SMTP_PORT);
    const secure = /^(true|1|yes)$/i.test(process.env.SMTP_SECURE || '') || port === 465;
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      tls: { rejectUnauthorized: true },
    });
    const info = await transport.sendMail({
      from: { name: String(process.env.SMTP_FROM_NAME).replace(/[\r\n]/g, ' ').slice(0, 120), address: String(process.env.SMTP_FROM_EMAIL) },
      to: message.to,
      subject: message.subject.replace(/[\r\n]/g, ' ').slice(0, 180),
      text: [message.heading, message.introduction, ...(message.rows || []).map(([label, value]) => `${label}: ${value}`), message.body || '', message.action?.url || ''].filter(Boolean).join('\n\n'),
      html: emailHtml(message),
      headers: message.unsubscribeUrl && /^https?:\/\//i.test(message.unsubscribeUrl)
        ? { 'List-Unsubscribe': `<${message.unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
        : undefined,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    transport.close();
    return { status: 'Sent', safeError: null, messageId: info.messageId || null };
  } catch (error) {
    console.error('SMTP delivery failed', { code: typeof error === 'object' && error && 'code' in error ? String(error.code) : 'unknown' });
    return { status: 'Failed', safeError: safeMailError(error), messageId: null };
  }
}
