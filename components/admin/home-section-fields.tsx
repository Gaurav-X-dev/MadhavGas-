'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

/** Icon names the public site can actually draw. */
export const HOME_ICONS = [
  'shield-check', 'headphones', 'clock', 'map-pin', 'phone', 'mail', 'whatsapp', 'flame', 'message-circle',
] as const;

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function TextField({ label, value, onChange, hint, placeholder, maxLength = 160 }: {
  label: string; value: string; onChange: (value: string) => void; hint?: string; placeholder?: string; maxLength?: number;
}) {
  return (
    <Field label={label} hint={hint}>
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={maxLength} />
    </Field>
  );
}

export function AreaField({ label, value, onChange, hint, rows = 3, maxLength = 1200 }: {
  label: string; value: string; onChange: (value: string) => void; hint?: string; rows?: number; maxLength?: number;
}) {
  return (
    <Field label={label} hint={hint}>
      <Textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} maxLength={maxLength} />
    </Field>
  );
}

export function NumberField({ label, value, onChange, hint, min = 1, max = 24 }: {
  label: string; value: number; onChange: (value: number) => void; hint?: string; min?: number; max?: number;
}) {
  return (
    <Field label={label} hint={hint}>
      <Input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </Field>
  );
}

export function IconField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <Select value={HOME_ICONS.includes(value as typeof HOME_ICONS[number]) ? value : 'shield-check'} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {HOME_ICONS.map((icon) => <SelectItem key={icon} value={icon}>{icon}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>
  );
}

/**
 * Wraps one homepage section with its publish switch, so an administrator can
 * hide a whole block without deleting the content inside it.
 */
export function SectionCard({ title, description, published, onPublishedChange, children }: {
  title: string;
  description: string;
  published: boolean;
  onPublishedChange: (published: boolean) => void;
  children: React.ReactNode;
}) {
  const switchId = `publish-${title.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor={switchId} className="text-xs text-muted-foreground">Show on homepage</Label>
            <Switch id={switchId} checked={published} onCheckedChange={onPublishedChange} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

/**
 * Generic ordered list editor. Items keep a `displayOrder`, which is rewritten
 * on every add / remove / move so the public page order always matches the
 * order shown here.
 */
export function ListEditor<T extends { id: string; displayOrder: number }>({
  label, items, onChange, createItem, renderItem, max = 8, itemLabel = 'item',
}: {
  label: string;
  items: T[];
  onChange: (items: T[]) => void;
  createItem: () => T;
  renderItem: (item: T, update: (patch: Partial<T>) => void, index: number) => React.ReactNode;
  max?: number;
  itemLabel?: string;
}) {
  const ordered = [...items].sort((a, b) => a.displayOrder - b.displayOrder);
  const commit = (next: T[]) => onChange(next.map((item, index) => ({ ...item, displayOrder: index + 1 })));
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>{label}</Label>
        <Button type="button" variant="outline" size="sm" disabled={ordered.length >= max} onClick={() => commit([...ordered, createItem()])}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />Add {itemLabel}
        </Button>
      </div>
      {ordered.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No {itemLabel}s yet. This block will be hidden on the homepage until you add one.
        </p>
      )}
      {ordered.map((item, index) => (
        <div key={item.id} className="rounded-xl border p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {itemLabel} {index + 1}
            </span>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move ${itemLabel} ${index + 1} up`}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === ordered.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${itemLabel} ${index + 1} down`}>
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => commit(ordered.filter((entry) => entry.id !== item.id))} aria-label={`Delete ${itemLabel} ${index + 1}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {renderItem(item, (patch) => commit(ordered.map((entry) => (entry.id === item.id ? { ...entry, ...patch } : entry))), index)}
        </div>
      ))}
    </div>
  );
}
