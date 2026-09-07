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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePersistentSingleton } from '@/hooks/use-persistent-data';
import { localDiscoveryContent as fallback } from '@/lib/mock-data';
import type { LocalDiscoveryContent, LocalDiscoveryGroup, LocalDiscoveryItem } from '@/lib/types';

const groupLabels: Record<LocalDiscoveryGroup, string> = { localities: 'Localities', categories: 'Categories', topics: 'Topics' };

async function persist(content: LocalDiscoveryContent) {
  const response = await fetch('/api/admin/settings/local-discovery', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(content) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Unable to update Local LPG Information');
}

export function LocalDiscoveryList() {
  const [content, setContent, loading] = usePersistentSingleton<LocalDiscoveryContent>('local-discovery', fallback);
  const [group, setGroup] = useState<LocalDiscoveryGroup>('localities');
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...content[group]].filter((item) => !term || `${item.label} ${item.href}`.toLowerCase().includes(term)).sort((a, b) => a.displayOrder - b.displayOrder);
  }, [content, group, search]);

  const columns: Column<LocalDiscoveryItem>[] = [
    { key: 'label', header: 'Label', render: (item) => <div className="min-w-[220px]"><p className="text-sm font-semibold">{item.label}</p><p className="mt-0.5 max-w-lg truncate text-xs text-muted-foreground">{item.href}</p></div> },
    { key: 'group', header: 'Section', render: () => <span className="text-sm text-muted-foreground">{groupLabels[group]}</span> },
    { key: 'order', header: 'Order', render: (item) => <span className="text-sm text-muted-foreground">#{item.displayOrder}</span> },
    { key: 'status', header: 'Status', render: (item) => <StatusBadge status={item.active ? 'Active' : 'Inactive'} /> },
    { key: 'actions', header: 'Actions', className: 'w-20 text-right', render: (item) => <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${item.label}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-40"><DropdownMenuItem asChild><Link href={item.href} target="_blank"><ExternalLink className="mr-2 h-4 w-4" />View</Link></DropdownMenuItem><DropdownMenuItem asChild><Link href={`/admin/local-information/${group}/${encodeURIComponent(item.id)}/edit`}><Pencil className="mr-2 h-4 w-4" />Edit</Link></DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleteId(item.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu> },
  ];

  const remove = async () => {
    if (!deleteId) return;
    const next = { ...content, [group]: content[group].filter((item) => item.id !== deleteId) };
    try { await persist(next); setContent(next); setDeleteId(null); toast.success(`${groupLabels[group].slice(0, -1)} deleted`); } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to delete item'); }
  };

  return <div className="animate-fade-in-up">
    <PageHeader title="Local LPG Information" description="Manage nearby localities, LPG categories and useful topics as separate structured records.">
      <Button variant="outline" asChild><Link href="/admin/local-information/settings"><Settings2 className="mr-2 h-4 w-4" />Section Copy</Link></Button>
      <Button asChild><Link href={`/admin/local-information/${group}/new`}><Plus className="mr-2 h-4 w-4" />Add {groupLabels[group].slice(0, -1)}</Link></Button>
    </PageHeader>
    <Tabs value={group} onValueChange={(value) => setGroup(value as LocalDiscoveryGroup)}>
      <div className="mb-5 flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <TabsList className="grid h-auto w-full grid-cols-3 md:w-[430px]">{(Object.keys(groupLabels) as LocalDiscoveryGroup[]).map((key) => <TabsTrigger key={key} value={key} className="py-2">{groupLabels[key]} <span className="ml-1.5 text-xs opacity-60">{content[key].length}</span></TabsTrigger>)}</TabsList>
        <div className="relative w-full md:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${groupLabels[group].toLowerCase()}…`} className="pl-9" /></div>
      </div>
      {(Object.keys(groupLabels) as LocalDiscoveryGroup[]).map((key) => <TabsContent key={key} value={key} className="mt-0">{loading ? <div className="h-48 animate-pulse rounded-xl border bg-card" /> : content[key].length === 0 ? <Card><EmptyState title={`No ${groupLabels[key].toLowerCase()} yet`} description={`Add structured ${groupLabels[key].toLowerCase()} for the public discovery section.`} action={<Button asChild><Link href={`/admin/local-information/${key}/new`}><Plus className="mr-2 h-4 w-4" />Add {groupLabels[key].slice(0, -1)}</Link></Button>} /></Card> : <DataTable columns={columns} data={key === group ? rows : content[key]} rowKey={(item) => item.id} emptyTitle={`No matching ${groupLabels[key].toLowerCase()}`} emptyDescription="Adjust your search to see more records." />}</TabsContent>)}
    </Tabs>
    <ConfirmDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)} title="Delete Local LPG item?" description="This removes the record from the database and public discovery section." confirmLabel="Delete" onConfirm={remove} />
  </div>;
}
