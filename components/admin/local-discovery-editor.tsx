'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { AdminField, AdminFormPage } from '@/components/admin/admin-form-page';
import { StatusBadge } from '@/components/admin/status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { localDiscoveryContent as fallback } from '@/lib/mock-data';
import type { LocalDiscoveryContent, LocalDiscoveryGroup, LocalDiscoveryItem } from '@/lib/types';
import { localDiscoverySchema, validationMessage } from '@/lib/validation';

const labels: Record<LocalDiscoveryGroup, string> = { localities: 'Locality', categories: 'Category', topics: 'Topic' };
export const validLocalDiscoveryGroup = (value: string): value is LocalDiscoveryGroup => value === 'localities' || value === 'categories' || value === 'topics';

export function LocalDiscoveryEditor({ group, entityId }: { group: LocalDiscoveryGroup; entityId?: string }) {
  const router = useRouter();
  const editing = Boolean(entityId);
  const [content, setContent] = useState<LocalDiscoveryContent>(fallback);
  const [item, setItem] = useState<LocalDiscoveryItem>({ id: '', label: '', href: '/contact', displayOrder: 1, active: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  useUnsavedChanges(dirty);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/settings/local-discovery', { cache: 'no-store' }).then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Unable to load Local LPG Information'); return payload.data as LocalDiscoveryContent; }).then((data) => {
      if (!active) return;
      setContent(data);
      if (entityId) { const existing = data[group].find((record) => record.id === entityId); if (!existing) throw new Error(`${labels[group]} was not found.`); setItem(existing); }
      else setItem((current) => ({ ...current, displayOrder: Math.max(0, ...data[group].map((record) => record.displayOrder)) + 1 }));
    }).catch((error) => active && setLoadError(error instanceof Error ? error.message : 'Unable to load content')).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [entityId, group]);

  const update = (patch: Partial<LocalDiscoveryItem>) => { setItem((current) => ({ ...current, ...patch })); setDirty(true); Object.keys(patch).forEach((key) => setErrors((current) => ({ ...current, [key]: '' }))); };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const candidate = { ...item, id: item.id || `${group.slice(0, 3)}-${crypto.randomUUID()}` };
    const next: LocalDiscoveryContent = { ...content, [group]: editing ? content[group].map((record) => record.id === candidate.id ? candidate : record) : [...content[group], candidate] };
    const checked = localDiscoverySchema.safeParse(next);
    if (!checked.success) { const nextErrors: Record<string, string> = {}; checked.error.issues.forEach((issue) => { nextErrors[String(issue.path.at(-1) || 'form')] = issue.message; }); setErrors(nextErrors); toast.error(validationMessage(checked.error)); return; }
    setSaving(true);
    try { const response = await fetch('/api/admin/settings/local-discovery', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || `Unable to save ${labels[group].toLowerCase()}`); setDirty(false); toast.success(`${labels[group]} ${editing ? 'updated' : 'created'} successfully`); router.push('/admin/local-information'); router.refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save item'); } finally { setSaving(false); }
  };
  const cancel = () => { if (dirty && !window.confirm('Discard your unsaved changes?')) return; setDirty(false); router.push('/admin/local-information'); };

  if (loading) return <div className="h-80 animate-pulse rounded-xl border bg-card" />;
  if (loadError) return <Card><CardContent className="p-8 text-center font-semibold text-destructive">{loadError}</CardContent></Card>;
  return <AdminFormPage section="Local LPG Information" sectionHref="/admin/local-information" title={`${editing ? 'Edit' : 'Add'} ${labels[group]}`} description={`Manage one structured ${labels[group].toLowerCase()} shown in the public discovery section.`} onSubmit={submit} onCancel={cancel} saving={saving} submitLabel={editing ? 'Save Changes' : `Create ${labels[group]}`} aside={<><Card><CardHeader><CardTitle className="text-base">Publishing</CardTitle><CardDescription>Control placement and public visibility.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex items-center justify-between rounded-lg border p-3"><div><p className="text-sm font-semibold">Active</p><p className="text-xs text-muted-foreground">Show on the public website.</p></div><Switch checked={item.active} onCheckedChange={(active) => update({ active })} aria-label={`Activate ${labels[group].toLowerCase()}`} /></div><AdminField id="displayOrder" label="Display order" helper="Lower numbers appear first." error={errors.displayOrder}><Input id="displayOrder" type="number" min={0} value={item.displayOrder} onChange={(event) => update({ displayOrder: Number(event.target.value) })} /></AdminField><StatusBadge status={item.active ? 'Active' : 'Inactive'} /></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Chip Preview</CardTitle></CardHeader><CardContent><div className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-semibold text-brand-navy shadow-sm"><MapPin className="h-4 w-4 text-brand-blue" />{item.label || `${labels[group]} label`}</div></CardContent></Card></>}>
    <Card><CardHeader><CardTitle>{labels[group]} Information</CardTitle><CardDescription>Use concise text and a valid public destination.</CardDescription></CardHeader><CardContent className="space-y-5"><AdminField id="label" label="Display label" required error={errors.label}><Input id="label" value={item.label} onChange={(event) => update({ label: event.target.value })} aria-invalid={Boolean(errors.label)} /></AdminField><AdminField id="href" label="Destination" required helper="Use a site path such as /contact or an approved HTTPS URL." error={errors.href}><Input id="href" value={item.href} onChange={(event) => update({ href: event.target.value })} aria-invalid={Boolean(errors.href)} /></AdminField></CardContent></Card>
  </AdminFormPage>;
}
