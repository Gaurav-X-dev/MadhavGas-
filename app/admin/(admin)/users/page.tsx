'use client';

import { useState } from 'react';
import { Plus, Pencil, Search, UserCog, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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
import { permissionsMatrix } from '@/lib/mock-data';
import { useCurrentUser, usePersistentCollection } from '@/hooks/use-persistent-data';
import type { User, UserRole } from '@/lib/types';
import { toast } from 'sonner';

const roles: UserRole[] = ['Super Admin', 'Editor', 'Support Staff', 'Viewer'];

export default function UsersPage() {
  const [items, setItems] = usePersistentCollection<User>('users', []);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [formData, setFormData] = useState<{ name: string; email: string; password: string; role: UserRole; active: boolean }>({
    name: '',
    email: '',
    password: '',
    role: 'Support Staff',
    active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const currentUser = useCurrentUser();
  const canManageUsers = currentUser.role === 'Super Admin';

  const filtered = items.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditing(null);
    setFormData({ name: '', email: '', password: '', role: 'Support Staff', active: true });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setFormData({ name: u.name, email: u.email, password: '', role: u.role, active: u.active });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.name.trim()) e.name = 'Name is required';
    if (!formData.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Enter a valid email';
    else if (items.some((item) => item.id !== editing?.id && item.email.toLowerCase() === formData.email.toLowerCase())) e.email = 'This email is already in use';
    if ((!editing || formData.password) && formData.password.length < 8) e.password = 'Use at least 8 characters';
    if (editing?.role === 'Super Admin' && editing.active && (formData.role !== 'Super Admin' || !formData.active) && !items.some((item) => item.id !== editing.id && item.role === 'Super Admin' && item.active)) e.role = 'At least one active Super Admin is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (editing) {
      setItems((prev) => prev.map((u) => (u.id === editing.id ? { ...u, ...formData } : u)));
    } else {
      setItems((prev) => [...prev, { ...formData, id: crypto.randomUUID(), lastActive: 'Never' }]);
    }
    setModalOpen(false);
  };

  const toggleActive = (id: string) => {
    const target = items.find((item) => item.id === id);
    if (target?.active && target.role === 'Super Admin' && !items.some((item) => item.id !== id && item.role === 'Super Admin' && item.active)) {
      toast.error('At least one active Super Admin is required');
      return;
    }
    setItems((prev) => prev.map((u) => (u.id === id ? { ...u, active: !u.active } : u)));
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'User',
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-blue/10 text-xs font-semibold text-brand-blue">
            {u.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{u.name}</p>
            <p className="text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'role', header: 'Role', render: (u) => <StatusBadge status={u.role} /> },
    {
      key: 'status',
      header: 'Status',
      render: (u) => <StatusBadge status={u.active ? 'Active' : 'Inactive'} />,
    },
    { key: 'lastActive', header: 'Last Active', render: (u) => <span className="text-xs text-muted-foreground">{u.lastActive}</span> },
    ...(canManageUsers ? [{
      key: 'actions',
      header: '',
      render: (u) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(u); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Switch checked={u.active} onCheckedChange={() => toggleActive(u.id)} onClick={(e) => e.stopPropagation()} />
        </div>
      ),
    } as Column<User>] : []),
  ];

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="Users & Roles" description="Manage real administrator accounts and access roles.">
        {canManageUsers && <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add user
        </Button>}
      </PageHeader>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 max-w-sm" />
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(u) => u.id}
        onRowClick={canManageUsers ? (u) => openEdit(u) : undefined}
        emptyTitle="No users found"
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-brand-blue" />
            Permissions Matrix
          </CardTitle>
          <CardDescription>Configured access levels for each administrator role.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role</th>
                  <th className="p-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">View</th>
                  <th className="p-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Create</th>
                  <th className="p-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Edit</th>
                  <th className="p-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Delete</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => {
                  const perms = permissionsMatrix[role];
                  return (
                    <tr key={role} className="border-b border-border last:border-0">
                      <td className="p-3"><StatusBadge status={role} /></td>
                      <td className="p-3 text-center">{perms.view ? <span className="text-success">Yes</span> : <span className="text-muted-foreground">No</span>}</td>
                      <td className="p-3 text-center">{perms.create ? <span className="text-success">Yes</span> : <span className="text-muted-foreground">No</span>}</td>
                      <td className="p-3 text-center">{perms.edit ? <span className="text-success">Yes</span> : <span className="text-muted-foreground">No</span>}</td>
                      <td className="p-3 text-center">{perms.delete ? <span className="text-success">Yes</span> : <span className="text-muted-foreground">No</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-brand-blue" />
              {editing ? 'Edit User' : 'Add User'}
            </DialogTitle>
            <DialogDescription>{editing ? `Update ${editing.name}'s details` : 'Create a new admin user'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={formData.name} onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value }))} />
              {errors.name && <p className="text-xs font-medium text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData((d) => ({ ...d, email: e.target.value }))} />
              {errors.email && <p className="text-xs font-medium text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{editing ? 'New password (optional)' : 'Temporary password'} {!editing && <span className="text-destructive">*</span>}</Label>
              <Input type="password" value={formData.password} onChange={(e) => setFormData((d) => ({ ...d, password: e.target.value }))} placeholder={editing ? 'Leave blank to keep current password' : 'At least 8 characters'} />
              {errors.password && <p className="text-xs font-medium text-destructive">{errors.password}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData((d) => ({ ...d, role: v as UserRole }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.role && <p className="text-xs font-medium text-destructive">{errors.role}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Switch id="user-active" checked={formData.active} onCheckedChange={(v) => setFormData((d) => ({ ...d, active: v }))} />
              <Label htmlFor="user-active">Active</Label>
            </div>
          </div>
          <Separator />
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editing ? 'Save Changes' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
