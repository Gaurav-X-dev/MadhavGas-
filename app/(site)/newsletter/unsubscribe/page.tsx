import crypto from 'node:crypto';
import Link from 'next/link';
import { query } from '@/lib/db';
import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata('Newsletter Preferences', 'Manage your Madhav Bharat Gas Agency newsletter subscription.', '/newsletter/unsubscribe');
export const dynamic = 'force-dynamic';

export default async function NewsletterUnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token || '';
  let title = 'Invalid Unsubscribe Link';
  let message = 'This link is incomplete or invalid. No subscription was changed.';
  let success = false;

  if (/^[a-f0-9]{64}$/i.test(token)) {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const result = await query('UPDATE newsletter_subscribers SET active=FALSE,unsubscribed_at=NOW(),updated_at=NOW() WHERE unsubscribe_token_hash=$1 AND active=TRUE', [hash]);
    if (result.rowCount) {
      title = 'You Have Been Unsubscribed';
      message = 'You will no longer receive MBGA newsletter updates. You can subscribe again from the website footer at any time.';
      success = true;
    } else {
      const known = await query('SELECT 1 FROM newsletter_subscribers WHERE unsubscribe_token_hash=$1', [hash]);
      if (known.rowCount) {
        title = 'Already Unsubscribed';
        message = 'This subscription is already inactive. No further action is required.';
        success = true;
      }
    }
  }

  return (
    <main id="main-content">
      <section className="page-hero"><div className="container"><span className="eyebrow">Email Preferences</span><h1>Newsletter Subscription</h1><p className="lead">Control occasional MBGA service notices and LPG safety updates.</p></div></section>
      <section className="section"><div className="container"><article className="content-empty-state" role="status"><strong style={{ display: 'block', color: success ? '#087a52' : '#a12b2b', fontSize: '1.35rem', marginBottom: '10px' }}>{title}</strong><p>{message}</p><Link className="btn btn-primary" href="/">Return to Home</Link></article></div></section>
    </main>
  );
}
