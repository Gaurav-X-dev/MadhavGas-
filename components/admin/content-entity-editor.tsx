'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { AdminField, AdminFormPage } from '@/components/admin/admin-form-page';
import { ImageUploader } from '@/components/admin/image-uploader';
import { VideoUploader } from '@/components/admin/video-uploader';
import { StatusBadge } from '@/components/admin/status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import type { Achievement, AchievementType, GalleryItem, GalleryItemType, GalleryStatus, JourneyBrand, JourneyMilestone, Product, ProductAvailability, ProductCategory } from '@/lib/types';
import { achievementSchema, gallerySchema, journeySchema, productSchema, validationMessage } from '@/lib/validation';
import type { ContentEntityKind } from './content-entity-list';

type Entity = Product | GalleryItem | JourneyMilestone | Achievement;

const labels = {
  products: { section: 'Products', singular: 'Product', description: 'Create a structured LPG product with publication, ordering and media controls.' },
  gallery: { section: 'Gallery', singular: 'Media Item', description: 'Create a focused gallery record with accessible metadata and publication controls.' },
  journey: { section: 'Journey', singular: 'Journey Item', description: 'Add one factual milestone to either the Bharatgas or Madhav Bharat Gas journey.' },
  achievements: { section: 'Achievements', singular: 'Achievement', description: 'Create a factual achievement or recognition without unsupported claims.' },
} as const;

function blankEntity(kind: ContentEntityKind): Entity {
  if (kind === 'products') return { id: '', name: '', slug: '', category: 'Commercial', cylinderCapacity: '', description: '', features: [], image: '', availability: 'In Stock', displayOrder: 1, archived: false };
  if (kind === 'gallery') return { id: '', type: 'Image', url: '', thumbnailUrl: '', category: 'Agency', altText: '', caption: '', displayOrder: 1, status: 'Draft' };
  if (kind === 'journey') return { id: '', year: '', category: 'Agency Service', title: '', description: '', brand: 'MBGA', icon: 'Building2', imageUrl: '', imageAlt: '', displayOrder: 1, published: true, featured: false };
  return { id: '', type: 'Milestone', title: '', description: '', year: '', brand: 'MBGA', imageUrl: '', published: true };
}

function entityImage(kind: ContentEntityKind, item: Entity) {
  if (kind === 'products') return (item as Product).image;
  if (kind === 'gallery') {
    const media = item as GalleryItem;
    return media.type === 'Video' ? media.thumbnailUrl : media.url;
  }
  return (item as JourneyMilestone | Achievement).imageUrl;
}

