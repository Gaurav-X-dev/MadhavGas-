'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { AdminField, AdminFormPage } from '@/components/admin/admin-form-page';
import { ImageUploader } from '@/components/admin/image-uploader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { pageHeroes as fallbackHeroes } from '@/lib/page-hero-defaults';
import type { PageHero, PageHeroKey, PageHeroesContent } from '@/lib/types';
import { pageHeroesSchema, validationMessage } from '@/lib/validation';

const meta: Record<PageHeroKey, { section: string; sectionHref: string; publicHref: string; label: string }> = {
  products: { section: 'Products', sectionHref: '/admin/products', publicHref: '/products', label: 'Products' },
  journey: { section: 'Journey', sectionHref: '/admin/journey', publicHref: '/journey', label: 'Our Journey' },
  achievements: { section: 'Achievements', sectionHref: '/admin/achievements', publicHref: '/achievements', label: 'Achievements' },
  gallery: { section: 'Gallery', sectionHref: '/admin/gallery', publicHref: '/gallery', label: 'Gallery' },
  contact: { section: 'Site Content', sectionHref: '/admin/site-content', publicHref: '/contact', label: 'Contact & Feedback' },
};

/**
 * Edits the banner at the top of one public page. All five banners live in the
 * shared `page-heroes` record, so the whole record is loaded, the one page is
 * patched, and the record is saved back.
 */
export function PageHeroEditor({ page, extra }: { page: PageHeroKey; extra?: React.ReactNode }) {
  const router = useRouter();
  const config = meta[page];
  const [content, setContent] = useState<PageHeroesContent>(fallbackHeroes);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState('');
  useUnsavedChanges(dirty);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/settings/page-heroes', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Unable to load page banners');
        return payload.data as PageHeroesContent | null;
      })
      .then((data) => { if (active && data) setContent(data); })
      .catch((error) => active && setLoadError(error instanceof Error ? error.message : 'Unable to load page banners'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const hero = content[page];
  const update = (patch: Partial<PageHero>) => {
    setContent((current) => ({ ...current, [page]: { ...current[page], ...patch } }));
    for (const key of Object.keys(patch)) setErrors((current) => ({ ...current, [key]: '' }));
    setDirty(true);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const check = pageHeroesSchema.safeParse(content);
    if (!check.success) {
      const field = check.error.issues.find((issue) => issue.path[0] === page);
      if (field) setErrors({ [String(field.path[1] ?? '')]: field.message });
      const message = validationMessage(check.error);
      toast.error(message);
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings/page-heroes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(check.data),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to save the page banner');
      setDirty(false);
      toast.success(`${config.label} page banner updated`);
      router.push(config.sectionHref);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save the page banner');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-96 animate-pulse rounded-xl border bg-card" />;
  if (loadError) return <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">{loadError}</div>;

  return (
    <AdminFormPage
      section={config.section}
      sectionHref={config.sectionHref}
      title={`${config.label} Page Content`}
      description="The heading strip shown at the top of this page on the public website."
      onSubmit={submit}
      onCancel={() => router.push(config.sectionHref)}
      saving={saving}
      submitLabel="Save Changes"
      aside={
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Public Preview</CardTitle><CardDescription>Open the page to review the banner.</CardDescription></CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <a href={config.publicHref} target="_blank" rel="noreferrer"><Eye className="mr-2 h-4 w-4" />Open {config.label} Page</a>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Banner Preview</CardTitle><CardDescription>Roughly how the image sits behind the heading.</CardDescription></CardHeader>
            <CardContent>
              {hero.image ? (
                <div className="relative overflow-hidden rounded-lg border">
                  <img src={hero.image} alt={hero.imageAlt || 'Banner preview'} className="aspect-[16/6] w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-navy/95 to-brand-blue/60" />
                  <div className="absolute inset-0 flex flex-col justify-center p-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand-yellow">{hero.eyebrow}</span>
                    <span className="mt-1 line-clamp-2 text-sm font-bold leading-tight text-white">{hero.title}</span>
                  </div>
                </div>
              ) : (
                <div className="grid aspect-[16/6] place-items-center rounded-lg border border-dashed bg-muted/40"><ImageIcon className="h-7 w-7 text-muted-foreground" /></div>
              )}
            </CardContent>
          </Card>
        </>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Page Header</CardTitle>
          <CardDescription>Copy and background artwork for the banner at the top of {config.publicHref}.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-5">
            <AdminField id="eyebrow" label="Eyebrow" required error={errors.eyebrow}>
              <Input id="eyebrow" value={hero.eyebrow} onChange={(event) => update({ eyebrow: event.target.value })} maxLength={160} />
            </AdminField>
            <AdminField id="title" label="Heading" required error={errors.title}>
              <Input id="title" value={hero.title} onChange={(event) => update({ title: event.target.value })} maxLength={300} />
            </AdminField>
            <AdminField id="description" label="Description" required error={errors.description}>
              <Textarea id="description" rows={4} value={hero.description} onChange={(event) => update({ description: event.target.value })} maxLength={1200} />
            </AdminField>
          </div>
          <div className="space-y-5">
            <ImageUploader
              label="Header image"
              value={hero.image}
              previewAlt={hero.imageAlt}
              required
              onChange={(image) => update({ image })}
            />
            <AdminField id="imageAlt" label="Header image description" required helper="Describe the picture for screen readers." error={errors.imageAlt}>
              <Input id="imageAlt" value={hero.imageAlt} onChange={(event) => update({ imageAlt: event.target.value })} maxLength={300} />
            </AdminField>
            <p className="rounded-lg bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">
              The image sits behind a dark blue overlay, so a bright, uncluttered picture reads best.
            </p>
          </div>
        </CardContent>
      </Card>
      {extra}
    </AdminFormPage>
  );
}
