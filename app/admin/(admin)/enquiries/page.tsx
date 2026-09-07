'use client';

import { useState, useMemo } from 'react';
import { Search, Eye, StickyNote, User } from 'lucide-react';
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
import { FormDrawer } from '@/components/admin/form-drawer';
import { usePersistentCollection } from '@/hooks/use-persistent-data';
import type { Enquiry, EnquiryStatus, EnquiryPriority } from '@/lib/types';

const staffList = ['Rajesh Sharma', 'Priya Admin', 'Support Team'];
const priorities: EnquiryPriority[] = ['Low', 'Medium', 'High', 'Urgent'];
const statuses: EnquiryStatus[] = ['Open', 'In Progress', 'Resolved', 'Closed'];

export default function EnquiriesPage() {
  const [items, setItems] = usePersistentCollection<Enquiry>('enquiries', []);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(8);
  const [viewEnquiry, setViewEnquiry] = useState<Enquiry | null>(null);
  const [noteText, setNoteText] = useState('');
  const [assignStaff, setAssignStaff] = useState<string>('');

  const filtered = useMemo(() => {
    return items.filter((e) => {
      const matchesSearch =
        e.id.toLowerCase().includes(search.toLowerCase()) ||
        e.customerName.toLowerCase().includes(search.toLowerCase()) ||
        e.subject.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || e.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [items, search, statusFilter, priorityFilter]);

  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const addNote = (id: string) => {
    if (!noteText.trim()) return;
    setItems((prev) => prev.map((e) => (e.id === id ? { ...e, internalNotes: [...e.internalNotes, noteText] } : e)));
    setViewEnquiry((ve) => (ve && ve.id === id ? { ...ve, internalNotes: [...ve.internalNotes, noteText] } : ve));
    setNoteText('');
  };

  const updateAssignment = (id: string, staff: string) => {
    setItems((prev) => prev.map((e) => (e.id === id ? { ...e, assignedStaff: staff } : e)));
    setViewEnquiry((ve) => (ve && ve.id === id ? { ...ve, assignedStaff: staff } : ve));
  };

  const columns: Column<Enquiry>[] = [
    { key: 'id', header: 'Enquiry ID', render: (e) => <span className="font-mono text-sm font-medium">{e.id}</span> },
    {
      key: 'customer',
      header: 'Customer',
      render: (e) => (
        <div>
          <p className="text-sm font-medium text-foreground">{e.customerName}</p>
          <p className="text-xs text-muted-foreground">{e.enquiryType}</p>
        </div>
      ),
    },
    { key: 'subject', header: 'Subject', render: (e) => <span className="text-sm text-muted-foreground line-clamp-1">{e.subject}</span> },
    { key: 'assigned', header: 'Assigned', render: (e) => <span className="text-sm">{e.assignedStaff}</span> },
    { key: 'priority', header: 'Priority', render: (e) => <StatusBadge status={e.priority} /> },
    { key: 'status', header: 'Status', render: (e) => <StatusBadge status={e.status} /> },
    {
      key: 'actions',
      header: '',
      render: (e) => (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(ev) => { ev.stopPropagation(); setViewEnquiry(e); }}>
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="Enquiries" description="Manage customer enquiries and assign staff." />

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search enquiries..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(0); }}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priority</SelectItem>
              {priorities.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={paginated}
        rowKey={(e) => e.id}
        onRowClick={(e) => setViewEnquiry(e)}
        emptyTitle="No enquiries found"
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
        open={!!viewEnquiry}
        onOpenChange={(o) => !o && setViewEnquiry(null)}
        title="Enquiry Details"
        description={viewEnquiry?.id}
      >
        {viewEnquiry && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={viewEnquiry.status} />
              <StatusBadge status={viewEnquiry.priority} />
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><Label className="text-xs text-muted-foreground">Customer</Label><p className="font-medium">{viewEnquiry.customerName}</p></div>
              <div><Label className="text-xs text-muted-foreground">Type</Label><p className="font-medium">{viewEnquiry.enquiryType}</p></div>
              <div><Label className="text-xs text-muted-foreground">Email</Label><p className="font-medium">{viewEnquiry.email}</p></div>
              <div><Label className="text-xs text-muted-foreground">Phone</Label><p className="font-medium">{viewEnquiry.phone}</p></div>
              <div><Label className="text-xs text-muted-foreground">Date</Label><p className="font-medium">{new Date(viewEnquiry.date).toLocaleString('en-IN')}</p></div>
            </div>
            <Separator />
            <div>
              <Label className="text-xs text-muted-foreground">Subject</Label>
              <p className="font-medium">{viewEnquiry.subject}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Message</Label>
              <div className="rounded-md bg-muted/50 p-3 text-sm text-foreground">{viewEnquiry.message}</div>
            </div>
            <Separator />
            <div>
              <Label className="mb-2 flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Assigned staff</Label>
              <Select value={assignStaff || viewEnquiry.assignedStaff} onValueChange={(v) => { setAssignStaff(v); updateAssignment(viewEnquiry.id, v); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {staffList.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div>
              <Label className="mb-2 flex items-center gap-1.5"><StickyNote className="h-3.5 w-3.5" /> Internal notes</Label>
              {viewEnquiry.internalNotes.length > 0 ? (
                <div className="space-y-2">
                  {viewEnquiry.internalNotes.map((n, i) => (
                    <div key={i} className="rounded-md bg-muted/50 p-3 text-sm text-foreground">{n}</div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No internal notes yet.</p>
              )}
              <div className="mt-3 flex gap-2">
                <Input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add internal note..." onKeyDown={(ev) => ev.key === 'Enter' && addNote(viewEnquiry.id)} />
                <Button onClick={() => addNote(viewEnquiry.id)}>Add</Button>
              </div>
            </div>
          </div>
        )}
      </FormDrawer>
    </div>
  );
}
