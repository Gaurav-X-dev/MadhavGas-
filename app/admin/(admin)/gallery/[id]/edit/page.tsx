import { ContentEntityEditor } from '@/components/admin/content-entity-editor';

export default async function EditGalleryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContentEntityEditor kind="gallery" entityId={id} />;
}
