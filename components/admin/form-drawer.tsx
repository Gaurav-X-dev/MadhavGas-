'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit?: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  width?: string;
}

export function FormDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  submitLabel = 'Save',
  isSubmitting = false,
}: FormDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg lg:max-w-xl"
      >
        <SheetHeader className="border-b border-border px-6 py-5">
          <SheetTitle className="text-lg font-bold text-brand-navy">{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <ScrollArea className="flex-1 px-6 py-5">
          <div className="space-y-5 pb-4">{children}</div>
        </ScrollArea>
        {onSubmit && (
          <SheetFooter className="border-t border-border px-6 py-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="mt-0"
            >
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={isSubmitting} className="mt-0">
              {isSubmitting ? 'Saving...' : submitLabel}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
