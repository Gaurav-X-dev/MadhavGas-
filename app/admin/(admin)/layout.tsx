import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminHeader } from '@/components/admin/admin-header';
import { requireSession } from '@/lib/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession();
  return (
    <div className="min-h-screen bg-background lg:pl-64">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 shrink-0 lg:block">
        <AdminSidebar />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader />
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1500px] px-4 py-6 md:px-5 lg:px-6 xl:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
