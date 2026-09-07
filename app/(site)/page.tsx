import { getReferencePage } from '@/lib/reference-ui';
import { getPublicSiteData } from '@/lib/site-data';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const data = await getPublicSiteData();
  const title = data.siteContent.seoTitle;
  const description = data.siteContent.seoDescription;
  return {
    title,
    description,
    alternates: { canonical: '/' },
    openGraph: { title, description, type: 'website', url: '/', siteName: data.agencySettings.agencyName, images: [{ url: data.siteContent.heroSlides.find((slide) => slide.published)?.image || '/assets/industrial/industrial-hero.png', alt: `${data.agencySettings.agencyName} LPG assistance` }] },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const data = await getPublicSiteData();
  return <main id="main-content" dangerouslySetInnerHTML={{ __html: getReferencePage('index', data) }} />;
}
