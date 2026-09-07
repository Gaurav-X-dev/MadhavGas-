import { LocalDiscoveryEditor } from '@/components/admin/local-discovery-editor';

export default async function EditTopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LocalDiscoveryEditor group="topics" entityId={id} />;
}
