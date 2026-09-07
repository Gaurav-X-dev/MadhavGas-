'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Leaf } from 'lucide-react';
import { toast } from 'sonner';
import { AdminField, AdminFormPage } from '@/components/admin/admin-form-page';
import { ImageUploader } from '@/components/admin/image-uploader';
import { StatusBadge } from '@/components/admin/status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { sustainabilityContent as fallback } from '@/lib/mock-data';
import type { SustainabilityCard, SustainabilityContent } from '@/lib/types';
import { sustainabilityCardSchema, sustainabilitySchema, validationMessage } from '@/lib/validation';

const iconOptions = ['Leaf', 'Route', 'Recycle', 'MonitorSmartphone', 'ShieldCheck', 'Users', 'PackageCheck'];

export function SustainabilityCardEditor({ entityId }: { entityId?: string }) {
  const router = useRouter();
  const editing = Boolean(entityId);
  const [content, setContent] = useState<SustainabilityContent>(fallback);
  const [card, setCard] = useState<SustainabilityCard>({ id: '', title: '', description: '', icon: 'Leaf', imageUrl: '', imageAlt: '', displayOrder: 1, published: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  useUnsavedChanges(dirty);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/settings/sustainability', { cache: 'no-store' }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to load Sustainability content');
      return payload.data as SustainabilityContent;
    }).then((data) => {
      if (!active) return;
      setContent(data);
      if (entityId) {
        const existing = data.cards.find((item) => item.id === entityId);
        if (!existing) throw new Error('Sustainability item was not found.');
        setCard(existing);
      } else {
        setCard((current) => ({ ...current, displayOrder: Math.max(0, ...data.cards.map((item) => item.displayOrder)) + 1 }));
      }
    }).catch((error) => active && setLoadError(error instanceof Error ? error.message : 'Unable to load content')).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [entityId]);

  const update = (patch: Partial<SustainabilityCard>) => {
    setCard((current) => ({ ...current, ...patch }));
    setDirty(true);
    Object.keys(patch).forEach((key) => setErrors((current) => ({ ...current, [key]: '' })));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const candidate = { ...card, id: card.id || `sus-${crypto.randomUUID()}` };
    const checked = sustainabilityCardSchema.safeParse(candidate);
    if (!checked.success) {
      const nextErrors: Record<string, string> = {};
      checked.error.issues.forEach((issue) => { nextErrors[String(issue.path.at(-1) || 'form')] = issue.message; });
      setErrors(nextErrors);
      toast.error(validationMessage(checked.error));
      return;
    }
    const next: SustainabilityContent = { ...content, cards: editing ? content.cards.map((item) => item.id === candidate.id ? candidate : item) : [...content.cards, candidate] };
    const whole = sustainabilitySchema.safeParse(next);
    if (!whole.success) { toast.error(validationMessage(whole.error)); return; }
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings/sustainability', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to save Sustainability item');
      setDirty(false);
      toast.success(`Sustainability item ${editing ? 'updated' : 'created'} successfully`);
      router.push('/admin/sustainability');
      router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save item'); } finally { setSaving(false); }
  };

  const cancel = () => {
    if (dirty && !window.confirm('Discard your unsaved changes?')) return;
    setDirty(false);
    router.push('/admin/sustainability');
  };

  const aside = useMemo(() => <>
    <Card><CardHeader><CardTitle className="text-base">Publishing</CardTitle><CardDescription>Control visibility and placement.</CardDescription></CardHeader><CardContent className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-3"><div><p className="text-sm font-semibold">Published</p><p className="text-xs text-muted-foreground">Visible on the public page.</p></div><Switch checked={card.published} onCheckedChange={(published) => update({ published })} aria-label="Publish sustainability item" /></div>
      <AdminField id="displayOrder" label="Display order" helper="Lower numbers appear first." error={errors.displayOrder}><Input id="displayOrder" type="number" min={0} value={card.displayOrder} onChange={(event) => update({ displayOrder: Number(event.target.value) })} /></AdminField>
      <StatusBadge status={card.published ? 'Published' : 'Draft'} />
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Preview</CardTitle></CardHeader><CardContent><div className="rounded-xl border bg-gradient-to-br from-emerald-50 to-blue-50 p-5"><Leaf className="mb-4 h-7 w-7 text-emerald-700" /><p className="font-semibold text-brand-navy">{card.title || 'Sustainability item title'}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{card.description || 'A factual description will appear here.'}</p></div></CardContent></Card>
  </>, [card, errors.displayOrder]);

  if (loading) return <div className="h-80 animate-pulse rounded-xl border bg-card" />;
  if (loadError) return <Card><CardContent className="p-8 text-center font-semibold text-destructive">{loadError}</CardContent></Card>;
  return <AdminFormPage section="Sustainability" sectionHref="/admin/sustainability" title={editing ? 'Edit Sustainability Item' : 'Add Sustainability Item'} description="Create factual responsible-operation content with accessible media and publishing controls." onSubmit={submit} onCancel={cancel} saving={saving} submitLabel={editing ? 'Save Changes' : 'Create Item'} aside={aside}>
    <Card><CardHeader><CardTitle>Basic Information</CardTitle><CardDescription>Keep claims specific, factual and easy to understand.</CardDescription></CardHeader><CardContent className="space-y-5">
      <AdminField id="title" label="Title" required error={errors.title}><Input id="title" value={card.title} onChange={(event) => update({ title: event.target.value })} aria-invalid={Boolean(errors.title)} /></AdminField>
      <AdminField id="description" label="Description" required helper="Describe a real operational practice; do not add unsupported environmental claims." error={errors.description}><Textarea id="description" rows={6} value={card.description} onChange={(event) => update({ description: event.target.value })} aria-invalid={Boolean(errors.description)} /></AdminField>
      <AdminField id="icon" label="Icon" required error={errors.icon}><Select value={card.icon} onValueChange={(icon) => update({ icon })}><SelectTrigger id="icon"><SelectValue /></SelectTrigger><SelectContent>{iconOptions.map((icon) => <SelectItem key={icon} value={icon}>{icon}</SelectItem>)}</SelectContent></Select></AdminField>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Visual</CardTitle><CardDescription>Optional supporting image with accessible alt text.</CardDescription></CardHeader><CardContent className="space-y-5"><ImageUploader label="Feature image" value={card.imageUrl} previewAlt={card.imageAlt} onChange={(imageUrl) => update({ imageUrl })} /><AdminField id="imageAlt" label="Image alt text" required={Boolean(card.imageUrl)} error={errors.imageAlt}><Input id="imageAlt" value={card.imageAlt} onChange={(event) => update({ imageAlt: event.target.value })} disabled={!card.imageUrl} /></AdminField></CardContent></Card>
  </AdminFormPage>;
}