export function ContentEntityEditor({ kind, entityId }: { kind: ContentEntityKind; entityId?: string }) {
  const router = useRouter();
  const meta = labels[kind];
  const editing = Boolean(entityId);
  const [items, setItems] = useState<Entity[]>([]);
  const [item, setItem] = useState<Entity>(() => blankEntity(kind));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState('');
  useUnsavedChanges(dirty);

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/resources/${kind}`, { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || `Unable to load ${meta.section.toLowerCase()}`);
        return Array.isArray(payload.items) ? payload.items as Entity[] : [];
      })
      .then((records) => {
        if (!active) return;
        setItems(records);
        if (entityId) {
          const existing = records.find((record) => record.id === entityId);
          if (!existing) throw new Error(`${meta.singular} was not found.`);
          setItem(existing);
        } else {
          const next = blankEntity(kind);
          if ('displayOrder' in next) next.displayOrder = Math.max(0, ...records.map((record) => 'displayOrder' in record ? Number(record.displayOrder) : 0)) + 1;
          setItem(next);
        }
      })
      .catch((error) => active && setLoadError(error instanceof Error ? error.message : 'Unable to load content'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [entityId, kind, meta.section, meta.singular]);

  const update = (patch: Record<string, unknown>) => {
    setItem((current) => ({ ...current, ...patch }) as Entity);
    setDirty(true);
    for (const key of Object.keys(patch)) setErrors((current) => ({ ...current, [key]: '' }));
  };

  const schema = kind === 'products' ? productSchema : kind === 'gallery' ? gallerySchema : kind === 'journey' ? journeySchema : achievementSchema;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prefix = kind === 'products' ? 'prod' : kind === 'gallery' ? 'gal' : kind === 'journey' ? 'jrn' : 'ach';
    const candidate = { ...item, id: item.id || `${prefix}-${crypto.randomUUID()}` } as Entity;
    const parsed = schema.safeParse(candidate);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path.at(-1) || 'form')] = issue.message;
      setErrors(fieldErrors);
      toast.error(validationMessage(parsed.error));
      return;
    }
    if (kind === 'products' && items.some((record) => record.id !== candidate.id && (record as Product).slug === (candidate as Product).slug)) {
      setErrors({ slug: 'This slug is already in use.' });
      toast.error('Choose a unique product slug.');
      return;
    }
    const nextItems = editing ? items.map((record) => record.id === candidate.id ? candidate : record) : [...items, candidate];
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/resources/${kind}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: nextItems }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `Unable to save ${meta.singular.toLowerCase()}`);
      setDirty(false);
      toast.success(`${meta.singular} ${editing ? 'updated' : 'created'} successfully`);
      router.push(`/admin/${kind}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save changes');
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    if (dirty && !window.confirm('Discard your unsaved changes?')) return;
    setDirty(false);
    router.push(`/admin/${kind}`);
  };

  const image = useMemo(() => entityImage(kind, item), [item, kind]);
  if (loading) return <div className="h-80 animate-pulse rounded-xl border bg-card" />;
  if (loadError) return <Card><CardContent className="p-8 text-center"><p className="font-semibold text-destructive">{loadError}</p></CardContent></Card>;

  const publishing = (
    <>
      <Card>
        <CardHeader><CardTitle className="text-base">Publishing</CardTitle><CardDescription>Control status and placement.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {kind === 'products' && <><AdminField id="availability" label="Availability"><Select value={(item as Product).availability} onValueChange={(value) => update({ availability: value as ProductAvailability })}><SelectTrigger id="availability"><SelectValue /></SelectTrigger><SelectContent>{['In Stock', 'Limited', 'Out of Stock'].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></AdminField><div className="flex items-center justify-between rounded-lg border p-3"><div><p className="text-sm font-semibold">Archived</p><p className="text-xs text-muted-foreground">Hide this product publicly.</p></div><Switch checked={(item as Product).archived} onCheckedChange={(archived) => update({ archived })} aria-label="Archive product" /></div></>}
          {kind === 'gallery' && <AdminField id="status" label="Status"><Select value={(item as GalleryItem).status} onValueChange={(status) => update({ status: status as GalleryStatus })}><SelectTrigger id="status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Draft">Draft</SelectItem><SelectItem value="Published">Published</SelectItem></SelectContent></Select></AdminField>}
          {kind === 'journey' && <><div className="flex items-center justify-between rounded-lg border p-3"><div><p className="text-sm font-semibold">Published</p><p className="text-xs text-muted-foreground">Visible in the selected journey.</p></div><Switch checked={(item as JourneyMilestone).published} onCheckedChange={(published) => update({ published })} aria-label="Publish journey item" /></div><div className="flex items-center justify-between rounded-lg border p-3"><div><p className="text-sm font-semibold">Featured</p><p className="text-xs text-muted-foreground">Eligible for the home preview.</p></div><Switch checked={(item as JourneyMilestone).featured} onCheckedChange={(featured) => update({ featured })} aria-label="Feature journey item" /></div></>}
          {kind === 'achievements' && <div className="flex items-center justify-between rounded-lg border p-3"><div><p className="text-sm font-semibold">Published</p><p className="text-xs text-muted-foreground">Visible on the public page.</p></div><Switch checked={(item as Achievement).published} onCheckedChange={(published) => update({ published })} aria-label="Publish achievement" /></div>}
          {'displayOrder' in item && <AdminField id="displayOrder" label="Display order" helper="Lower numbers appear first."><Input id="displayOrder" type="number" min={0} value={item.displayOrder} onChange={(event) => update({ displayOrder: Number(event.target.value) })} aria-invalid={Boolean(errors.displayOrder)} /></AdminField>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Preview</CardTitle><CardDescription>Current media and status.</CardDescription></CardHeader>
        <CardContent>{image ? <img src={image} alt="Current content preview" className="aspect-video w-full rounded-lg border object-cover" /> : <div className="grid aspect-video place-items-center rounded-lg border border-dashed bg-muted/40"><ImageIcon className="h-8 w-8 text-muted-foreground" /></div>}<div className="mt-3 flex items-center gap-2"><Eye className="h-4 w-4 text-muted-foreground" /><StatusBadge status={kind === 'gallery' ? (item as GalleryItem).status : kind === 'products' ? ((item as Product).archived ? 'Archived' : (item as Product).availability) : (item as JourneyMilestone | Achievement).published ? 'Published' : 'Draft'} /></div></CardContent>
      </Card>
    </>
  );

  return (
    <AdminFormPage section={meta.section} sectionHref={`/admin/${kind}`} title={`${editing ? 'Edit' : 'Add'} ${meta.singular}`} description={meta.description} onSubmit={handleSubmit} onCancel={cancel} saving={saving} submitLabel={editing ? 'Save Changes' : `Create ${meta.singular}`} aside={publishing}>
      {kind === 'products' && <ProductFields item={item as Product} errors={errors} update={update} />}
      {kind === 'gallery' && <GalleryFields item={item as GalleryItem} errors={errors} update={update} />}
      {kind === 'journey' && <JourneyFields item={item as JourneyMilestone} errors={errors} update={update} />}
      {kind === 'achievements' && <AchievementFields item={item as Achievement} errors={errors} update={update} />}
    </AdminFormPage>
  );
}

type FieldProps<T> = { item: T; errors: Record<string, string>; update: (patch: Record<string, unknown>) => void };

function ProductFields({ item, errors, update }: FieldProps<Product>) {
  return <><Card><CardHeader><CardTitle>Basic Information</CardTitle><CardDescription>Customer-facing product name, category and description.</CardDescription></CardHeader><CardContent className="grid gap-5 md:grid-cols-2"><AdminField id="name" label="Product name" required error={errors.name} className="md:col-span-2"><Input id="name" value={item.name} onChange={(event) => update({ name: event.target.value, slug: item.slug || event.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') })} /></AdminField><AdminField id="slug" label="Slug" required helper="Lowercase letters, numbers and hyphens." error={errors.slug}><Input id="slug" value={item.slug} onChange={(event) => update({ slug: event.target.value })} /></AdminField><AdminField id="capacity" label="Cylinder capacity" required error={errors.cylinderCapacity}><Input id="capacity" value={item.cylinderCapacity} onChange={(event) => update({ cylinderCapacity: event.target.value })} placeholder="19 kg" /></AdminField><AdminField id="category" label="Category" required><Select value={item.category} onValueChange={(category) => update({ category: category as ProductCategory })}><SelectTrigger id="category"><SelectValue /></SelectTrigger><SelectContent>{['Commercial', 'Industrial', 'Specialty'].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></AdminField><AdminField id="description" label="Description" required error={errors.description} className="md:col-span-2"><Textarea id="description" rows={5} value={item.description} onChange={(event) => update({ description: event.target.value })} /></AdminField><AdminField id="features" label="Features" helper="Enter one factual feature per line." className="md:col-span-2"><Textarea id="features" rows={5} value={item.features.join('\n')} onChange={(event) => update({ features: event.target.value.split('\n').map((value) => value.trim()).filter(Boolean) })} /></AdminField></CardContent></Card><Card><CardHeader><CardTitle>Product Image</CardTitle><CardDescription>JPG, PNG or WebP up to 5 MB.</CardDescription></CardHeader><CardContent><ImageUploader label="Product image" value={item.image} previewAlt={item.name || 'Product preview'} onChange={(image) => update({ image })} /></CardContent></Card></>;
}

function GalleryFields({ item, errors, update }: FieldProps<GalleryItem>) {
  const isVideo = item.type === 'Video';
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Media Information</CardTitle>
          <CardDescription>Accessible metadata used by the public gallery.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <AdminField id="mediaType" label="Media type" required>
            <Select
              value={item.type}
              onValueChange={(type) => update({ type: type as GalleryItemType, url: '', thumbnailUrl: '' })}
            >
              <SelectTrigger id="mediaType"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Image">Image</SelectItem>
                <SelectItem value="Video">Video</SelectItem>
              </SelectContent>
            </Select>
          </AdminField>
          <AdminField id="galleryCategory" label="Category" required error={errors.category}>
            <Input id="galleryCategory" value={item.category} onChange={(event) => update({ category: event.target.value })} />
          </AdminField>
          <AdminField id="caption" label="Caption" required error={errors.caption} className="md:col-span-2">
            <Input id="caption" value={item.caption} onChange={(event) => update({ caption: event.target.value })} />
          </AdminField>
          <AdminField
            id="altText"
            label="Alt text"
            required
            helper="Describe the useful visual content, not the filename."
            error={errors.altText}
            className="md:col-span-2"
          >
            <Textarea id="altText" rows={3} value={item.altText} onChange={(event) => update({ altText: event.target.value })} />
          </AdminField>
        </CardContent>
      </Card>

      {isVideo ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Video File</CardTitle>
              <CardDescription>Upload an MP4 or WebM file, or paste a link to a hosted video such as YouTube.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <VideoUploader label="Gallery video" value={item.url} posterUrl={item.thumbnailUrl} required onChange={(url) => update({ url })} />
              {errors.url && <p className="text-xs font-medium text-destructive" role="alert">{errors.url}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Video Thumbnail</CardTitle>
              <CardDescription>The still image shown on the gallery tile before the video plays.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ImageUploader
                label="Video thumbnail"
                value={item.thumbnailUrl}
                previewAlt={item.altText || 'Video thumbnail preview'}
                required
                onChange={(thumbnailUrl) => update({ thumbnailUrl })}
              />
              {errors.thumbnailUrl && <p className="text-xs font-medium text-destructive" role="alert">{errors.thumbnailUrl}</p>}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Image Upload</CardTitle>
            <CardDescription>Upload an optimized gallery image.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageUploader label="Gallery image" value={item.url} previewAlt={item.altText || 'Gallery preview'} required onChange={(url) => update({ url })} />
            {errors.url && <p className="text-xs font-medium text-destructive" role="alert">{errors.url}</p>}
          </CardContent>
        </Card>
      )}
    </>
  );
}

function JourneyFields({ item, errors, update }: FieldProps<JourneyMilestone>) {
  const iconOptions = ['Building2', 'TrendingUp', 'Flame', 'Route', 'ShieldCheck', 'Headphones'];
  return <><Card><CardHeader><CardTitle>Journey Story</CardTitle><CardDescription>Choose one clear brand track and enter only approved factual wording.</CardDescription></CardHeader><CardContent className="grid gap-5 md:grid-cols-2"><AdminField id="journeyType" label="Journey" required><Select value={item.brand} onValueChange={(brand) => update({ brand: brand as JourneyBrand })}><SelectTrigger id="journeyType"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Bharatgas">Bharatgas</SelectItem><SelectItem value="MBGA">Madhav Bharat Gas</SelectItem></SelectContent></Select></AdminField><AdminField id="period" label="Year / period" helper="Leave blank unless the period is confirmed." error={errors.year}><Input id="period" value={item.year} onChange={(event) => update({ year: event.target.value })} /></AdminField><AdminField id="journeyCategory" label="Category" required error={errors.category}><Input id="journeyCategory" value={item.category} onChange={(event) => update({ category: event.target.value })} /></AdminField><AdminField id="icon" label="Icon"><Select value={item.icon} onValueChange={(icon) => update({ icon })}><SelectTrigger id="icon"><SelectValue /></SelectTrigger><SelectContent>{iconOptions.map((icon) => <SelectItem key={icon} value={icon}>{icon}</SelectItem>)}</SelectContent></Select></AdminField><AdminField id="journeyTitle" label="Title" required error={errors.title} className="md:col-span-2"><Input id="journeyTitle" value={item.title} onChange={(event) => update({ title: event.target.value })} /></AdminField><AdminField id="journeyDescription" label="Description" required error={errors.description} className="md:col-span-2"><Textarea id="journeyDescription" rows={6} value={item.description} onChange={(event) => update({ description: event.target.value })} /></AdminField></CardContent></Card><Card><CardHeader><CardTitle>Milestone Image</CardTitle><CardDescription>Optional supporting image with required alt text.</CardDescription></CardHeader><CardContent className="space-y-5"><ImageUploader label="Milestone image" value={item.imageUrl} previewAlt={item.imageAlt || item.title || 'Milestone preview'} onChange={(imageUrl) => update({ imageUrl })} /><AdminField id="journeyImageAlt" label="Image alt text" required={Boolean(item.imageUrl)} error={errors.imageAlt}><Input id="journeyImageAlt" value={item.imageAlt} disabled={!item.imageUrl} onChange={(event) => update({ imageAlt: event.target.value })} /></AdminField></CardContent></Card></>;
}

function AchievementFields({ item, errors, update }: FieldProps<Achievement>) {
  return <><Card><CardHeader><CardTitle>Achievement Information</CardTitle><CardDescription>Use factual recognition wording and a confirmed period label.</CardDescription></CardHeader><CardContent className="grid gap-5 md:grid-cols-2"><AdminField id="achievementType" label="Type" required><Select value={item.type} onValueChange={(type) => update({ type: type as AchievementType })}><SelectTrigger id="achievementType"><SelectValue /></SelectTrigger><SelectContent>{['Award', 'Milestone', 'Recognition', 'Certificate'].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></AdminField><AdminField id="achievementYear" label="Year / period" required error={errors.year}><Input id="achievementYear" value={item.year} onChange={(event) => update({ year: event.target.value })} /></AdminField><AdminField id="achievementBrand" label="Brand label" required error={errors.brand} className="md:col-span-2"><Input id="achievementBrand" value={item.brand} onChange={(event) => update({ brand: event.target.value })} /></AdminField><AdminField id="achievementTitle" label="Title" required error={errors.title} className="md:col-span-2"><Input id="achievementTitle" value={item.title} onChange={(event) => update({ title: event.target.value })} /></AdminField><AdminField id="achievementDescription" label="Description" required error={errors.description} className="md:col-span-2"><Textarea id="achievementDescription" rows={6} value={item.description} onChange={(event) => update({ description: event.target.value })} /></AdminField></CardContent></Card><Card><CardHeader><CardTitle>Supporting Image</CardTitle><CardDescription>Optional certificate or approved visual.</CardDescription></CardHeader><CardContent><ImageUploader label="Achievement image" value={item.imageUrl} previewAlt={item.title || 'Achievement preview'} onChange={(imageUrl) => update({ imageUrl })} /></CardContent></Card></>;
}
