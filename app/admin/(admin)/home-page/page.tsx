'use client';

import { useState } from 'react';
import { AlertCircle, ArrowDown, ArrowUp, Eye, Save } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUploader } from '@/components/admin/image-uploader';
import { PageHeader } from '@/components/admin/page-header';
import {
  AreaField, IconField, ListEditor, NumberField, SectionCard, TextField,
} from '@/components/admin/home-section-fields';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePersistentSingleton } from '@/hooks/use-persistent-data';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { homeContent as initialHome } from '@/lib/home-defaults';
import type {
  HomeContent, HomeSectionKey, HomeBadgeItem, HomeCheckItem, HomeFeatureCard,
  HomeMetric, HomeQuickLink, HomeSafetyStep,
} from '@/lib/types';
import { homeContentSchema, validationMessage } from '@/lib/validation';

const SECTION_LABELS: Record<HomeSectionKey, string> = {
  quickLinks: 'Quick Action Tiles',
  qr: 'WhatsApp QR Booking',
  about: 'About the Agency',
  services: 'Service Commitments',
  products: 'LPG Products Preview',
  safety: 'Site Safety',
  trustStrip: 'Trust Strip',
  journey: 'Journey Preview',
  achievements: 'Achievements Preview',
  partnership: 'MBGA × Bharatgas',
  sustainability: 'Sustainability Preview',
  gallery: 'Gallery Preview',
  visit: 'Agency Information',
};

const SECTION_SOURCES: Partial<Record<HomeSectionKey, string>> = {
  products: 'Cards come from Catalog → Products',
  journey: 'Cards come from Brand Story → Journey',
  achievements: 'Cards come from Brand Story → Achievements',
  sustainability: 'Points come from Brand Story → Sustainability',
  gallery: 'Images come from Catalog → Gallery',
  visit: 'Details come from Website → Site Content',
};

