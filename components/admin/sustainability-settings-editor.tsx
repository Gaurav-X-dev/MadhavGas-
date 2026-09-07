'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Leaf, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminField, AdminFormPage } from '@/components/admin/admin-form-page';
import { ImageUploader } from '@/components/admin/image-uploader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { sustainabilityContent as fallback } from '@/lib/mock-data';
import type { SupplyChainStep, SustainabilityContent } from '@/lib/types';
import { sustainabilitySchema, validationMessage } from '@/lib/validation';

export function SustainabilitySettingsEditor() {
  const router = useRouter();
  const [content, setContent] = useState<SustainabilityContent>(fallback);
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
      if (!response.ok) throw new Error(payload.error || 'Unable to load Sustainability page content');
      return payload.data as SustainabilityContent;
    }).then((data) => active && setContent(data)).catch((error) => active && setLoadError(error instanceof Error ? error.message : 'Unable to load content')).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const update = <K extends keyof SustainabilityContent>(key: K, value: SustainabilityContent[K]) => {
    setContent((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
    setDirty(true);
  };
  const updateStep = (id: string, patch: Partial<SupplyChainStep>) => update('supplyChainSteps', content.supplyChainSteps.map((step) => step.id === id ? { ...step, ...patch } : step));
  const addStep = () => update('supplyChainSteps', [...content.supplyChainSteps, { id: `sc-${crypto.randomUUID()}`, step: Math.max(0, ...content.supplyChainSteps.map((item) => item.step)) + 1, title: 'New step', description: 'Describe this verified supply step.' }]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const checked = sustainabilitySchema.safeParse(content);
    if (!checked.success) {
      const nextErrors: Record<string, string> = {};
      checked.error.issues.forEach((issue) => { nextErrors[String(issue.path[0] || 'form')] = issue.message; });
      setErrors(nextErrors);
      toast.error(validationMessage(checked.error));
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings/sustainability', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(content) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to save Sustainability page content');
      setDirty(false);
      toast.success('Sustainability page content updated');
      router.push('/admin/sustainability');
      router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save content'); } finally { setSaving(false); }
  };

  const cancel = () => {
    if (dirty && !window.confirm('Discard your unsaved changes?')) return;
    setDirty(false);
    router.push('/admin/sustainability');
  };

  if (loading) return <div className="h-80 animate-pulse rounded-xl border bg-card" />;
  if (loadError) return <Card><CardContent className="p-8 text-center font-semibold text-destructive">{loadError}</CardContent></Card>;

  return <AdminFormPage section="Sustainability" sectionHref="/admin/sustainability" title="Sustainability Page Content" description="Manage the editorial hero, responsible-service story and factual operating information shown around the published cards." onSubmit={submit} onCancel={cancel} saving={saving} aside={<>
    <Card><CardHeader><CardTitle className="text-base">Public Preview</CardTitle><CardDescription>Review the finished page before and after saving.</CardDescription></CardHeader><CardContent><Button variant="outline" className="w-full" asChild><a href="/sustainability" target="_blank" rel="noreferrer"><Eye className="mr-2 h-4 w-4" />Open Sustainability Page</a></Button></CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Content Guardrails</CardTitle></CardHeader><CardContent className="space-y-3 text-xs leading-5 text-muted-foreground"><p>Use factual practices currently supported by agency operations.</p><p>Do not add carbon, emissions, awards or impact numbers unless client evidence exists.</p><div className="rounded-lg bg-emerald-50 p-3 text-emerald-800"><Leaf className="mb-2 h-4 w-4" />{content.cards.filter((card) => card.published).length} published practice cards</div></CardContent></Card>
  </>}>
    <Card><CardHeader><CardTitle>Editorial Hero</CardTitle><CardDescription>Introduce the page with concise, responsible-operation positioning.</CardDescription></CardHeader><CardContent className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-5"><AdminField id="heroTitle" label="Hero title" required error={errors.heroTitle}><Input id="heroTitle" value={content.heroTitle} onChange={(event) => update('heroTitle', event.target.value)} /></AdminField><AdminField id="heroDescription" label="Hero description" required error={errors.heroDescription}><Textarea id="heroDescription" rows={5} value={content.heroDescription} onChange={(event) => update('heroDescription', event.target.value)} /></AdminField><AdminField id="heroImageAlt" label="Hero image alt text" required error={errors.heroImageAlt}><Input id="heroImageAlt" value={content.heroImageAlt} onChange={(event) => update('heroImageAlt', event.target.value)} /></AdminField></div>
      <ImageUploader label="Hero image" required value={content.heroImage} previewAlt={content.heroImageAlt} onChange={(value) => update('heroImage', value)} />
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Responsible Service Story</CardTitle><CardDescription>Editorial copy and verified practice points.</CardDescription></CardHeader><CardContent className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]"><div className="space-y-5"><AdminField id="storyTitle" label="Story title" required error={errors.storyTitle}><Input id="storyTitle" value={content.storyTitle} onChange={(event) => update('storyTitle', event.target.value)} /></AdminField><AdminField id="storyDescription" label="Story description" required error={errors.storyDescription}><Textarea id="storyDescription" rows={6} value={content.storyDescription} onChange={(event) => update('storyDescription', event.target.value)} /></AdminField><AdminField id="storyImageAlt" label="Story image alt text" required error={errors.storyImageAlt}><Input id="storyImageAlt" value={content.storyImageAlt} onChange={(event) => update('storyImageAlt', event.target.value)} /></AdminField></div><ImageUploader label="Story image" required value={content.storyImage} previewAlt={content.storyImageAlt} onChange={(value) => update('storyImage', value)} /></div>
      <div><div className="mb-3 flex items-center justify-between"><div><p className="text-sm font-semibold">Practice points <span className="text-destructive">*</span></p><p className="text-xs text-muted-foreground">Short statements shown with the story.</p></div><Button type="button" variant="outline" size="sm" onClick={() => update('storyPoints', [...content.storyPoints, 'New verified practice'])}><Plus className="mr-2 h-4 w-4" />Add Point</Button></div><div className="space-y-3">{content.storyPoints.map((point, index) => <div key={`${index}-${point}`} className="flex gap-2"><Input value={point} aria-label={`Practice point ${index + 1}`} onChange={(event) => update('storyPoints', content.storyPoints.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} /><Button type="button" variant="ghost" size="icon" className="shrink-0 text-destructive" onClick={() => update('storyPoints', content.storyPoints.filter((_, itemIndex) => itemIndex !== index))} disabled={content.storyPoints.length === 1} aria-label={`Delete practice point ${index + 1}`}><Trash2 className="h-4 w-4" /></Button></div>)}</div>{errors.storyPoints && <p className="mt-2 text-xs font-medium text-destructive">{errors.storyPoints}</p>}</div>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Operational Detail</CardTitle><CardDescription>Supporting factual copy used in the page detail section.</CardDescription></CardHeader><CardContent className="grid gap-5 lg:grid-cols-3"><AdminField id="routePlanning" label="Route planning" required error={errors.routePlanning}><Textarea id="routePlanning" rows={6} value={content.routePlanning} onChange={(event) => update('routePlanning', event.target.value)} /></AdminField><AdminField id="reusableCycle" label="Cylinder cycle" required error={errors.reusableCycle}><Textarea id="reusableCycle" rows={6} value={content.reusableCycle} onChange={(event) => update('reusableCycle', event.target.value)} /></AdminField><AdminField id="digitalAssistance" label="Digital assistance" required error={errors.digitalAssistance}><Textarea id="digitalAssistance" rows={6} value={content.digitalAssistance} onChange={(event) => update('digitalAssistance', event.target.value)} /></AdminField></CardContent></Card>
    <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>Supply Chain Steps</CardTitle><CardDescription className="mt-1">Ordered steps used in the public operations flow.</CardDescription></div><Button type="button" variant="outline" size="sm" onClick={addStep}><Plus className="mr-2 h-4 w-4" />Add Step</Button></div></CardHeader><CardContent className="space-y-4">{content.supplyChainSteps.map((step, index) => <div key={step.id} className="grid gap-3 rounded-xl border p-4 md:grid-cols-[100px_minmax(180px,.7fr)_minmax(0,1fr)_40px]"><AdminField id={`step-${step.id}`} label="Step"><Input id={`step-${step.id}`} type="number" min={1} value={step.step} onChange={(event) => updateStep(step.id, { step: Number(event.target.value) })} /></AdminField><AdminField id={`step-title-${step.id}`} label="Title"><Input id={`step-title-${step.id}`} value={step.title} onChange={(event) => updateStep(step.id, { title: event.target.value })} /></AdminField><AdminField id={`step-description-${step.id}`} label="Description"><Input id={`step-description-${step.id}`} value={step.description} onChange={(event) => updateStep(step.id, { description: event.target.value })} /></AdminField><Button type="button" variant="ghost" size="icon" className="mt-7 text-destructive" onClick={() => update('supplyChainSteps', content.supplyChainSteps.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Delete ${step.title}`}><Trash2 className="h-4 w-4" /></Button></div>)}</CardContent></Card>
  </AdminFormPage>;
}
