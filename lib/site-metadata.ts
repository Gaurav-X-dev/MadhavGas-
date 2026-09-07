import type { Metadata } from 'next';

const agencyName = 'Madhav Bharat Gas Agency';

export function pageMetadata(title: string, description: string, path: string): Metadata {
  return {
    title: `${title} | ${agencyName}`,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} | ${agencyName}`,
      description,
      type: 'website',
      url: path,
      siteName: agencyName,
      images: [{ url: '/assets/industrial/industrial-hero.png', alt: `${agencyName} LPG assistance` }],
    },
    twitter: { card: 'summary_large_image', title: `${title} | ${agencyName}`, description },
  };
}
