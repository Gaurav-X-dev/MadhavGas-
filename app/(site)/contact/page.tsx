import { getReferencePage } from '@/lib/reference-ui';
import { getPublicSiteData } from '@/lib/site-data';
import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata('Contact & Feedback', 'Contact Madhav Bharat Gas Agency for non-domestic LPG enquiries, feedback and QR-assisted WhatsApp support.', '/contact');

export const dynamic = 'force-dynamic';
export default async function ContactPage() {
  const data = await getPublicSiteData();
  return <main id="main-content" dangerouslySetInnerHTML={{ __html: getReferencePage('contact', data) }} />;
}
