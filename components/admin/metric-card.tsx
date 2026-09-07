import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: string; positive?: boolean };
  accent?: 'blue' | 'yellow' | 'green' | 'red';
  className?: string;
}

const accentStyles = {
  blue: 'bg-brand-blue/10 text-brand-blue',
  yellow: 'bg-brand-yellow/20 text-amber-700',
  green: 'bg-success/10 text-success',
  red: 'bg-destructive/10 text-destructive',
};

export function MetricCard({
  label,
  value,
  icon: Icon,
  trend,
  accent = 'blue',
  className,
}: MetricCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">{value}</p>
          {trend && (
            <p
              className={cn(
                'mt-1.5 text-xs font-medium',
                trend.positive ? 'text-success' : 'text-destructive'
              )}
            >
              {trend.positive ? '+' : ''}
              {trend.value}
            </p>
          )}
        </div>
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-lg',
            accentStyles[accent]
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}
