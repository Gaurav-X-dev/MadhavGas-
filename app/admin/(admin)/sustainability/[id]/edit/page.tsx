import { SustainabilityCardEditor } from '@/components/admin/sustainability-card-editor';

export default async function EditSustainabilityItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SustainabilityCardEditor entityId={id} />;
}
