import { getReferencePage } from '@/lib/reference-ui';
import { getPublicSiteData } from '@/lib/site-data';
import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata('Photo & Video Gallery', 'Explore MBGA agency, LPG delivery, industrial supply and safety gallery updates.', '/gallery');

export const dynamic = 'force-dynamic';
export default async function GalleryPage() {
  const data = await getPublicSiteData();
  return <main id="main-content" dangerouslySetInnerHTML={{ __html: getReferencePage('gallery', data) }} />;
}
