'use client';

import { useId, useRef, useState } from 'react';
import { ImageIcon, LoaderCircle, RefreshCw, UploadCloud, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  previewAlt?: string;
  aspectRatio?: 'square' | 'video' | 'wide';
  required?: boolean;
  allowExternalUrl?: boolean;
}

const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxBytes = 5 * 1024 * 1024;

export function ImageUploader({
  value,
  onChange,
  label = 'Image',
  previewAlt = '',
  aspectRatio = 'wide',
  required = false,
  allowExternalUrl = true,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [previewFailed, setPreviewFailed] = useState(false);

  const handleFile = async (file: File) => {
    setError('');
    setPreviewFailed(false);
    if (!acceptedTypes.has(file.type)) {
      setError('Choose a JPG, PNG or WebP image.');
      return;
    }
    if (file.size === 0 || file.size > maxBytes) {
      setError('The image must be larger than 0 bytes and no more than 5 MB.');
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/admin/upload', { method: 'POST', body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Upload failed');
      onChange(result.url);
      toast.success(`${label} uploaded`);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'Upload failed';
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const aspectClass = aspectRatio === 'square'
    ? 'aspect-square'
    : aspectRatio === 'video'
      ? 'aspect-video'
      : 'aspect-[16/9]';

  const dropFile = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>

      {value ? (
        <div
          className={cn('group relative overflow-hidden rounded-lg border bg-muted/20', dragging && 'border-brand-blue ring-2 ring-brand-blue/20')}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={dropFile}
        >
          {!previewFailed ? (
            <img
              src={value}
              alt={previewAlt || `${label} preview`}
              className={cn('w-full object-contain p-3', aspectClass)}
              onError={() => setPreviewFailed(true)}
            />
          ) : (
            <div className={cn('grid place-items-center text-center text-sm text-muted-foreground', aspectClass)}>
              <span><ImageIcon className="mx-auto mb-2 h-7 w-7" />Preview could not be loaded.</span>
            </div>
          )}
          <div className="absolute right-2 top-2 flex gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />Replace
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="h-9 w-9"
              disabled={uploading}
              onClick={() => { onChange(''); setPreviewFailed(false); setError(required ? `${label} is required before saving.` : ''); }}
              aria-label={`Remove ${label.toLowerCase()}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={dropFile}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70',
            aspectClass,
            dragging ? 'border-brand-blue bg-brand-blue/5' : 'border-border hover:border-brand-blue/50 hover:bg-muted/50',
          )}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
            {uploading ? <LoaderCircle className="h-5 w-5 animate-spin text-brand-blue" /> : <UploadCloud className="h-5 w-5 text-muted-foreground" />}
          </span>
          <span>
            <span className="block text-sm font-medium text-foreground">{uploading ? 'Uploading image…' : 'Click to upload or drag and drop'}</span>
            <span className="mt-1 block text-xs text-muted-foreground">JPG, PNG or WebP · maximum 5 MB</span>
          </span>
        </button>
      )}

      {uploading && <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`Uploading ${label}`}><div className="h-full w-2/3 animate-pulse rounded-full bg-brand-blue" /></div>}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={uploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      {allowExternalUrl && (
        <Input
          value={value || ''}
          onChange={(event) => { onChange(event.target.value.trim()); setError(''); setPreviewFailed(false); }}
          placeholder="/uploads/image.webp or https://…"
          className="text-xs"
          aria-label={`${label} URL`}
        />
      )}
      {error && <p className="text-xs font-medium text-destructive" role="alert">{error}</p>}
    </div>
  );
}
