import { LocalDiscoveryEditor } from '@/components/admin/local-discovery-editor';

export default async function EditLocalityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LocalDiscoveryEditor group="localities" entityId={id} />;
}
