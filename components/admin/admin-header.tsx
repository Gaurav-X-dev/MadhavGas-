'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Menu,
  ChevronDown,
  LogOut,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { AdminSidebar } from './admin-sidebar';
import { useCurrentUser } from '@/hooks/use-persistent-data';
import { toast } from 'sonner';
import { GlobalSearch } from './global-search';

export function AdminHeader() {
  const CURRENT_USER = useCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const crumbs = pathname
    .split('/')
    .filter(Boolean);
  const crumbLabel = (crumb: string) => crumb.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error((await response.json()).error || 'Unable to log out');
      toast.success('Logged out successfully');
      router.replace('/admin/login');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to log out');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card px-4 lg:px-6">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <AdminSidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="hidden md:flex">
        <Breadcrumb>
          <BreadcrumbList>
            {crumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {i === crumbs.length - 1 ? (
                    <BreadcrumbPage className="font-medium text-foreground">
                      {crumbLabel(crumb)}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={'/' + crumbs.slice(0, i + 1).join('/')}>
                        {crumbLabel(crumb)}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </span>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <GlobalSearch />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-brand-blue text-xs font-semibold text-white">
                  {CURRENT_USER.avatar}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium lg:block">
                {CURRENT_USER.name}
              </span>
              <ChevronDown className="hidden h-4 w-4 text-muted-foreground lg:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{CURRENT_USER.name}</span>
                <span className="text-xs text-muted-foreground">{CURRENT_USER.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
