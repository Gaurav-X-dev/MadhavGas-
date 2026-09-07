'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ImageUploader } from '@/components/admin/image-uploader';
import { ListEditor, TextField, AreaField } from '@/components/admin/home-section-fields';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { siteSections as fallbackSections } from '@/lib/site-section-defaults';
import type { SiteSectionsContent, VideoHubItem, VideoHubSection } from '@/lib/types';
import { siteSectionsSchema, validationMessage } from '@/lib/validation';

/**
 * Edits the gallery page's video hub. It lives in the shared `site-sections`
 * record, so the whole record is loaded, the hub is patched, and it is saved
 * back — leaving the assist panel in that record untouched.
 */
export function VideoHubEditor() {
  const [content, setContent] = useState<SiteSectionsContent>(fallbackSections);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/settings/site-sections', { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload) => { if (active && payload?.data) setContent(payload.data); })
      .catch(() => undefined)
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const hub = content.videoHub;
  const update = (patch: Partial<VideoHubSection>) => {
    setContent((current) => ({ ...current, videoHub: { ...current.videoHub, ...patch } }));
  };

  const save = async () => {
    const check = siteSectionsSchema.safeParse(content);
    if (!check.success) { toast.error(validationMessage(check.error)); return; }
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings/site-sections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(check.data),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to save the video hub');
      toast.success('Video hub saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save the video hub');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-64 animate-pulse rounded-xl border bg-card" />;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Video Hub</CardTitle>
            <CardDescription className="mt-1">
              The video section further down the gallery page: one featured video plus a list of other topics.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="hub-published" className="text-xs text-muted-foreground">Show on the page</Label>
            <Switch id="hub-published" checked={hub.published} onCheckedChange={(published) => update({ published })} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <TextField label="Eyebrow" value={hub.eyebrow} onChange={(eyebrow) => update({ eyebrow })} />
          <TextField label="Heading" value={hub.title} onChange={(title) => update({ title })} maxLength={300} />
        </div>
        <AreaField label="Lead paragraph" rows={2} value={hub.lead} onChange={(lead) => update({ lead })} />
        <TextField label="Count label" value={hub.countLabel} onChange={(countLabel) => update({ countLabel })} hint="Shown after the number of videos, for example “Featured Guide”." />

        <div className="space-y-5 rounded-xl border p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Featured video</p>
          <div className="space-y-1.5">
            <Label htmlFor="hub-embed">Embed link</Label>
            <Input
              id="hub-embed"
              value={hub.featuredEmbedUrl}
              onChange={(event) => update({ featuredEmbedUrl: event.target.value })}
              maxLength={2048}
              placeholder="https://www.youtube.com/embed/VIDEO_ID?rel=0"
            />
            <p className="text-xs text-muted-foreground">
              Use the <strong>embed</strong> form of the link (<code>/embed/</code>), not the normal watch link.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <TextField label="Kicker" value={hub.featuredKicker} onChange={(featuredKicker) => update({ featuredKicker })} />
            <TextField label="Title" value={hub.featuredTitle} onChange={(featuredTitle) => update({ featuredTitle })} />
          </div>
          <AreaField label="Description" rows={2} value={hub.featuredDescription} onChange={(featuredDescription) => update({ featuredDescription })} />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <TextField label="Playlist kicker" value={hub.playlistKicker} onChange={(playlistKicker) => update({ playlistKicker })} />
          <TextField label="Playlist heading" value={hub.playlistTitle} onChange={(playlistTitle) => update({ playlistTitle })} />
        </div>

        <ListEditor<VideoHubItem>
          label="Other video topics"
          itemLabel="video"
          max={12}
          items={hub.items}
          onChange={(items) => update({ items })}
          createItem={() => ({
            id: `vid-${crypto.randomUUID()}`,
            title: 'New video topic',
            category: 'Safety',
            duration: '03 min',
            url: 'https://www.youtube.com/',
            thumbnailUrl: '/assets/industrial/industrial-safety.png',
            displayOrder: 0,
          })}
          renderItem={(item, patch) => (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-4">
                <TextField label="Title" value={item.title} onChange={(title) => patch({ title })} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField label="Category" value={item.category} onChange={(category) => patch({ category })} />
                  <TextField label="Duration" value={item.duration} onChange={(duration) => patch({ duration })} />
                </div>
                <TextField label="Video link" value={item.url} onChange={(url) => patch({ url })} maxLength={2048} hint="Opens in a new tab." />
              </div>
              <ImageUploader
                label="Thumbnail"
                value={item.thumbnailUrl}
                previewAlt={item.title}
                required
                onChange={(thumbnailUrl) => patch({ thumbnailUrl })}
              />
            </div>
          )}
        />

        <div className="grid gap-5 md:grid-cols-2">
          <TextField label="Channel link text" value={hub.channelLinkText} onChange={(channelLinkText) => update({ channelLinkText })} hint="Leave blank to hide the channel link." />
          <TextField label="Channel link" value={hub.channelUrl} onChange={(channelUrl) => update({ channelUrl })} maxLength={2048} />
        </div>

        <div className="flex justify-end border-t pt-4">
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Video Hub'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
