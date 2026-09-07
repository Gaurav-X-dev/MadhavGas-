import {
  ClipboardList,
  MessageSquare,
  Star,
  Package,
  FileText,
  User as UserIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityItem } from '@/lib/types';

const typeIcon = {
  booking: ClipboardList,
  enquiry: MessageSquare,
  feedback: Star,
  product: Package,
  content: FileText,
  user: UserIcon,
};

const typeColor = {
  booking: 'bg-brand-blue/10 text-brand-blue',
  enquiry: 'bg-amber-500/10 text-amber-600',
  feedback: 'bg-success/10 text-success',
  product: 'bg-purple-500/10 text-purple-600',
  content: 'bg-brand-yellow/20 text-amber-700',
  user: 'bg-muted text-muted-foreground',
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <div className="rounded-lg border border-dashed p-8 text-center"><FileText className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 text-sm font-semibold">No activity yet</p><p className="mt-1 text-xs text-muted-foreground">Verified admin and public changes will appear here.</p></div>;
  }
  return (
    <div className="space-y-1">
      {items.map((item, index) => {
        const Icon = typeIcon[item.type];
        return (
          <div key={item.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  typeColor[item.type]
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              {index < items.length - 1 && (
                <div className="my-1 w-px flex-1 bg-border" />
              )}
            </div>
            <div className="flex-1 pb-4 pt-1">
              <p className="text-sm text-foreground">
                <span className="font-semibold">{item.user}</span> {item.action}{' '}
                <span className="font-medium text-brand-blue">{item.target}</span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.time}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
