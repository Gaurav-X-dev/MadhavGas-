import { ContentEntityEditor } from '@/components/admin/content-entity-editor';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContentEntityEditor kind="products" entityId={id} />;
}
