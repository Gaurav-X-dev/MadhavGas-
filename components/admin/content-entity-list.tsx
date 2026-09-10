'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ExternalLink, MoreHorizontal, Pencil, Plus, Search, Settings2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { DataTable, type Column } from '@/components/admin/data-table';
import { EmptyState } from '@/components/admin/empty-state';
import { PageHeader } from '@/components/admin/page-header';
import { StatusBadge } from '@/components/admin/status-badge';
import { useCurrentUser, usePersistentCollection } from '@/hooks/use-persistent-data';
import { achievements, galleryItems, journeyMilestones, products } from '@/lib/mock-data';
import type { Achievement, GalleryItem, JourneyMilestone, Product } from '@/lib/types';

export type ContentEntityKind = 'products' | 'gallery' | 'journey' | 'achievements';
type ContentEntity = Product | GalleryItem | JourneyMilestone | Achievement;

const configs = {
  products: { title: 'Products', singular: 'Product', description: 'Manage the LPG cylinder catalog shown on the public website.', publicHref: '/products', fallback: products as ContentEntity[] },
  gallery: { title: 'Gallery', singular: 'Media Item', description: 'Manage published images and video references through focused content pages.', publicHref: '/gallery', fallback: galleryItems as ContentEntity[] },
  journey: { title: 'Journey', singular: 'Journey Item', description: 'Manage Bharatgas and Madhav Bharat Gas milestones as two distinct journey tracks.', publicHref: '/journey', fallback: journeyMilestones as ContentEntity[] },
  achievements: { title: 'Achievements', singular: 'Achievement', description: 'Manage factual MBGA and Bharatgas achievements and recognitions.', publicHref: '/achievements', fallback: achievements as ContentEntity[] },
} as const;

function titleFor(kind: ContentEntityKind, item: ContentEntity) {
  if (kind === 'products') return (item as Product).name;
  if (kind === 'gallery') return (item as GalleryItem).caption;
  return (item as JourneyMilestone | Achievement).title;
}

function descriptionFor(kind: ContentEntityKind, item: ContentEntity) {
  if (kind === 'gallery') return (item as GalleryItem).altText;
  return 'description' in item ? item.description : '';
}

function imageFor(kind: ContentEntityKind, item: ContentEntity) {
  if (kind === 'products') return (item as Product).image;
  if (kind === 'gallery') return (item as GalleryItem).type === 'Image' ? (item as GalleryItem).url : '';
  return (item as JourneyMilestone | Achievement).imageUrl;
}

function typeFor(kind: ContentEntityKind, item: ContentEntity) {
  if (kind === 'products') return `${(item as Product).category} · ${(item as Product).cylinderCapacity}`;
  if (kind === 'gallery') return `${(item as GalleryItem).type} · ${(item as GalleryItem).category}`;
  if (kind === 'journey') return (item as JourneyMilestone).brand === 'MBGA' ? 'Madhav Bharat Gas' : 'Bharatgas';
  return `${(item as Achievement).type} · ${(item as Achievement).brand}`;
}

function statusFor(kind: ContentEntityKind, item: ContentEntity) {
  if (kind === 'products') return (item as Product).archived ? 'Archived' : (item as Product).availability;
  if (kind === 'gallery') return (item as GalleryItem).status;
  return (item as JourneyMilestone | Achievement).published ? 'Published' : 'Draft';
}

function orderFor(item: ContentEntity) {
  return 'displayOrder' in item ? item.displayOrder : null;
}

