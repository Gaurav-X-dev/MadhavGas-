import { ReferenceRuntime } from '@/components/site/reference-runtime';
import { agencyRuntimeData } from '@/lib/reference-ui';
import { getPublicSiteData } from '@/lib/site-data';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

function absoluteAssetUrl(value: string, siteUrl: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `${siteUrl}${value.startsWith('/') ? value : `/${value}`}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const data = await getPublicSiteData();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://madhavbharatgasagency.com').replace(/\/$/, '');
  const icon = data.siteContent.faviconUrl || data.siteContent.mbgaLogoUrl || data.siteContent.bharatgasLogoUrl || '/icon.svg';
  const iconUrl = absoluteAssetUrl(icon, siteUrl);
  return {
    icons: {
      icon: iconUrl,
      shortcut: iconUrl,
      apple: iconUrl,
    },
  };
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const data = await getPublicSiteData();
  const agency = data.agencySettings;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://madhavbharatgasagency.com').replace(/\/$/, '');
  const logoUrl = data.siteContent.mbgaLogoUrl || data.siteContent.bharatgasLogoUrl;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'GasStation'],
    '@id': `${siteUrl}/#business`,
    name: agency.agencyName,
    description: data.siteContent.agencyIntro,
    url: siteUrl,
    telephone: agency.phonePrimary,
    email: agency.email,
    image: logoUrl ? `${siteUrl}${logoUrl.startsWith('/') ? logoUrl : `/${logoUrl}`}` : undefined,
    logo: logoUrl ? `${siteUrl}${logoUrl.startsWith('/') ? logoUrl : `/${logoUrl}`}` : undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: agency.officeAddress,
      addressLocality: 'Gurugram',
      addressRegion: 'Haryana',
      postalCode: '122018',
      addressCountry: 'IN',
    },
    areaServed: ['Gurugram', 'Haryana'],
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
