'use client';

import { useEffect, useState } from 'react';
import { Mail, RefreshCw, Search, UsersRound } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { NewsletterComposer } from '@/components/admin/newsletter-composer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { NewsletterSubscriber } from '@/lib/types';
import { toast } from 'sonner';

export default function NewsletterPage() {
  const [items, setItems] = useState<NewsletterSubscriber[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ q: search.trim(), status });
        const response = await fetch(`/api/admin/newsletter?${params}`, { cache: 'no-store', signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load newsletter subscribers');
        setItems(result.items || []);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') return;
        setError(loadError instanceof Error ? loadError.message : 'Unable to load newsletter subscribers');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [reload, search, status]);

  const updateStatus = async (subscriber: NewsletterSubscriber) => {
    try {
      const response = await fetch('/api/admin/newsletter', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: subscriber.id, active: !subscriber.active }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to update subscriber');
      setItems((current) => current.map((item) => item.id === subscriber.id ? { ...item, active: !item.active, unsubscribedAt: item.active ? new Date().toISOString() : null } : item));
      toast.success(subscriber.active ? 'Subscriber marked as unsubscribed' : 'Subscriber reactivated');
    } catch (updateError) {
      toast.error(updateError instanceof Error ? updateError.message : 'Unable to update subscriber');
    }
  };

  const activeCount = items.filter((item) => item.active).length;

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="Newsletter" description="Write and send updates, and manage database-backed subscriptions.">
        <Button variant="outline" onClick={() => setReload((value) => value + 1)}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </PageHeader>

      <Tabs defaultValue="subscribers" className="space-y-5">
        <div className="overflow-x-auto rounded-xl border bg-card p-2 shadow-sm">
          <TabsList className="grid h-auto min-w-[380px] grid-cols-2 bg-muted/70">
            <TabsTrigger value="subscribers" className="py-2.5">Subscribers</TabsTrigger>
            <TabsTrigger value="compose" className="py-2.5">Compose &amp; Send</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="compose" className="mt-0">
          <NewsletterComposer activeCount={activeCount} onSent={() => setReload((value) => value + 1)} />
        </TabsContent>

        <TabsContent value="subscribers" className="mt-0">

      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_210px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search subscriber email" className="pl-9" aria-label="Search subscribers" />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger aria-label="Subscriber status filter"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Subscribers</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="unsubscribed">Unsubscribed</SelectItem></SelectContent>
            </Select>
            <Button variant="ghost" onClick={() => { setSearch(''); setStatus('all'); }}>Clear Filters</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4 overflow-hidden">
        {loading ? (
          <CardContent className="space-y-3 p-6">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-14 w-full" />)}</CardContent>
        ) : error ? (
          <CardContent className="grid place-items-center gap-3 p-10 text-center" role="alert"><Mail className="h-8 w-8 text-destructive" /><p className="font-semibold">Subscriber list could not be loaded</p><p className="text-sm text-muted-foreground">{error}</p><Button variant="outline" onClick={() => setReload((value) => value + 1)}>Try Again</Button></CardContent>
        ) : items.length === 0 ? (
          <CardContent className="grid place-items-center gap-2 p-12 text-center"><UsersRound className="h-9 w-9 text-muted-foreground" /><p className="font-semibold">No matching subscribers</p><p className="text-sm text-muted-foreground">New website subscriptions will appear here.</p></CardContent>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3">Email</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Subscribed</th><th className="px-5 py-3">Confirmation</th><th className="px-5 py-3 text-right">Action</th></tr></thead>
                <tbody>{items.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="px-5 py-4 font-medium">{item.email}</td><td className="px-5 py-4"><Badge variant={item.active ? 'default' : 'secondary'}>{item.active ? 'Active' : 'Unsubscribed'}</Badge></td><td className="px-5 py-4 text-muted-foreground">{new Date(item.subscribedAt).toLocaleString('en-IN')}</td><td className="px-5 py-4"><Badge variant="outline">{item.lastMailStatus}</Badge></td><td className="px-5 py-4 text-right"><Button size="sm" variant="outline" onClick={() => updateStatus(item)}>{item.active ? 'Unsubscribe' : 'Reactivate'}</Button></td></tr>)}</tbody>
              </table>
            </div>
            <div className="divide-y md:hidden">{items.map((item) => <article key={item.id} className="space-y-3 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="break-all font-medium">{item.email}</p><Badge variant={item.active ? 'default' : 'secondary'}>{item.active ? 'Active' : 'Unsubscribed'}</Badge></div><div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground"><span>Subscribed {new Date(item.subscribedAt).toLocaleDateString('en-IN')}</span><span>Email: {item.lastMailStatus}</span></div><Button size="sm" variant="outline" onClick={() => updateStatus(item)}>{item.active ? 'Unsubscribe' : 'Reactivate'}</Button></article>)}</div>
          </>
        )}
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
