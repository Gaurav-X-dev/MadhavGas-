'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AreaField, IconField, ListEditor, TextField } from '@/components/admin/home-section-fields';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { siteSections as fallbackSections } from '@/lib/site-section-defaults';
import type { AssistOption, SiteAssistSection, SiteSectionsContent } from '@/lib/types';
import { siteSectionsSchema, validationMessage } from '@/lib/validation';

/**
 * Edits the "How can we assist you?" panel that appears under the banner on
 * every page. It shares the `site-sections` record with the gallery video hub,
 * so the whole record is loaded and saved back with only this part changed.
 */
export function AssistPanelEditor() {
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

  const assist = content.assist;
  const update = (patch: Partial<SiteAssistSection>) => {
    setContent((current) => ({ ...current, assist: { ...current.assist, ...patch } }));
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
      if (!response.ok) throw new Error(payload.error || 'Unable to save the assist panel');
      toast.success('Assist panel saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save the assist panel');
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
            <CardTitle>Assist Panel</CardTitle>
            <CardDescription className="mt-1">
              The &ldquo;How can we assist you?&rdquo; block shown under the banner on every page, next to the agency card.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="assist-published" className="text-xs text-muted-foreground">Show on the site</Label>
            <Switch id="assist-published" checked={assist.published} onCheckedChange={(published) => update({ published })} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <TextField
          label="Agency card kicker"
          value={assist.partnerKicker}
          onChange={(partnerKicker) => update({ partnerKicker })}
          hint="Small line above the agency name in the card on the left."
        />
        <div className="grid gap-5 md:grid-cols-2">
          <TextField label="Kicker" value={assist.kicker} onChange={(kicker) => update({ kicker })} />
          <TextField label="Heading" value={assist.title} onChange={(title) => update({ title })} maxLength={300} />
        </div>
        <AreaField label="Description" rows={2} value={assist.description} onChange={(description) => update({ description })} />

        <ListEditor<AssistOption>
          label="Assistance options"
          itemLabel="option"
          max={6}
          items={assist.options}
          onChange={(options) => update({ options })}
          createItem={() => ({
            id: `assist-${crypto.randomUUID()}`,
            icon: 'flame',
            kicker: 'Business Support',
            title: 'New assistance option',
            linkText: 'Get in Touch',
            href: '/contact',
            displayOrder: 0,
          })}
          renderItem={(item, patch) => (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Kicker" value={item.kicker} onChange={(kicker) => patch({ kicker })} />
              <IconField label="Icon" value={item.icon} onChange={(icon) => patch({ icon })} />
              <div className="sm:col-span-2">
                <TextField label="Title" value={item.title} onChange={(title) => patch({ title })} />
              </div>
              <TextField label="Link text" value={item.linkText} onChange={(linkText) => patch({ linkText })} />
              <TextField label="Destination" value={item.href} onChange={(href) => patch({ href })} />
            </div>
          )}
        />

        <div className="space-y-5 rounded-xl border p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Footer note</p>
          <div className="grid gap-5 md:grid-cols-2">
            <TextField label="Title" value={assist.noteTitle} onChange={(noteTitle) => update({ noteTitle })} />
            <TextField label="Link text" value={assist.noteLinkText} onChange={(noteLinkText) => update({ noteLinkText })} />
          </div>
          <AreaField label="Text" rows={2} value={assist.noteText} onChange={(noteText) => update({ noteText })} />
          <TextField label="Destination" value={assist.noteHref} onChange={(noteHref) => update({ noteHref })} />
        </div>

        <div className="flex justify-end border-t pt-4">
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Assist Panel'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
