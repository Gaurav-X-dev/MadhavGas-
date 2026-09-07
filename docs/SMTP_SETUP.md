# SMTP Setup

The SMTP architecture is complete. Real delivery is currently blocked only because provider credentials have not been supplied.

## Required server-only variables

```env
SMTP_HOST=smtp.provider.example
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=provider-login
SMTP_PASSWORD=provider-app-password
SMTP_FROM_EMAIL=no-reply@your-domain.example
SMTP_FROM_NAME=Madhav Bharat Gas Agency
ADMIN_NOTIFICATION_EMAIL=operations@your-domain.example
```

Never prefix these values with `NEXT_PUBLIC_`, commit them, place them in screenshots, or store them in the database. Configure them in `.env.local` for local use and in Hostinger's environment-variable UI for production.

## Port and TLS behavior

- Port `465`: implicit TLS; the transport automatically uses `secure=true`.
- Port `587`: STARTTLS; normally configure `SMTP_SECURE=false`.
- Other ports: `SMTP_SECURE=true` can be set explicitly when required by the provider.
- Certificate verification remains enabled. Connection, greeting and socket timeouts prevent hanging requests.
- Nodemailer file and URL access are disabled for message content.

## Test procedure

1. Add all variables above and restart the Node.js application.
2. Sign in as a Super Admin.
3. Open **Settings -> Email Templates**.
4. Confirm the status says **Email service configured** and shows only the safe sender address.
5. Enter a controlled recipient and select **Send Test Email**.
6. Confirm the email arrives and review `email_delivery_logs`/the admin result.
7. Submit one booking, enquiry, feedback record and newsletter subscription with controlled addresses.
8. Confirm the DB records exist even if a notification is rejected by the provider.

## Notification types

- Admin notification for new booking, enquiry or feedback when enabled in Settings.
- Customer acknowledgement when the form includes an email address.
- Newsletter subscription confirmation with a tokenized unsubscribe link.
- Super Admin SMTP test email.

## Failure policy

Database persistence is the primary transaction. Email is a secondary notification. If SMTP is missing or fails, the valid booking/enquiry/feedback/subscription remains stored; a safe `Sent`, `Failed` or `Skipped` result is recorded. Credentials and provider error internals are never returned to the public form.

## Current external blocker

**BLOCKED - SMTP credentials not supplied.** The admin status/test flow correctly reports this without crashing. No architecture or code change is needed when credentials are later provided.

