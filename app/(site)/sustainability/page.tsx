import { getReferencePage } from '@/lib/reference-ui';
import { getPublicSiteData } from '@/lib/site-data';
import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata('Responsible LPG Operations', 'Learn about MBGA route planning, reusable cylinder cycles and digital LPG assistance.', '/sustainability');

export const dynamic = 'force-dynamic';
export default async function SustainabilityPage() {
  const data = await getPublicSiteData();
  return <main id="main-content" dangerouslySetInnerHTML={{ __html: getReferencePage('sustainability', data) }} />;
}
