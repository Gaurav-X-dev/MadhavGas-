import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type Tone = 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'yellow';

const toneClasses: Record<Tone, string> = {
  blue: 'bg-brand-blue/10 text-brand-blue border-brand-blue/20',
  green: 'bg-success/10 text-success border-success/20',
  amber: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  red: 'bg-destructive/10 text-destructive border-destructive/20',
  gray: 'bg-muted text-muted-foreground border-border',
  yellow: 'bg-brand-yellow/20 text-amber-800 border-brand-yellow/40',
};

const statusToneMap: Record<string, Tone> = {
  New: 'blue',
  Confirmed: 'blue',
  Processing: 'amber',
  Delivered: 'green',
  Cancelled: 'red',
  Open: 'blue',
  'In Progress': 'amber',
  Resolved: 'green',
  Closed: 'gray',
  Reviewed: 'amber',
  'In Stock': 'green',
  Limited: 'amber',
  'Out of Stock': 'red',
  Published: 'green',
  Draft: 'gray',
  Low: 'gray',
  Medium: 'blue',
  High: 'amber',
  Urgent: 'red',
  Active: 'green',
  Inactive: 'gray',
  MBGA: 'blue',
  Bharatgas: 'yellow',
  Shared: 'green',
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const tone = statusToneMap[status] ?? 'gray';
  return (
    <Badge
      variant="outline"
      className={cn('font-medium', toneClasses[tone], className)}
    >
      {status}
    </Badge>
  );
}
