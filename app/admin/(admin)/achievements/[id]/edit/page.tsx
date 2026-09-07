import { ContentEntityEditor } from '@/components/admin/content-entity-editor';

export default async function EditAchievementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContentEntityEditor kind="achievements" entityId={id} />;
}
