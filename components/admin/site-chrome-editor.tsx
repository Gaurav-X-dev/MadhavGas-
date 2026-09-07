'use client';

import { Plus, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { usePersistentSingleton } from '@/hooks/use-persistent-data';
import { fallbackContactSettings } from '@/lib/mock-data';
import { siteChrome as fallbackChrome } from '@/lib/site-chrome-defaults';
import type { ContactSettings, SiteChromeContent } from '@/lib/types';
import { contactSettingsSchema, siteChromeSchema, validationMessage } from '@/lib/validation';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

/** Controls copy injected on every public page and the three public form modes. */
export function SiteChromeEditor() {
  const [chrome, setChrome, chromeLoading, saveChrome] = usePersistentSingleton<SiteChromeContent>('site-chrome', fallbackChrome);
  const [contact, setContact, contactLoading, saveContact] = usePersistentSingleton<ContactSettings>('contact-settings', fallbackContactSettings);
  const [saving, setSaving] = useState(false);

  const updateChrome = <K extends keyof SiteChromeContent>(key: K, value: SiteChromeContent[K]) => setChrome((current) => ({ ...current, [key]: value }));
  const updateNested = <K extends 'newsletter' | 'cta' | 'footer' | 'discovery'>(key: K, patch: Partial<SiteChromeContent[K]>) => setChrome((current) => ({ ...current, [key]: { ...current[key], ...patch } }));
  const updateContact = <K extends keyof ContactSettings>(key: K, value: ContactSettings[K]) => setContact((current) => ({ ...current, [key]: value }));

  const save = async () => {
    const chromeCheck = siteChromeSchema.safeParse(chrome);
    const contactCheck = contactSettingsSchema.safeParse(contact);
    const invalid = !chromeCheck.success ? chromeCheck.error : !contactCheck.success ? contactCheck.error : null;
    if (invalid) { toast.error(validationMessage(invalid)); return; }
    setSaving(true);
    try {
      await Promise.all([saveChrome(), saveContact()]);
      toast.success('Navigation, footer and form content saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save shared site content');
    } finally {
      setSaving(false);
    }
  };

  if (chromeLoading || contactLoading) return <div className="h-96 animate-pulse rounded-xl border bg-card" />;

  return <div className="space-y-5">
    <Card>
      <CardHeader><CardTitle>Header & Navigation</CardTitle><CardDescription>Shared branding-area labels and links shown on every public page.</CardDescription></CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Loader heading"><Input value={chrome.loaderKicker} onChange={(event) => updateChrome('loaderKicker', event.target.value)} /></Field>
          <Field label="Loader tagline"><Input value={chrome.loaderTagline} onChange={(event) => updateChrome('loaderTagline', event.target.value)} /></Field>
          <Field label="Hours label"><Input value={chrome.hoursLabel} onChange={(event) => updateChrome('hoursLabel', event.target.value)} /></Field>
          <Field label="Call button text"><Input value={chrome.callButtonText} onChange={(event) => updateChrome('callButtonText', event.target.value)} /></Field>
        </div>
        <div className="space-y-3">
          {chrome.navigation.map((item) => <div key={item.id} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(150px,1fr)_minmax(180px,1.3fr)_100px_auto_auto] sm:items-end">
            <Field label="Link label"><Input value={item.label} onChange={(event) => updateChrome('navigation', chrome.navigation.map((value) => value.id === item.id ? { ...value, label: event.target.value } : value))} /></Field>
            <Field label="Destination"><Input value={item.href} onChange={(event) => updateChrome('navigation', chrome.navigation.map((value) => value.id === item.id ? { ...value, href: event.target.value } : value))} /></Field>
            <Field label="Order"><Input type="number" min={0} value={item.displayOrder} onChange={(event) => updateChrome('navigation', chrome.navigation.map((value) => value.id === item.id ? { ...value, displayOrder: Number(event.target.value) } : value))} /></Field>
            <div className="flex h-10 items-center gap-2"><Switch checked={item.published} onCheckedChange={(published) => updateChrome('navigation', chrome.navigation.map((value) => value.id === item.id ? { ...value, published } : value))} /><span className="text-xs text-muted-foreground">Visible</span></div>
            <Button type="button" size="icon" variant="ghost" className="text-destructive" aria-label={`Delete ${item.label}`} onClick={() => updateChrome('navigation', chrome.navigation.filter((value) => value.id !== item.id))}><Trash2 className="h-4 w-4" /></Button>
          </div>)}
          <Button type="button" variant="outline" onClick={() => updateChrome('navigation', [...chrome.navigation, { id: `nav-${crypto.randomUUID()}`, label: 'New link', href: '/', displayOrder: Math.max(0, ...chrome.navigation.map((item) => item.displayOrder)) + 1, published: true }])}><Plus className="mr-2 h-4 w-4" />Add Navigation Link</Button>
        </div>
      </CardContent>
    </Card>

    <div className="grid gap-5 xl:grid-cols-2">
      <Card><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle>Newsletter</CardTitle><CardDescription>Subscription section and its browser feedback messages.</CardDescription></div><Switch checked={chrome.newsletter.published} onCheckedChange={(published) => updateNested('newsletter', { published })} /></div></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
        {(['eyebrow', 'title', 'placeholder', 'submitText', 'pendingText'] as const).map((key) => <Field key={key} label={key.replace(/([A-Z])/g, ' $1')}><Input value={chrome.newsletter[key]} onChange={(event) => updateNested('newsletter', { [key]: event.target.value })} /></Field>)}
        {(['description', 'noteText', 'invalidEmailText', 'successText', 'errorText'] as const).map((key) => <Field key={key} label={key.replace(/([A-Z])/g, ' $1')}><Textarea rows={2} value={chrome.newsletter[key]} onChange={(event) => updateNested('newsletter', { [key]: event.target.value })} /></Field>)}
      </CardContent></Card>
      <Card><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle>Global Assistance CTA</CardTitle><CardDescription>Blue call-to-action shown before the newsletter.</CardDescription></div><Switch checked={chrome.cta.published} onCheckedChange={(published) => updateNested('cta', { published })} /></div></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
        {(['title', 'callText', 'contactText', 'whatsappText'] as const).map((key) => <Field key={key} label={key.replace(/([A-Z])/g, ' $1')}><Input value={chrome.cta[key]} onChange={(event) => updateNested('cta', { [key]: event.target.value })} /></Field>)}
        <div className="md:col-span-2"><Field label="Description"><Textarea rows={2} value={chrome.cta.description} onChange={(event) => updateNested('cta', { description: event.target.value })} /></Field></div>
        <div className="md:col-span-2"><Field label="WhatsApp pre-filled message"><Textarea rows={2} value={chrome.cta.whatsappMessage} onChange={(event) => updateNested('cta', { whatsappMessage: event.target.value })} /></Field></div>
      </CardContent></Card>
    </div>

    <Card><CardHeader><CardTitle>Footer Content</CardTitle><CardDescription>Footer headings, QR copy, availability labels and agency description.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {(Object.keys(chrome.footer).filter((key) => key !== 'badges') as Array<Exclude<keyof SiteChromeContent['footer'], 'badges'>>).map((key) => {
        const long = key === 'aboutText';
        return <div key={key} className={long ? 'md:col-span-2 xl:col-span-3' : ''}><Field label={key.replace(/([A-Z])/g, ' $1')}>{long ? <Textarea rows={3} value={chrome.footer[key]} onChange={(event) => updateNested('footer', { [key]: event.target.value })} /> : <Input value={chrome.footer[key]} onChange={(event) => updateNested('footer', { [key]: event.target.value })} />}</Field></div>;
      })}
      <div className="space-y-3 md:col-span-2 xl:col-span-3"><Label>Trust badges</Label>{chrome.footer.badges.map((badge) => <div key={badge.id} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_100px_auto]">
        <Input aria-label="Badge label" value={badge.label} onChange={(event) => updateNested('footer', { badges: chrome.footer.badges.map((value) => value.id === badge.id ? { ...value, label: event.target.value } : value) })} />
        <Input aria-label="Badge icon" value={badge.icon} onChange={(event) => updateNested('footer', { badges: chrome.footer.badges.map((value) => value.id === badge.id ? { ...value, icon: event.target.value } : value) })} />
        <Input aria-label="Badge order" type="number" min={0} value={badge.displayOrder} onChange={(event) => updateNested('footer', { badges: chrome.footer.badges.map((value) => value.id === badge.id ? { ...value, displayOrder: Number(event.target.value) } : value) })} />
        <Button type="button" size="icon" variant="ghost" className="text-destructive" onClick={() => updateNested('footer', { badges: chrome.footer.badges.filter((value) => value.id !== badge.id) })}><Trash2 className="h-4 w-4" /></Button>
      </div>)}<Button type="button" variant="outline" onClick={() => updateNested('footer', { badges: [...chrome.footer.badges, { id: `badge-${crypto.randomUUID()}`, icon: 'shield-check', label: 'New badge', displayOrder: chrome.footer.badges.length + 1 }] })}><Plus className="mr-2 h-4 w-4" />Add Badge</Button></div>
    </CardContent></Card>

    <Card><CardHeader><CardTitle>Local Discovery Labels</CardTitle><CardDescription>The actual locality, category and topic records stay managed under Local Information.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {(Object.keys(chrome.discovery) as Array<keyof SiteChromeContent['discovery']>).map((key) => <Field key={key} label={key.replace(/([A-Z])/g, ' $1')}><Input value={chrome.discovery[key]} onChange={(event) => updateNested('discovery', { [key]: event.target.value })} /></Field>)}
    </CardContent></Card>

    <Card><CardHeader><CardTitle>Contact Form Content & Modes</CardTitle><CardDescription>Choose which request types are available and edit the surrounding public copy.</CardDescription></CardHeader><CardContent className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(['eyebrow', 'title', 'callButtonText', 'emailButtonText', 'submitButtonText', 'unavailableText'] as const).map((key) => <Field key={key} label={key.replace(/([A-Z])/g, ' $1')}><Input value={contact[key]} onChange={(event) => updateContact(key, event.target.value)} /></Field>)}
        {(['description', 'statusText'] as const).map((key) => <div key={key} className="md:col-span-2 xl:col-span-3"><Field label={key.replace(/([A-Z])/g, ' $1')}><Textarea rows={2} value={contact[key]} onChange={(event) => updateContact(key, event.target.value)} /></Field></div>)}
      </div>
      <div className="grid gap-3 md:grid-cols-3">{contact.formTypes.map((type) => <div key={type.id} className="space-y-3 rounded-lg border p-4"><div className="flex items-center justify-between"><strong className="text-sm capitalize">{type.id}</strong><Switch checked={type.enabled} onCheckedChange={(enabled) => updateContact('formTypes', contact.formTypes.map((value) => value.id === type.id ? { ...value, enabled } : value))} /></div><Input aria-label={`${type.id} label`} value={type.label} onChange={(event) => updateContact('formTypes', contact.formTypes.map((value) => value.id === type.id ? { ...value, label: event.target.value } : value))} /><Input aria-label={`${type.id} order`} type="number" min={0} value={type.displayOrder} onChange={(event) => updateContact('formTypes', contact.formTypes.map((value) => value.id === type.id ? { ...value, displayOrder: Number(event.target.value) } : value))} /></div>)}</div>
    </CardContent></Card>

    <div className="flex justify-end"><Button type="button" onClick={save} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? 'Saving…' : 'Save Shared Content'}</Button></div>
  </div>;
}
