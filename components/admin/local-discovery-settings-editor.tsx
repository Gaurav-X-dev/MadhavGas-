'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, MapPinned } from 'lucide-react';
import { toast } from 'sonner';
import { AdminField, AdminFormPage } from '@/components/admin/admin-form-page';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { localDiscoveryContent as fallback } from '@/lib/mock-data';
import type { LocalDiscoveryContent } from '@/lib/types';
import { localDiscoverySchema, validationMessage } from '@/lib/validation';

export function LocalDiscoverySettingsEditor() {
  const router = useRouter();
  const [content, setContent] = useState<LocalDiscoveryContent>(fallback);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  useUnsavedChanges(dirty);
  useEffect(() => {
    let active = true;
    fetch('/api/admin/settings/local-discovery', { cache: 'no-store' }).then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Unable to load section copy'); return payload.data as LocalDiscoveryContent; }).then((data) => active && setContent(data)).catch((error) => active && setLoadError(error instanceof Error ? error.message : 'Unable to load content')).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);
  const update = <K extends keyof LocalDiscoveryContent>(key: K, value: LocalDiscoveryContent[K]) => { setContent((current) => ({ ...current, [key]: value })); setDirty(true); setErrors((current) => ({ ...current, [key]: '' })); };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const checked = localDiscoverySchema.safeParse(content);
    if (!checked.success) { const nextErrors: Record<string, string> = {}; checked.error.issues.forEach((issue) => { nextErrors[String(issue.path[0] || 'form')] = issue.message; }); setErrors(nextErrors); toast.error(validationMessage(checked.error)); return; }
    setSaving(true);
    try { const response = await fetch('/api/admin/settings/local-discovery', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(content) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Unable to save section copy'); setDirty(false); toast.success('Local LPG Information copy updated'); router.push('/admin/local-information'); router.refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save content'); } finally { setSaving(false); }
  };
  const cancel = () => { if (dirty && !window.confirm('Discard your unsaved changes?')) return; setDirty(false); router.push('/admin/local-information'); };
  if (loading) return <div className="h-80 animate-pulse rounded-xl border bg-card" />;
  if (loadError) return <Card><CardContent className="p-8 text-center font-semibold text-destructive">{loadError}</CardContent></Card>;
  return <AdminFormPage section="Local LPG Information" sectionHref="/admin/local-information" title="Local LPG Section Copy" description="Manage the heading and supporting text while keeping localities, categories and topics as separate records." onSubmit={submit} onCancel={cancel} saving={saving} aside={<><Card><CardHeader><CardTitle className="text-base">Public Preview</CardTitle><CardDescription>The section appears near the end of the homepage.</CardDescription></CardHeader><CardContent><Button variant="outline" className="w-full" asChild><a href="/#local-information" target="_blank" rel="noreferrer"><Eye className="mr-2 h-4 w-4" />Open Homepage</a></Button></CardContent></Card><Card><CardHeader><CardTitle className="text-base">Current Records</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-muted-foreground"><p>{content.localities.length} localities</p><p>{content.categories.length} categories</p><p>{content.topics.length} topics</p></CardContent></Card></>}>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><MapPinned className="h-5 w-5 text-brand-blue" />Discovery Introduction</CardTitle><CardDescription>Keep this useful and concise; avoid keyword lists.</CardDescription></CardHeader><CardContent className="space-y-5"><AdminField id="heading" label="Section heading" required error={errors.heading}><Input id="heading" value={content.heading} onChange={(event) => update('heading', event.target.value)} /></AdminField><AdminField id="description" label="Supporting description" required helper="Explain why these local references are useful." error={errors.description}><Textarea id="description" rows={6} value={content.description} onChange={(event) => update('description', event.target.value)} /></AdminField></CardContent></Card>
  </AdminFormPage>;
}
