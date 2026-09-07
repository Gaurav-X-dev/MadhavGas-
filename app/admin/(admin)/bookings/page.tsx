'use client';

import { useState, useMemo } from 'react';
import { Search, Eye, RefreshCw, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/admin/page-header';
import { DataTable, type Column } from '@/components/admin/data-table';
import { StatusBadge } from '@/components/admin/status-badge';
import { FormDrawer } from '@/components/admin/form-drawer';
import { usePersistentCollection } from '@/hooks/use-persistent-data';
import type { Booking, BookingStatus } from '@/lib/types';

const statuses: BookingStatus[] = ['New', 'Confirmed', 'Processing', 'Delivered', 'Cancelled'];

export default function BookingsPage() {
  const [items, setItems] = usePersistentCollection<Booking>('bookings', []);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(8);
  const [viewBooking, setViewBooking] = useState<Booking | null>(null);
  const [statusModal, setStatusModal] = useState<Booking | null>(null);
  const [newStatus, setNewStatus] = useState<BookingStatus>('New');
  const [noteText, setNoteText] = useState('');

  const filtered = useMemo(() => {
    return items.filter((b) => {
      const matchesSearch =
        b.id.toLowerCase().includes(search.toLowerCase()) ||
        b.customerName.toLowerCase().includes(search.toLowerCase()) ||
        (b.businessName ?? '').toLowerCase().includes(search.toLowerCase()) ||
        b.phone.toLowerCase().includes(search.toLowerCase()) ||
        b.email.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      const matchesSource = sourceFilter === 'all' || b.source === sourceFilter;
      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [items, search, statusFilter, sourceFilter]);

  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const updateStatus = (id: string, status: BookingStatus) => {
    setItems((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    setViewBooking((vb) => (vb && vb.id === id ? { ...vb, status } : vb));
  };

  const addNote = (id: string) => {
    if (!noteText.trim()) return;
    setItems((prev) => prev.map((b) => (b.id === id ? { ...b, notes: [...b.notes, noteText] } : b)));
    setViewBooking((vb) => (vb && vb.id === id ? { ...vb, notes: [...vb.notes, noteText] } : vb));
    setNoteText('');
  };

  const columns: Column<Booking>[] = [
    { key: 'id', header: 'Booking ID', render: (b) => <span className="font-mono text-sm font-medium">{b.id}</span> },
    {
      key: 'customer',
      header: 'Customer',
      render: (b) => (
        <div>
          <p className="text-sm font-medium text-foreground">{b.customerName}</p>
          {b.businessName && <p className="text-xs text-muted-foreground">{b.businessName}</p>}
        </div>
      ),
    },
    { key: 'cylinder', header: 'Cylinder', render: (b) => <span className="text-sm">{b.cylinderType}</span> },
    { key: 'qty', header: 'Qty', render: (b) => <span className="text-sm font-medium">{b.quantity}</span> },
    { key: 'area', header: 'Area', render: (b) => <span className="text-sm text-muted-foreground">{b.deliveryArea}</span> },
    { key: 'source', header: 'Source', render: (b) => <span className="text-sm">{b.source}</span> },
    {
      key: 'date',
      header: 'Date',
      render: (b) => <span className="text-xs text-muted-foreground">{new Date(b.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>,
    },
    { key: 'status', header: 'Status', render: (b) => <StatusBadge status={b.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (b) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setViewBooking(b); }}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setStatusModal(b); setNewStatus(b.status); }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="Bookings" description="Manage customer LPG cylinder orders stored in the live database." />

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by ID or customer..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(0); }}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="Website">Website</SelectItem>
              <SelectItem value="QR">QR</SelectItem>
              <SelectItem value="WhatsApp">WhatsApp</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={paginated}
        rowKey={(b) => b.id}
        onRowClick={(b) => setViewBooking(b)}
        emptyTitle="No bookings found"
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
        open={!!viewBooking}
        onOpenChange={(o) => !o && setViewBooking(null)}
        title="Booking Details"
        description={viewBooking?.id}
      >
        {viewBooking && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-semibold">{viewBooking.id}</span>
              <StatusBadge status={viewBooking.status} />
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><Label className="text-xs text-muted-foreground">Customer</Label><p className="font-medium">{viewBooking.customerName}</p></div>
              <div><Label className="text-xs text-muted-foreground">Business</Label><p className="font-medium">{viewBooking.businessName || '—'}</p></div>
              <div><Label className="text-xs text-muted-foreground">Phone</Label><p className="font-medium">{viewBooking.phone}</p></div>
              <div><Label className="text-xs text-muted-foreground">Email</Label><p className="break-all font-medium">{viewBooking.email || '—'}</p></div>
              <div><Label className="text-xs text-muted-foreground">Source</Label><p className="font-medium">{viewBooking.source}</p></div>
              <div><Label className="text-xs text-muted-foreground">Cylinder</Label><p className="font-medium">{viewBooking.cylinderType}</p></div>
              <div><Label className="text-xs text-muted-foreground">Quantity</Label><p className="font-medium">{viewBooking.quantity}</p></div>
              <div><Label className="text-xs text-muted-foreground">Delivery area</Label><p className="font-medium">{viewBooking.deliveryArea}</p></div>
              <div><Label className="text-xs text-muted-foreground">Date</Label><p className="font-medium">{new Date(viewBooking.date).toLocaleString('en-IN')}</p></div>
            </div>
            <Separator />
            <div>
              <Label className="mb-2 flex items-center gap-1.5"><StickyNote className="h-3.5 w-3.5" /> Notes</Label>
              {viewBooking.notes.length > 0 ? (
                <div className="space-y-2">
                  {viewBooking.notes.map((n, i) => (
                    <div key={i} className="rounded-md bg-muted/50 p-3 text-sm text-foreground">{n}</div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No notes yet.</p>
              )}
              <div className="mt-3 flex gap-2">
                <Input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note..." onKeyDown={(e) => e.key === 'Enter' && addNote(viewBooking.id)} />
                <Button onClick={() => addNote(viewBooking.id)}>Add</Button>
              </div>
            </div>
            <Button className="w-full" onClick={() => { setStatusModal(viewBooking); setNewStatus(viewBooking.status); }}>
                  <RefreshCw className="mr-2 h-4 w-4" />
              Update status
            </Button>
          </div>
        )}
      </FormDrawer>

      <Dialog open={!!statusModal} onOpenChange={(o) => !o && setStatusModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Booking Status</DialogTitle>
            <DialogDescription>Change the status for {statusModal?.id}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>New status</Label>
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as BookingStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusModal(null)}>Cancel</Button>
            <Button onClick={() => { if (statusModal) updateStatus(statusModal.id, newStatus); setStatusModal(null); }}>
              Update status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
