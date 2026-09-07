import { NextResponse } from 'next/server';
import { getPublicSiteData } from '@/lib/site-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await getPublicSiteData();
  const publicAgency = Object.fromEntries(
    Object.entries(data.agencySettings).filter(([key]) => !key.startsWith('notify') && !key.startsWith('emailTemplate')),
  );
  return NextResponse.json({
    products: data.products.filter((item) => !item.archived),
    journey: data.journey.filter((item) => item.published),
    achievements: data.achievements.filter((item) => item.published),
    gallery: data.gallery.filter((item) => item.status === 'Published'),
    siteContent: data.siteContent,
    homeContent: data.homeContent,
    pageHeroes: data.pageHeroes,
    siteSections: data.siteSections,
    siteChrome: data.siteChrome,
    sustainability: data.sustainability,
    localDiscovery: data.localDiscovery,
    qrSettings: data.qrSettings,
    contactSettings: data.contactSettings,
    agencySettings: publicAgency,
  });
}