export function ContentEntityList({ kind }: { kind: ContentEntityKind }) {
  const config = configs[kind];
  const [items, setItems, loading] = usePersistentCollection<ContentEntity>(kind, [...config.fallback]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const currentUser = useCurrentUser();
  const canEdit = currentUser.role === 'Super Admin' || currentUser.role === 'Editor';

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...items]
      .filter((item) => {
        const searchable = `${titleFor(kind, item)} ${descriptionFor(kind, item)} ${typeFor(kind, item)} ${statusFor(kind, item)}`.toLowerCase();
        const filterValue = kind === 'journey' ? (item as JourneyMilestone).brand : statusFor(kind, item);
        return (!term || searchable.includes(term)) && (filter === 'all' || filterValue === filter);
      })
      .sort((a, b) => (orderFor(a) ?? 0) - (orderFor(b) ?? 0));
  }, [filter, items, kind, search]);

  const columns: Column<ContentEntity>[] = [
    {
      key: 'content', header: 'Content', render: (item) => {
        const image = imageFor(kind, item);
        return <div className="flex min-w-[260px] items-center gap-3"><div className="h-11 w-14 shrink-0 overflow-hidden rounded-lg border bg-muted">{image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-to-br from-brand-blue/10 to-brand-yellow/20" />}</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{titleFor(kind, item)}</p><p className="max-w-lg truncate text-xs text-muted-foreground">{descriptionFor(kind, item)}</p></div></div>;
      },
    },
    { key: 'type', header: kind === 'journey' ? 'Journey Type' : 'Type', render: (item) => <span className="text-sm text-foreground">{typeFor(kind, item)}</span> },
    { key: 'status', header: 'Status', render: (item) => <StatusBadge status={statusFor(kind, item)} /> },
    { key: 'order', header: 'Order', render: (item) => <span className="text-sm text-muted-foreground">{orderFor(item) === null ? '—' : `#${orderFor(item)}`}</span> },
    ...(canEdit ? [{
      key: 'actions', header: 'Actions', className: 'w-20 text-right', render: (item) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${titleFor(kind, item)}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem asChild><Link href={config.publicHref} target="_blank"><ExternalLink className="mr-2 h-4 w-4" />View</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href={`/admin/${kind}/${encodeURIComponent(item.id)}/edit`}><Pencil className="mr-2 h-4 w-4" />Edit</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleteId(item.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    } as Column<ContentEntity>] : []),
  ];

  const filterOptions = kind === 'journey'
    ? [{ value: 'MBGA', label: 'Madhav Bharat Gas' }, { value: 'Bharatgas', label: 'Bharatgas' }]
    : kind === 'products'
      ? ['In Stock', 'Limited', 'Out of Stock', 'Archived'].map((value) => ({ value, label: value }))
      : ['Published', 'Draft'].map((value) => ({ value, label: value }));

  const removeItem = () => {
    if (!deleteId) return;
    setItems((current) => current.filter((item) => item.id !== deleteId));
    setDeleteId(null);
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader title={config.title} description={config.description}>
        {canEdit && <Button variant="outline" asChild><Link href={`/admin/${kind}/settings`}><Settings2 className="mr-2 h-4 w-4" />Page Content</Link></Button>}
        {canEdit && <Button asChild><Link href={`/admin/${kind}/new`}><Plus className="mr-2 h-4 w-4" />Add {config.singular}</Link></Button>}
      </PageHeader>

      <Card className="mb-5 shadow-sm">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_230px]">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${config.title.toLowerCase()}…`} className="pl-9" /></div>
          <Select value={filter} onValueChange={setFilter}><SelectTrigger><SelectValue placeholder="Filter" /></SelectTrigger><SelectContent><SelectItem value="all">All {kind === 'journey' ? 'journeys' : 'statuses'}</SelectItem>{filterOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>
        </CardContent>
      </Card>

      {loading ? <div className="h-48 animate-pulse rounded-xl border bg-card" /> : items.length === 0 ? (
        <Card><EmptyState title={`No ${config.title.toLowerCase()} yet`} description={`Add your first ${config.singular.toLowerCase()} to begin building this public section.`} action={<Button asChild><Link href={`/admin/${kind}/new`}><Plus className="mr-2 h-4 w-4" />Add {config.singular}</Link></Button>} /></Card>
      ) : (
        <DataTable columns={columns} data={filtered} rowKey={(item) => item.id} emptyTitle={`No matching ${config.title.toLowerCase()}`} emptyDescription="Adjust the search or filter to see more records." />
      )}

      <ConfirmDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)} title={`Delete ${config.singular.toLowerCase()}?`} description="This permanently removes the record from the database and public website." confirmLabel="Delete" onConfirm={removeItem} />
    </div>
  );
}
