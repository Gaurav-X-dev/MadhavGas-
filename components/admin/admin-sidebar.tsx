'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navGroups } from './nav-config';
import { MbgaLogo } from './brand-logo';

interface AdminSidebarProps {
  onNavigate?: () => void;
}

export function AdminSidebar({ onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-brand-navy text-white">
      <div className="flex items-center border-b border-white/10 px-5 py-4">
        <Link href="/admin/dashboard" onClick={onNavigate} className="flex items-center">
          <MbgaLogo variant="light" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-brand-blue text-white'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-white/50 hover:text-white transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to public site
        </Link>
      </div>
    </div>
  );
}
