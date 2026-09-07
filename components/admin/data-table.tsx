'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from './empty-state';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => React.ReactNode;
  mobileRender?: (row: T) => React.ReactNode;
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  emptyTitle = 'No records found',
  emptyDescription = 'Try adjusting your filters or search.',
}: DataTableProps<T>) {
  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} icon={Inbox} />;
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-sm lg:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {columns.map((col) => (
                <TableHead key={col.key} className={cn('text-xs font-semibold uppercase tracking-wide', col.className)}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(onRowClick && 'cursor-pointer')}
              >
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {col.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 lg:hidden">
        {data.map((row) => (
          <div
            key={rowKey(row)}
            onClick={() => onRowClick?.(row)}
            className={cn(
              'rounded-lg border border-border bg-card p-4 shadow-sm',
              onRowClick && 'cursor-pointer active:scale-[0.99] transition-transform'
            )}
          >
            <div className="space-y-2">
              {columns
                .filter((col) => !col.hideOnMobile)
                .map((col) => (
                  <div key={col.key}>
                    {col.mobileRender ? (
                      col.mobileRender(row)
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <span className="shrink-0 text-xs font-medium text-muted-foreground">
                          {col.header}
                        </span>
                        <span className="text-right text-sm font-medium text-foreground">
                          {col.render(row)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
