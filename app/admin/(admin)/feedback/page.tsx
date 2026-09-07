'use client';

import { useState, useMemo } from 'react';
import { Search, Star, Reply, CheckCircle2, Trash2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/admin/page-header';
import { DataTable, type Column } from '@/components/admin/data-table';
import { StatusBadge } from '@/components/admin/status-badge';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { FormDrawer } from '@/components/admin/form-drawer';
import { usePersistentCollection } from '@/hooks/use-persistent-data';
import type { Feedback, FeedbackStatus } from '@/lib/types';

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < rating ? 'fill-brand-yellow text-brand-yellow' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  );
}

export default function FeedbackPage() {
  const [items, setItems] = usePersistentCollection<Feedback>('feedback', []);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(8);
  const [replyItem, setReplyItem] = useState<Feedback | null>(null);
  const [replyText, setReplyText] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return items.filter((f) => {
      const matchesSearch =
        f.customerName.toLowerCase().includes(search.toLowerCase()) ||
        f.message.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
      const matchesType = typeFilter === 'all' || f.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [items, search, statusFilter, typeFilter]);

  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const resolve = (id: string) => {
    setItems((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'Resolved' } : f)));
  };

  const sendReply = () => {
    if (!replyText.trim() || !replyItem) return;
    setItems((prev) => prev.map((f) => (f.id === replyItem.id ? { ...f, reply: replyText, status: 'Reviewed' } : f)));
    setReplyItem(null);
    setReplyText('');
  };

  const deleteFeedback = () => {
    if (!deleteId) return;
    setItems((prev) => prev.filter((f) => f.id !== deleteId));
    setDeleteId(null);
  };

  const columns: Column<Feedback>[] = [
    { key: 'id', header: 'ID', render: (f) => <span className="font-mono text-sm font-medium">{f.id}</span> },
    {
      key: 'customer',
      header: 'Customer',
      render: (f) => (
        <div>
          <p className="text-sm font-medium text-foreground">{f.customerName}</p>
          <p className="text-xs text-muted-foreground">{f.type}</p>
        </div>
      ),
    },
    { key: 'rating', header: 'Rating', render: (f) => <StarRating rating={f.rating} /> },
    { key: 'message', header: 'Message', render: (f) => <span className="text-sm text-muted-foreground line-clamp-1 max-w-xs">{f.message}</span> },
    { key: 'date', header: 'Date', render: (f) => <span className="text-xs text-muted-foreground">{new Date(f.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span> },
    { key: 'status', header: 'Status', render: (f) => <StatusBadge status={f.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (f) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setReplyItem(f); setReplyText(f.reply ?? ''); }}>
            <Reply className="h-4 w-4" />
          </Button>
          {f.status !== 'Resolved' && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-success" onClick={(e) => { e.stopPropagation(); resolve(f.id); }}>
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(f.id); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="Feedback & Complaints" description="Manage customer feedback, ratings, and complaints." />

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search feedback..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="Reviewed">Reviewed</SelectItem>
              <SelectItem value="Resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="Feedback">Feedback</SelectItem>
              <SelectItem value="Complaint">Complaint</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={paginated}
        rowKey={(f) => f.id}
        onRowClick={(f) => { setReplyItem(f); setReplyText(f.reply ?? ''); }}
        emptyTitle="No feedback found"
      />

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      <FormDrawer
        open={!!replyItem}
        onOpenChange={(o) => !o && setReplyItem(null)}
        title="Review Feedback"
        description={replyItem?.id}
        onSubmit={sendReply}
        submitLabel="Save internal reply"
      >
        {replyItem && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <StarRating rating={replyItem.rating} />
              <StatusBadge status={replyItem.status} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><Label className="text-xs text-muted-foreground">Customer</Label><p className="font-medium">{replyItem.customerName}</p></div>
              <div><Label className="text-xs text-muted-foreground">Type</Label><p className="font-medium">{replyItem.type}</p></div>
              <div><Label className="text-xs text-muted-foreground">Email</Label><p className="font-medium">{replyItem.email}</p></div>
              <div><Label className="text-xs text-muted-foreground">Phone</Label><p className="font-medium">{replyItem.phone}</p></div>
            </div>
            <Separator />
            <div>
              <Label className="text-xs text-muted-foreground">Message</Label>
              <div className="rounded-md bg-muted/50 p-3 text-sm text-foreground">{replyItem.message}</div>
            </div>
            {replyItem.reply && (
              <div>
                <Label className="text-xs text-muted-foreground">Previous reply</Label>
                <div className="rounded-md border border-brand-blue/20 bg-brand-blue/5 p-3 text-sm text-foreground">{replyItem.reply}</div>
              </div>
            )}
            <Separator />
            <div className="space-y-1.5">
              <Label>Internal response <span className="text-destructive">*</span></Label>
              <Textarea rows={4} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Record the agency's response..." />
            </div>
          </div>
        )}
      </FormDrawer>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete feedback?"
        description="This will permanently remove the feedback record. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={deleteFeedback}
      />
    </div>
  );
}
