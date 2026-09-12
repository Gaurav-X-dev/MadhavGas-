'use client';

import Link from 'next/link';
import { ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface AdminFormPageProps {
  section: string;
  sectionHref: string;
  title: string;
  description: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  saving?: boolean;
  submitLabel?: string;
}

export function AdminFormPage({
  section,
  sectionHref,
  title,
  description,
  children,
  aside,
  onSubmit,
  onCancel,
  saving = false,
  submitLabel = 'Save Changes',
}: AdminFormPageProps) {
  return (
    <form onSubmit={onSubmit} className="animate-fade-in-up" noValidate>
      <nav className="mb-4 flex items-center gap-1.5 text-xs font-medium text-muted-foreground" aria-label="Breadcrumb">
        <Link href={sectionHref} className="transition-colors hover:text-brand-blue">{section}</Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <span aria-current="page" className="text-foreground">{title}</span>
      </nav>

      <div className="mb-7 max-w-3xl">
        <h1 className="text-2xl font-bold tracking-[-0.025em] text-brand-navy md:text-3xl">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      <div className={cn('grid items-start gap-6', aside && 'xl:grid-cols-[minmax(0,1fr)_340px]')}>
        <div className="min-w-0 space-y-6">{children}</div>
        {aside && <aside className="min-w-0 space-y-5 xl:sticky xl:top-6">{aside}</aside>}
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 mt-8 border-t border-border bg-background/95 px-4 py-3 shadow-[0_-14px_35px_rgba(8,47,87,0.08)] backdrop-blur md:-mx-5 md:px-5 lg:-mx-6 lg:px-6 xl:-mx-8 xl:px-8">
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-3">
          <p className="hidden text-xs text-muted-foreground sm:block">Required fields are marked with an asterisk.</p>
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? 'Saving…' : submitLabel}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

interface AdminFieldProps {
  id: string;
  label: string;
  required?: boolean;
  helper?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export function AdminField({ id, label, required, helper, error, className, children }: AdminFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}{required && <span className="ml-1 text-destructive" aria-hidden="true">*</span>}
      </Label>
      {children}
      {error ? <p className="text-xs font-medium text-destructive" role="alert">{error}</p> : helper ? <p className="text-xs leading-5 text-muted-foreground">{helper}</p> : null}
    </div>
  );
}
