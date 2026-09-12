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

function InitialSiteLoader({ agencyName, kicker, tagline }: { agencyName: string; kicker?: string; tagline?: string }) {
  return (
    <div className="loader" id="loader" role="status" aria-live="polite" aria-label={`Preparing ${agencyName} website`}>
      <div className="loader-inner plant-loader-shell">
        <div className="plant-loader" aria-hidden="true">
          <span className="plant-glow plant-glow-one" />
          <span className="plant-glow plant-glow-two" />
          <div className="plant-pipe"><i /><b /><span /></div>
          <div className="plant-tank plant-tank-left"><span /><i /></div>
          <div className="plant-tank plant-tank-right"><span /><i /></div>
          <div className="plant-filling-bay">
            <span className="plant-roof" />
            <span className="plant-column plant-column-left" />
            <span className="plant-column plant-column-right" />
            <span className="plant-filling-head plant-head-one"><i /></span>
            <span className="plant-filling-head plant-head-two"><i /></span>
            <span className="plant-filling-head plant-head-three"><i /></span>
          </div>
          <div className="plant-cylinder-line">
            <span className="plant-cylinder plant-cylinder-one"><i /><b /></span>
            <span className="plant-cylinder plant-cylinder-two"><i /><b /></span>
            <span className="plant-cylinder plant-cylinder-three"><i /><b /></span>
            <span className="plant-cylinder plant-cylinder-four"><i /><b /></span>
          </div>
          <div className="plant-conveyor"><span /><i /><i /><i /><i /><i /><i /></div>
          <div className="plant-floor" />
          <div className="plant-status"><span /><span /><span /></div>
        </div>
        <span className="loader-kicker">{kicker || 'Bharatgas Bottling & Supply'}</span>
        <strong>{agencyName}</strong>
        <small>{tagline || 'Safe • Reliable • Convenient'}</small>
        <div className="loader-progress" aria-hidden="true"><span /></div>
      </div>
    </div>
  );
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
      <div id="site-top">
        <InitialSiteLoader agencyName={agency.agencyName} kicker={data.siteChrome.loaderKicker} tagline={data.siteChrome.loaderTagline} />
      </div>
      {children}
      <div id="site-bottom" />
    </>
  );
}
