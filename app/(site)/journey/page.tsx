import { getReferencePage } from '@/lib/reference-ui';
import { getPublicSiteData } from '@/lib/site-data';
import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata('Our MBGA & Bharatgas Journey', 'Explore the connected Madhav Bharat Gas Agency and Bharatgas service journey and milestones.', '/journey');

export const dynamic = 'force-dynamic';
export default async function JourneyPage() {
  const data = await getPublicSiteData();
  return <main id="main-content" dangerouslySetInnerHTML={{ __html: getReferencePage('timeline', data) }} />;
}
