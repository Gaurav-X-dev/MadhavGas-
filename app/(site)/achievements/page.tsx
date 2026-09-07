import { getReferencePage } from '@/lib/reference-ui';
import { getPublicSiteData } from '@/lib/site-data';
import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata('MBGA & BGA Achievements', 'View published MBGA operational milestones, recognitions and Bharatgas brand achievements.', '/achievements');

export const dynamic = 'force-dynamic';
export default async function AchievementsPage() {
  const data = await getPublicSiteData();
  return <main id="main-content" dangerouslySetInnerHTML={{ __html: getReferencePage('certificates', data) }} />;
}
