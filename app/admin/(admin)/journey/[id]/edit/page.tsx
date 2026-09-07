import { ContentEntityEditor } from '@/components/admin/content-entity-editor';

export default async function EditJourneyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContentEntityEditor kind="journey" entityId={id} />;
}
