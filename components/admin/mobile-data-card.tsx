import { cn } from '@/lib/utils';

interface MobileDataCardProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileDataCard({ children, className }: MobileDataCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-4 shadow-sm lg:hidden',
        className
      )}
    >
      {children}
    </div>
  );
}

export function MobileDataField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