const newId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export default function HomePageContentPage() {
  const [home, setHome, loading, save] = usePersistentSingleton<HomeContent>('home-content', initialHome);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [formError, setFormError] = useState('');
  useUnsavedChanges(dirty);

  /** Patches one section and marks the form dirty. */
  const patch = <K extends HomeSectionKey>(key: K, value: Partial<HomeContent[K]>) => {
    setHome((current) => ({ ...current, [key]: { ...current[key], ...value } }));
    setFormError('');
    setDirty(true);
  };

  const orderedSections = (Object.keys(SECTION_LABELS) as HomeSectionKey[])
    .sort((a, b) => home[a].displayOrder - home[b].displayOrder);

  const moveSection = (key: HomeSectionKey, direction: -1 | 1) => {
    const index = orderedSections.indexOf(key);
    const target = index + direction;
    if (target < 0 || target >= orderedSections.length) return;
    const next = [...orderedSections];
    [next[index], next[target]] = [next[target], next[index]];
    setHome((current) => {
      const updated: Record<string, unknown> = { ...current };
      next.forEach((sectionKey, position) => {
        updated[sectionKey] = { ...current[sectionKey], displayOrder: position + 1 };
      });
      return updated as unknown as HomeContent;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    const check = homeContentSchema.safeParse(home);
    if (!check.success) {
      const message = validationMessage(check.error);
      setFormError(message);
      toast.error(message);
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await save();
      setDirty(false);
      toast.success('Home page content saved successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save home page content';
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-96 animate-pulse rounded-xl border bg-card" />;

  return (
    <div className="animate-fade-in-up pb-24">
      <PageHeader
        title="Home Page"
        description="Every homepage block — copy, imagery, order and visibility — is edited here and published straight to the public site."
      >
        <Button variant="outline" asChild>
          <a href="/" target="_blank" rel="noopener noreferrer"><Eye className="mr-2 h-4 w-4" />Preview Site</a>
        </Button>
      </PageHeader>

      {formError && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{formError}</span>
        </div>
      )}

      <Tabs defaultValue="layout" className="space-y-5">
        <div className="overflow-x-auto rounded-xl border bg-card p-2 shadow-sm">
          <TabsList className="grid h-auto min-w-[860px] grid-cols-7 bg-muted/70">
            <TabsTrigger value="layout" className="py-2.5">Layout</TabsTrigger>
            <TabsTrigger value="intro" className="py-2.5">Intro & QR</TabsTrigger>
            <TabsTrigger value="about" className="py-2.5">About</TabsTrigger>
            <TabsTrigger value="services" className="py-2.5">Commitments</TabsTrigger>
            <TabsTrigger value="safety" className="py-2.5">Safety</TabsTrigger>
            <TabsTrigger value="brand" className="py-2.5">Brand & Proof</TabsTrigger>
            <TabsTrigger value="lists" className="py-2.5">Linked Sections</TabsTrigger>
          </TabsList>
        </div>

        {/* ------------------------------ Layout ------------------------------ */}
        <TabsContent value="layout" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Section Order & Visibility</CardTitle>
              <CardDescription className="mt-1">
                Move a block to change where it appears on the homepage, or switch it off to hide it without losing its content.
                The hero slider always stays at the top and is edited in Site Content → Hero.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {orderedSections.map((key, index) => (
                <div key={key} className="flex flex-wrap items-center gap-3 rounded-xl border p-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-xs font-bold">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{SECTION_LABELS[key]}</p>
                    {SECTION_SOURCES[key] && <p className="truncate text-xs text-muted-foreground">{SECTION_SOURCES[key]}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === 0} onClick={() => moveSection(key, -1)} aria-label={`Move ${SECTION_LABELS[key]} up`}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === orderedSections.length - 1} onClick={() => moveSection(key, 1)} aria-label={`Move ${SECTION_LABELS[key]} down`}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Switch
                      checked={home[key].published}
                      onCheckedChange={(published) => patch(key, { published } as Partial<HomeContent[typeof key]>)}
                      aria-label={`Show ${SECTION_LABELS[key]} on the homepage`}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------- Intro & QR ---------------------------- */}
        <TabsContent value="intro" className="mt-0 space-y-5">
          <SectionCard
            title="Quick Action Tiles"
            description="The four shortcut tiles directly under the hero slider."
            published={home.quickLinks.published}
            onPublishedChange={(published) => patch('quickLinks', { published })}
          >
            <ListEditor<HomeQuickLink>
              label="Tiles"
              itemLabel="tile"
              items={home.quickLinks.items}
              onChange={(items) => patch('quickLinks', { items })}
              createItem={() => ({ id: newId('quick'), icon: 'phone', title: 'New tile', description: 'Describe this shortcut.', linkText: 'Open', href: '/contact', displayOrder: 0, published: true })}
              renderItem={(item, update) => (
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField label="Title" value={item.title} onChange={(title) => update({ title })} />
                  <IconField label="Icon" value={item.icon} onChange={(icon) => update({ icon })} />
                  <div className="sm:col-span-2">
                    <AreaField label="Description" rows={2} value={item.description} onChange={(description) => update({ description })} />
                  </div>
                  <TextField label="Link text" value={item.linkText} onChange={(linkText) => update({ linkText })} />
                  <TextField
                    label="Destination"
                    value={item.href}
                    onChange={(href) => update({ href })}
                    hint="Use tel:, whatsapp:, maps: or email: to reuse the saved agency contact details, or enter a path such as /contact."
                  />
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <Switch checked={item.published} onCheckedChange={(published) => update({ published })} aria-label={`Show ${item.title}`} />
                    <span className="text-xs text-muted-foreground">Show this tile</span>
                  </div>
                </div>
              )}
            />
          </SectionCard>

          <SectionCard
            title="WhatsApp QR Booking"
            description="The scan-to-book panel. The QR code itself is generated from QR Settings."
            published={home.qr.published}
            onPublishedChange={(published) => patch('qr', { published })}
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <TextField label="Eyebrow" value={home.qr.eyebrow} onChange={(eyebrow) => patch('qr', { eyebrow })} />
              <TextField label="Heading" value={home.qr.title} onChange={(title) => patch('qr', { title })} maxLength={300} />
            </div>
            <AreaField label="Description" rows={4} value={home.qr.description} onChange={(description) => patch('qr', { description })} />
            <div className="grid gap-5 lg:grid-cols-2">
              <TextField label="Button text" value={home.qr.ctaText} onChange={(ctaText) => patch('qr', { ctaText })} />
              <TextField label="Brand badge" value={home.qr.badgeText} onChange={(badgeText) => patch('qr', { badgeText })} />
              <TextField label="QR caption" value={home.qr.scanTitle} onChange={(scanTitle) => patch('qr', { scanTitle })} />
              <TextField label="QR sub-caption" value={home.qr.scanSubtitle} onChange={(scanSubtitle) => patch('qr', { scanSubtitle })} />
            </div>
            <ListEditor<HomeBadgeItem>
              label="Benefit chips"
              itemLabel="chip"
              max={6}
              items={home.qr.benefits}
              onChange={(benefits) => patch('qr', { benefits })}
              createItem={() => ({ id: newId('qrb'), icon: 'clock', label: 'New benefit', displayOrder: 0 })}
              renderItem={(item, update) => (
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField label="Label" value={item.label} onChange={(label) => update({ label })} />
                  <IconField label="Icon" value={item.icon} onChange={(icon) => update({ icon })} />
                </div>
              )}
            />
          </SectionCard>

          <SectionCard
            title="Trust Strip"
            description="The compact band of service principles. The first three also appear on the hero slide."
            published={home.trustStrip.published}
            onPublishedChange={(published) => patch('trustStrip', { published })}
          >
            <ListEditor<HomeBadgeItem>
              label="Principles"
              itemLabel="principle"
              items={home.trustStrip.items}
              onChange={(items) => patch('trustStrip', { items })}
              createItem={() => ({ id: newId('trust'), icon: 'shield-check', label: 'New principle', displayOrder: 0 })}
              renderItem={(item, update) => (
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField label="Label" value={item.label} onChange={(label) => update({ label })} />
                  <IconField label="Icon" value={item.icon} onChange={(icon) => update({ icon })} />
                </div>
              )}
            />
          </SectionCard>
        </TabsContent>

        {/* ------------------------------- About ------------------------------ */}
        <TabsContent value="about" className="mt-0 space-y-5">
          <SectionCard
            title="About the Agency"
            description="The image-and-copy block introducing MBGA."
            published={home.about.published}
            onPublishedChange={(published) => patch('about', { published })}
          >
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="space-y-5">
                <div className="grid gap-5 lg:grid-cols-2">
                  <TextField label="Eyebrow" value={home.about.eyebrow} onChange={(eyebrow) => patch('about', { eyebrow })} />
                  <TextField label="Heading" value={home.about.title} onChange={(title) => patch('about', { title })} maxLength={300} />
                </div>
                <AreaField label="Lead paragraph" rows={3} value={home.about.lead} onChange={(lead) => patch('about', { lead })} />
                <AreaField label="Supporting paragraph" rows={3} value={home.about.detail} onChange={(detail) => patch('about', { detail })} />
                <div className="grid gap-5 lg:grid-cols-2">
                  <TextField label="Image badge title" value={home.about.badgeTitle} onChange={(badgeTitle) => patch('about', { badgeTitle })} />
                  <TextField label="Image badge subtitle" value={home.about.badgeSubtitle} onChange={(badgeSubtitle) => patch('about', { badgeSubtitle })} />
                  <TextField label="Link text" value={home.about.ctaText} onChange={(ctaText) => patch('about', { ctaText })} />
                  <TextField label="Link destination" value={home.about.ctaLink} onChange={(ctaLink) => patch('about', { ctaLink })} />
                </div>
              </div>
              <div className="space-y-5">
                <ImageUploader label="Section image" value={home.about.image} previewAlt={home.about.imageAlt} required onChange={(image) => patch('about', { image })} />
                <TextField label="Image alt text" value={home.about.imageAlt} onChange={(imageAlt) => patch('about', { imageAlt })} maxLength={300} />
              </div>
            </div>

            <ListEditor<HomeCheckItem>
              label="Checklist points"
              itemLabel="point"
              items={home.about.checkItems}
              onChange={(checkItems) => patch('about', { checkItems })}
              createItem={() => ({ id: newId('chk'), label: 'New point', displayOrder: 0 })}
              renderItem={(item, update) => <TextField label="Label" value={item.label} onChange={(label) => update({ label })} />}
            />

            <ListEditor<HomeMetric>
              label="Highlight metrics"
              itemLabel="metric"
              max={6}
              items={home.about.metrics}
              onChange={(metrics) => patch('about', { metrics })}
              createItem={() => ({ id: newId('met'), value: 'New', label: 'Describe this metric', displayOrder: 0 })}
              renderItem={(item, update) => (
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField label="Value" value={item.value} onChange={(value) => update({ value })} />
                  <TextField label="Label" value={item.label} onChange={(label) => update({ label })} />
                </div>
              )}
            />
          </SectionCard>
        </TabsContent>

        {/* ----------------------------- Commitments -------------------------- */}
        <TabsContent value="services" className="mt-0 space-y-5">
          <SectionCard
            title="Service Commitments"
            description="The numbered service-standard cards."
            published={home.services.published}
            onPublishedChange={(published) => patch('services', { published })}
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <TextField label="Eyebrow" value={home.services.eyebrow} onChange={(eyebrow) => patch('services', { eyebrow })} />
              <TextField label="Heading" value={home.services.title} onChange={(title) => patch('services', { title })} maxLength={300} />
            </div>
            <AreaField label="Lead paragraph" rows={2} value={home.services.lead} onChange={(lead) => patch('services', { lead })} />
            <ListEditor<HomeFeatureCard>
              label="Commitment cards"
              itemLabel="card"
              items={home.services.cards}
              onChange={(cards) => patch('services', { cards })}
              createItem={() => ({ id: newId('svc'), icon: 'shield-check', title: 'New commitment', description: 'Describe this service standard.', linkText: 'Learn More', linkHref: '/contact', displayOrder: 0, published: true })}
              renderItem={(item, update) => (
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField label="Title" value={item.title} onChange={(title) => update({ title })} />
                  <IconField label="Icon" value={item.icon} onChange={(icon) => update({ icon })} />
                  <div className="sm:col-span-2">
                    <AreaField label="Description" rows={2} value={item.description} onChange={(description) => update({ description })} />
                  </div>
                  <TextField label="Link text" value={item.linkText} onChange={(linkText) => update({ linkText })} />
                  <TextField label="Link destination" value={item.linkHref} onChange={(linkHref) => update({ linkHref })} />
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <Switch checked={item.published} onCheckedChange={(published) => update({ published })} aria-label={`Show ${item.title}`} />
                    <span className="text-xs text-muted-foreground">Show this card</span>
                  </div>
                </div>
              )}
            />
          </SectionCard>
        </TabsContent>

        {/* ------------------------------- Safety ----------------------------- */}
        <TabsContent value="safety" className="mt-0 space-y-5">
          <SectionCard
            title="Site Safety"
            description="The safety checklist panel and its supporting copy."
            published={home.safety.published}
            onPublishedChange={(published) => patch('safety', { published })}
          >
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="space-y-5">
                <div className="grid gap-5 lg:grid-cols-2">
                  <TextField label="Eyebrow" value={home.safety.eyebrow} onChange={(eyebrow) => patch('safety', { eyebrow })} />
                  <TextField
                    label="Heading"
                    value={home.safety.title}
                    onChange={(title) => patch('safety', { title })}
                    maxLength={300}
                    hint="Press Enter inside the heading fields to force a line break on the site."
                  />
                </div>
                <AreaField label="Lead paragraph" rows={2} value={home.safety.lead} onChange={(lead) => patch('safety', { lead })} />
                <div className="grid gap-5 lg:grid-cols-2">
                  <TextField label="Proof title" value={home.safety.proofTitle} onChange={(proofTitle) => patch('safety', { proofTitle })} />
                  <TextField label="Proof subtitle" value={home.safety.proofSubtitle} onChange={(proofSubtitle) => patch('safety', { proofSubtitle })} />
                  <TextField label="Button text" value={home.safety.ctaText} onChange={(ctaText) => patch('safety', { ctaText })} />
                  <TextField label="Button destination" value={home.safety.ctaLink} onChange={(ctaLink) => patch('safety', { ctaLink })} />
                  <TextField label="Emergency line title" value={home.safety.helpTitle} onChange={(helpTitle) => patch('safety', { helpTitle })} />
                  <TextField label="Emergency link text" value={home.safety.helpLinkText} onChange={(helpLinkText) => patch('safety', { helpLinkText })} hint="Always dials the saved primary agency phone number." />
                </div>
              </div>
              <div className="space-y-5">
                <ImageUploader label="Safety image" value={home.safety.image} previewAlt={home.safety.imageAlt} required onChange={(image) => patch('safety', { image })} />
                <TextField label="Image alt text" value={home.safety.imageAlt} onChange={(imageAlt) => patch('safety', { imageAlt })} maxLength={300} />
                <TextField label="Image badge" value={home.safety.badgeText} onChange={(badgeText) => patch('safety', { badgeText })} />
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <TextField label="Panel kicker" value={home.safety.panelKicker} onChange={(panelKicker) => patch('safety', { panelKicker })} />
              <TextField label="Panel heading" value={home.safety.panelTitle} onChange={(panelTitle) => patch('safety', { panelTitle })} />
            </div>
            <AreaField label="Panel subtitle" rows={2} value={home.safety.panelSubtitle} onChange={(panelSubtitle) => patch('safety', { panelSubtitle })} />

            <ListEditor<HomeSafetyStep>
              label="Checklist steps"
              itemLabel="step"
              max={10}
              items={home.safety.steps}
              onChange={(steps) => patch('safety', { steps })}
              createItem={() => ({ id: newId('safe'), title: 'New check', description: 'Describe this safety habit.', displayOrder: 0 })}
              renderItem={(item, update) => (
                <div className="space-y-4">
                  <TextField label="Title" value={item.title} onChange={(title) => update({ title })} />
                  <AreaField label="Description" rows={2} value={item.description} onChange={(description) => update({ description })} />
                </div>
              )}
            />

            <div className="grid gap-5 lg:grid-cols-2">
              <TextField label="Panel footer title" value={home.safety.footerTitle} onChange={(footerTitle) => patch('safety', { footerTitle })} />
              <TextField label="Panel footer subtitle" value={home.safety.footerSubtitle} onChange={(footerSubtitle) => patch('safety', { footerSubtitle })} />
              <TextField label="Panel footer link text" value={home.safety.footerLinkText} onChange={(footerLinkText) => patch('safety', { footerLinkText })} />
              <TextField label="Panel footer destination" value={home.safety.footerLinkHref} onChange={(footerLinkHref) => patch('safety', { footerLinkHref })} />
            </div>
          </SectionCard>
        </TabsContent>

        {/* --------------------------- Brand & Proof -------------------------- */}
        <TabsContent value="brand" className="mt-0 space-y-5">
          <SectionCard
            title="MBGA × Bharatgas"
            description="The partnership block linking the local agency to the Bharatgas brand."
            published={home.partnership.published}
            onPublishedChange={(published) => patch('partnership', { published })}
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <TextField label="Eyebrow" value={home.partnership.eyebrow} onChange={(eyebrow) => patch('partnership', { eyebrow })} />
              <TextField label="Heading" value={home.partnership.title} onChange={(title) => patch('partnership', { title })} maxLength={300} />
            </div>
            <AreaField label="Lead paragraph" rows={2} value={home.partnership.lead} onChange={(lead) => patch('partnership', { lead })} />
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-5 rounded-xl border p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Left card — MBGA</p>
                <TextField label="Label" value={home.partnership.leftLabel} onChange={(leftLabel) => patch('partnership', { leftLabel })} />
                <TextField label="Title" value={home.partnership.leftTitle} onChange={(leftTitle) => patch('partnership', { leftTitle })} />
                <AreaField label="Description" rows={3} value={home.partnership.leftDescription} onChange={(leftDescription) => patch('partnership', { leftDescription })} />
              </div>
              <div className="space-y-5 rounded-xl border p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Right card — Bharatgas</p>
                <TextField label="Label" value={home.partnership.rightLabel} onChange={(rightLabel) => patch('partnership', { rightLabel })} />
                <TextField label="Title" value={home.partnership.rightTitle} onChange={(rightTitle) => patch('partnership', { rightTitle })} />
                <AreaField label="Description" rows={3} value={home.partnership.rightDescription} onChange={(rightDescription) => patch('partnership', { rightDescription })} />
              </div>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <TextField label="Connector title" value={home.partnership.bridgeTitle} onChange={(bridgeTitle) => patch('partnership', { bridgeTitle })} />
              <TextField label="Connector flow" value={home.partnership.bridgeFlow} onChange={(bridgeFlow) => patch('partnership', { bridgeFlow })} />
            </div>
          </SectionCard>

          <SectionCard
            title="Agency Information"
            description="The contact cards at the bottom of the page. Phone, WhatsApp, email, address and hours all come from Site Content."
            published={home.visit.published}
            onPublishedChange={(published) => patch('visit', { published })}
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <TextField label="Eyebrow" value={home.visit.eyebrow} onChange={(eyebrow) => patch('visit', { eyebrow })} />
              <TextField label="Heading" value={home.visit.title} onChange={(title) => patch('visit', { title })} maxLength={300} />
            </div>
            <AreaField label="Lead paragraph" rows={2} value={home.visit.lead} onChange={(lead) => patch('visit', { lead })} />
            <TextField
              label="Map link (optional)"
              value={home.visit.mapsUrl}
              onChange={(mapsUrl) => patch('visit', { mapsUrl })}
              maxLength={2048}
              hint="Leave blank to generate a Google Maps search from the saved office address."
            />
          </SectionCard>
        </TabsContent>

        {/* -------------------------- Linked sections ------------------------- */}
        <TabsContent value="lists" className="mt-0 space-y-5">
          <Card className="border-brand-blue/25 bg-brand-blue/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">These blocks pull live content</CardTitle>
              <CardDescription>
                The headings and limits below are set here; the cards themselves come from Products, Journey,
                Achievements, Sustainability and Gallery, so editing those pages updates the homepage automatically.
              </CardDescription>
            </CardHeader>
          </Card>

          <SectionCard
            title="LPG Products Preview"
            description="Shows the published products in catalog order."
            published={home.products.published}
            onPublishedChange={(published) => patch('products', { published })}
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <TextField label="Eyebrow" value={home.products.eyebrow} onChange={(eyebrow) => patch('products', { eyebrow })} />
              <TextField label="Heading" value={home.products.title} onChange={(title) => patch('products', { title })} maxLength={300} />
            </div>
            <AreaField label="Lead paragraph" rows={2} value={home.products.lead} onChange={(lead) => patch('products', { lead })} />
            <div className="grid gap-5 lg:grid-cols-2">
              <TextField label="Link text" value={home.products.ctaText} onChange={(ctaText) => patch('products', { ctaText })} />
              <NumberField label="Products to show" value={home.products.limit} onChange={(limit) => patch('products', { limit })} />
              <TextField label="Pricing note title" value={home.products.noteTitle} onChange={(noteTitle) => patch('products', { noteTitle })} />
              <TextField label="Pricing note link text" value={home.products.noteCtaText} onChange={(noteCtaText) => patch('products', { noteCtaText })} />
            </div>
            <AreaField label="Pricing note text" rows={2} value={home.products.noteDescription} onChange={(noteDescription) => patch('products', { noteDescription })} />
          </SectionCard>

          <SectionCard
            title="Journey Preview"
            description="Shows featured journey milestones, or the first published ones when none are featured."
            published={home.journey.published}
            onPublishedChange={(published) => patch('journey', { published })}
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <TextField label="Eyebrow" value={home.journey.eyebrow} onChange={(eyebrow) => patch('journey', { eyebrow })} />
              <TextField label="Heading" value={home.journey.title} onChange={(title) => patch('journey', { title })} maxLength={300} />
              <TextField label="Button text" value={home.journey.ctaText} onChange={(ctaText) => patch('journey', { ctaText })} />
              <NumberField label="Milestones to show" value={home.journey.limit} onChange={(limit) => patch('journey', { limit })} />
            </div>
          </SectionCard>

          <SectionCard
            title="Achievements Preview"
            description="Shows published achievements from the Brand Story section."
            published={home.achievements.published}
            onPublishedChange={(published) => patch('achievements', { published })}
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <TextField label="Eyebrow" value={home.achievements.eyebrow} onChange={(eyebrow) => patch('achievements', { eyebrow })} />
              <TextField label="Heading" value={home.achievements.title} onChange={(title) => patch('achievements', { title })} maxLength={300} />
              <TextField label="Button text" value={home.achievements.ctaText} onChange={(ctaText) => patch('achievements', { ctaText })} />
              <NumberField label="Achievements to show" value={home.achievements.limit} onChange={(limit) => patch('achievements', { limit })} />
            </div>
            <AreaField label="Lead paragraph" rows={2} value={home.achievements.lead} onChange={(lead) => patch('achievements', { lead })} />
          </SectionCard>

          <SectionCard
            title="Sustainability Preview"
            description="The numbered points mirror the published cards on the Sustainability page."
            published={home.sustainability.published}
            onPublishedChange={(published) => patch('sustainability', { published })}
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <TextField label="Eyebrow" value={home.sustainability.eyebrow} onChange={(eyebrow) => patch('sustainability', { eyebrow })} />
              <TextField label="Heading" value={home.sustainability.title} onChange={(title) => patch('sustainability', { title })} maxLength={300} />
              <TextField label="Button text" value={home.sustainability.ctaText} onChange={(ctaText) => patch('sustainability', { ctaText })} />
              <TextField label="Button destination" value={home.sustainability.ctaLink} onChange={(ctaLink) => patch('sustainability', { ctaLink })} />
              <NumberField label="Points to show" value={home.sustainability.limit} onChange={(limit) => patch('sustainability', { limit })} />
            </div>
            <AreaField
              label="Description"
              rows={3}
              value={home.sustainability.description}
              onChange={(description) => patch('sustainability', { description })}
              hint="Leave this blank to reuse the Sustainability page hero description."
            />
          </SectionCard>

          <SectionCard
            title="Gallery Preview"
            description="Shows published gallery media in display order."
            published={home.gallery.published}
            onPublishedChange={(published) => patch('gallery', { published })}
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <TextField label="Eyebrow" value={home.gallery.eyebrow} onChange={(eyebrow) => patch('gallery', { eyebrow })} />
              <TextField label="Heading" value={home.gallery.title} onChange={(title) => patch('gallery', { title })} maxLength={300} />
              <TextField label="Button text" value={home.gallery.ctaText} onChange={(ctaText) => patch('gallery', { ctaText })} />
              <NumberField label="Images to show" value={home.gallery.limit} onChange={(limit) => patch('gallery', { limit })} />
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-0 z-20 -mx-4 mt-8 border-t bg-background/95 px-4 py-3 shadow-[0_-14px_35px_rgba(8,47,87,0.08)] backdrop-blur md:-mx-5 md:px-5 lg:-mx-6 lg:px-6 xl:-mx-8 xl:px-8">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
          <p className="hidden text-xs text-muted-foreground sm:block">Changes are saved to the database and reflected on the public homepage.</p>
          <Button onClick={handleSave} disabled={saving || !dirty} className="ml-auto">
            <Save className="mr-2 h-4 w-4" />{saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
