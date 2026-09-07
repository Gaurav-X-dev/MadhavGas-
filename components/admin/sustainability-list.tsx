'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ExternalLink, MoreHorizontal, Pencil, Plus, Search, Settings2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { DataTable, type Column } from '@/components/admin/data-table';
import { EmptyState } from '@/components/admin/empty-state';
import { PageHeader } from '@/components/admin/page-header';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePersistentSingleton } from '@/hooks/use-persistent-data';
import { sustainabilityContent as fallback } from '@/lib/mock-data';
import type { SustainabilityCard, SustainabilityContent } from '@/lib/types';

async function persist(content: SustainabilityContent) {
  const response = await fetch('/api/admin/settings/sustainability', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(content),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Unable to update Sustainability content');
}

export function SustainabilityList() {
  const [content, setContent, loading] = usePersistentSingleton<SustainabilityContent>('sustainability', fallback);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...content.cards]
      .filter((card) => (!term || `${card.title} ${card.description} ${card.icon}`.toLowerCase().includes(term)) && (status === 'all' || (status === 'published') === card.published))
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [content.cards, search, status]);

  const columns: Column<SustainabilityCard>[] = [
    {
      key: 'content',
      header: 'Content',
      render: (card) => (
        <div className="flex min-w-[280px] items-center gap-3">
          <div className="grid h-12 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border bg-emerald-50 text-xs font-bold text-emerald-700">
            {card.imageUrl ? <img src={card.imageUrl} alt="" className="h-full w-full object-cover" /> : card.icon.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{card.title}</p><p className="max-w-xl truncate text-xs text-muted-foreground">{card.description}</p></div>
        </div>
      ),
    },
    { key: 'icon', header: 'Icon', render: (card) => <span className="text-sm text-muted-foreground">{card.icon}</span> },
    { key: 'order', header: 'Order', render: (card) => <span className="text-sm text-muted-foreground">#{card.displayOrder}</span> },
    { key: 'status', header: 'Status', render: (card) => <StatusBadge status={card.published ? 'Published' : 'Draft'} /> },
    {
      key: 'actions', header: 'Actions', className: 'w-20 text-right', render: (card) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${card.title}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem asChild><Link href="/sustainability" target="_blank"><ExternalLink className="mr-2 h-4 w-4" />View</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href={`/admin/sustainability/${encodeURIComponent(card.id)}/edit`}><Pencil className="mr-2 h-4 w-4" />Edit</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleteId(card.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const removeCard = async () => {
    if (!deleteId) return;
    const next = { ...content, cards: content.cards.filter((card) => card.id !== deleteId) };
    try {
      await persist(next);
      setContent(next);
      toast.success('Sustainability card deleted');
      setDeleteId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to delete card');
    }
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="Sustainability" description="Manage responsible-operations stories, public feature cards and page content.">
        <Button variant="outline" asChild><Link href="/admin/sustainability/settings"><Settings2 className="mr-2 h-4 w-4" />Page Content</Link></Button>
        <Button asChild><Link href="/admin/sustainability/new"><Plus className="mr-2 h-4 w-4" />Add Sustainability Item</Link></Button>
      </PageHeader>
      <Card className="mb-5 shadow-sm"><CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_230px]">
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search sustainability content…" className="pl-9" /></div>
        <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue placeholder="Filter status" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="published">Published</SelectItem><SelectItem value="draft">Draft</SelectItem></SelectContent></Select>
      </CardContent></Card>
      {loading ? <div className="h-48 animate-pulse rounded-xl border bg-card" /> : content.cards.length === 0 ? <Card><EmptyState title="No sustainability items yet" description="Add the first factual practice to build the public Sustainability page." action={<Button asChild><Link href="/admin/sustainability/new"><Plus className="mr-2 h-4 w-4" />Add Sustainability Item</Link></Button>} /></Card> : <DataTable columns={columns} data={rows} rowKey={(card) => card.id} emptyTitle="No matching sustainability items" emptyDescription="Adjust the search or status filter." />}
      <ConfirmDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)} title="Delete sustainability item?" description="This permanently removes the item from the database and public page." confirmLabel="Delete" onConfirm={removeCard} />
    </div>
  );
}
