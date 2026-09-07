import { ReferenceRuntime } from '@/components/site/reference-runtime';
import { agencyRuntimeData } from '@/lib/reference-ui';
import { getPublicSiteData } from '@/lib/site-data';

export const dynamic = 'force-dynamic';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const data = await getPublicSiteData();
  const agency = data.agencySettings;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: agency.agencyName,
    description: data.siteContent.agencyIntro,
    url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    telephone: agency.phonePrimary,
    email: agency.email,
    address: agency.officeAddress,
    brand: { '@type': 'Brand', name: 'Bharatgas' },
    sameAs: [agency.facebook, agency.instagram, agency.linkedin, agency.twitter].filter(Boolean),
  };
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: '@import url("/assets/css/style.css");@import url("/assets/css/locator-theme.css");' }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll('<', '\\u003c') }} />
      <ReferenceRuntime agency={agencyRuntimeData(data)} />
      <div id="site-top" />
      {children}
      <div id="site-bottom" />
    </>
  );
}
