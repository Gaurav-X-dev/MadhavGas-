import { getReferencePage } from '@/lib/reference-ui';
import { getPublicSiteData } from '@/lib/site-data';
import { pageMetadata } from '@/lib/site-metadata';

export const metadata = pageMetadata('Commercial LPG Products', 'Explore commercial and industrial Bharatgas cylinder options supported by Madhav Bharat Gas Agency.', '/products');

export const dynamic = 'force-dynamic';
export default async function ProductsPage() {
  const data = await getPublicSiteData();
  return <main id="main-content" dangerouslySetInnerHTML={{ __html: getReferencePage('products', data) }} />;
}
