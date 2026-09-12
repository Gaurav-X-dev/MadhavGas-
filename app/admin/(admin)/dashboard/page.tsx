'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ClipboardList,
  MessageSquare,
  Star,
  Package,
  Plus,
  FileText,
  QrCode,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/admin/page-header';
import { MetricCard } from '@/components/admin/metric-card';
import { StatusBadge } from '@/components/admin/status-badge';
import { ActivityFeed } from '@/components/admin/activity-feed';
import { products as initialProducts } from '@/lib/mock-data';
import { usePersistentCollection } from '@/hooks/use-persistent-data';
import type { ActivityItem, Booking, Enquiry, Feedback, Product } from '@/lib/types';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Bar, BarChart, Pie, PieChart, Cell, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';

const chartConfig = {
  bookings: { label: 'Bookings', color: 'hsl(var(--chart-1))' },
  enquiries: { label: 'Enquiries', color: 'hsl(var(--chart-2))' },
} satisfies ChartConfig;

const pieConfig = {
  New: { label: 'New', color: 'hsl(var(--chart-1))' },
  'In Progress': { label: 'In Progress', color: 'hsl(var(--chart-4))' },
  Resolved: { label: 'Resolved', color: 'hsl(var(--chart-3))' },
  Closed: { label: 'Closed', color: 'hsl(var(--muted-foreground))' },
} satisfies ChartConfig;

const quickActions = [
  { label: 'Add Product', href: '/admin/products/new', icon: Package },
  { label: 'New Booking', href: '/admin/bookings', icon: ClipboardList },
  { label: 'Update Content', href: '/admin/site-content', icon: FileText },
  { label: 'QR Settings', href: '/admin/qr-settings', icon: QrCode },
];

export default function DashboardPage() {
  const [bookings] = usePersistentCollection<Booking>('bookings', []);
  const [enquiries] = usePersistentCollection<Enquiry>('enquiries', []);
  const [feedback] = usePersistentCollection<Feedback>('feedback', []);
  const [products] = usePersistentCollection<Product>('products', initialProducts);
  const [activityFeed] = usePersistentCollection<ActivityItem>('activity', []);
  const [activityPage, setActivityPage] = useState(1);
  const activityPageSize = 10;
  const activityPageCount = Math.max(1, Math.ceil(activityFeed.length / activityPageSize));
  const safeActivityPage = Math.min(activityPage, activityPageCount);
  const pagedActivityFeed = useMemo(
    () => activityFeed.slice((safeActivityPage - 1) * activityPageSize, safeActivityPage * activityPageSize),
    [activityFeed, safeActivityPage]
  );
  const enquiryStatusData = ['Open', 'In Progress', 'Resolved', 'Closed'].map((status, index) => ({
    name: status === 'Open' ? 'New' : status,
    value: enquiries.filter((item) => item.status === status).length,
    fill: index === 0 ? 'hsl(var(--chart-1))' : index === 1 ? 'hsl(var(--chart-4))' : index === 2 ? 'hsl(var(--chart-3))' : 'hsl(var(--muted-foreground))',
  }));
  const bookingsTrendData = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - offset));
    const key = date.toISOString().slice(0, 10);
    return {
      day: date.toLocaleDateString('en-IN', { weekday: 'short' }),
      bookings: bookings.filter((item) => item.date.slice(0, 10) === key).length,
      enquiries: enquiries.filter((item) => item.date.slice(0, 10) === key).length,
    };
  });
  const recentBookings = bookings.slice(0, 5);
  const unreadFeedback = feedback.filter((f) => f.status === 'New').length;
  const pendingEnquiries = enquiries.filter((e) => e.status === 'Open' || e.status === 'In Progress').length;
  const activeProducts = products.filter((p) => !p.archived).length;
  const hasTrendData = bookings.length + enquiries.length > 0;
  const hasEnquiryData = enquiries.length > 0;

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Dashboard"
        description="Live overview of bookings, enquiries, products and agency activity."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Bookings"
          value={bookings.length}
          icon={ClipboardList}
          accent="blue"
        />
        <MetricCard
          label="Pending Enquiries"
          value={pendingEnquiries}
          icon={MessageSquare}
          accent="yellow"
        />
        <MetricCard
          label="Unread Feedback"
          value={unreadFeedback}
          icon={Star}
          accent="green"
        />
        <MetricCard
          label="Active Products"
          value={activeProducts}
          icon={Package}
          accent="red"
        />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Bookings & Enquiries Trend</CardTitle>
            <CardDescription>Recent operational trend</CardDescription>
          </CardHeader>
          <CardContent>
            {hasTrendData ? (
            <ChartContainer config={chartConfig} className="h-72 w-full">
              <BarChart data={bookingsTrendData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="bookings" fill="var(--color-bookings)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="enquiries" fill="var(--color-enquiries)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
            ) : <div className="grid h-72 place-items-center rounded-lg border border-dashed text-center"><div><TrendingUp className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 text-sm font-semibold">No activity yet</p><p className="mt-1 text-xs text-muted-foreground">Booking and enquiry trends appear after the first submissions.</p></div></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enquiry Status</CardTitle>
            <CardDescription>Current enquiry breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {hasEnquiryData ? (
            <>
            <ChartContainer config={pieConfig} className="mx-auto h-72">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                <Pie
                  data={enquiryStatusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {enquiryStatusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="mt-3 flex flex-wrap justify-center gap-3">
              {enquiryStatusData.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.fill }} />
                  <span className="text-xs text-muted-foreground">{s.name}: {s.value}</span>
                </div>
              ))}
            </div>
            </>
            ) : <div className="grid h-72 place-items-center rounded-lg border border-dashed text-center"><div><MessageSquare className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 text-sm font-semibold">No enquiries yet</p><p className="mt-1 text-xs text-muted-foreground">Status distribution appears after an enquiry is submitted.</p></div></div>}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Bookings</CardTitle>
              <CardDescription>Latest customer orders</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/bookings">
                View all
                <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentBookings.length === 0 && <div className="rounded-lg border border-dashed p-8 text-center"><ClipboardList className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 text-sm font-semibold">No bookings yet</p><p className="mt-1 text-xs text-muted-foreground">Website bookings will appear here.</p></div>}
              {recentBookings.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">{b.id}</span>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {b.customerName} · {b.cylinderType} × {b.quantity}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-medium text-muted-foreground">{b.source}</p>
                    <p className="text-xs text-muted-foreground">{b.deliveryArea}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Common admin tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="flex flex-col items-start gap-2 rounded-lg border border-border p-4 transition-colors hover:border-brand-blue/40 hover:bg-brand-blue/5"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-blue/10">
                      <Icon className="h-4 w-4 text-brand-blue" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{action.label}</span>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription>Recent database activity · 10 entries per page</CardDescription>
          </div>
          {activityFeed.length > activityPageSize && (
            <div className="text-xs font-medium text-muted-foreground">
              Page {safeActivityPage} of {activityPageCount}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <ActivityFeed items={pagedActivityFeed} />
          {activityFeed.length > activityPageSize && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <p className="text-xs text-muted-foreground">
                Showing {(safeActivityPage - 1) * activityPageSize + 1}-{Math.min(safeActivityPage * activityPageSize, activityFeed.length)} of {activityFeed.length}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setActivityPage((page) => Math.max(1, page - 1))} disabled={safeActivityPage === 1}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setActivityPage((page) => Math.min(activityPageCount, page + 1))} disabled={safeActivityPage === activityPageCount}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
