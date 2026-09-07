import { LocalDiscoveryEditor } from '@/components/admin/local-discovery-editor';

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LocalDiscoveryEditor group="categories" entityId={id} />;
}
