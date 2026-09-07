'use client';

import { useId, useRef, useState } from 'react';
import { Film, LoaderCircle, RefreshCw, UploadCloud, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VideoUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  posterUrl?: string;
  required?: boolean;
}

const acceptedTypes = new Set(['video/mp4', 'video/webm']);
const maxBytes = 48 * 1024 * 1024;

/** Uploads an MP4/WebM file to `public/uploads` and previews it inline. */
export function VideoUploader({
  value,
  onChange,
  label = 'Video',
  posterUrl,
  required = false,
}: VideoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file: File) => {
    setError('');
    if (!acceptedTypes.has(file.type)) {
      setError('Choose an MP4 or WebM video.');
      return;
    }
    if (file.size === 0 || file.size > maxBytes) {
      setError('The video must be larger than 0 bytes and no more than 48 MB.');
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/admin/upload?kind=video', { method: 'POST', body });
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

  const dropFile = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const isUploadedFile = Boolean(value && value.startsWith('/uploads/'));

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>

      {isUploadedFile ? (
        <div className="group relative overflow-hidden rounded-lg border bg-muted/20">
          <video
            src={value}
            poster={posterUrl || undefined}
            controls
            preload="metadata"
            className="aspect-video w-full bg-black object-contain"
          />
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
              onClick={() => { onChange(''); setError(required ? `${label} is required before saving.` : ''); }}
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
            'flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70',
            dragging ? 'border-brand-blue bg-brand-blue/5' : 'border-border hover:border-brand-blue/50 hover:bg-muted/50',
          )}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
            {uploading ? <LoaderCircle className="h-5 w-5 animate-spin text-brand-blue" /> : <UploadCloud className="h-5 w-5 text-muted-foreground" />}
          </span>
          <span>
            <span className="block text-sm font-medium text-foreground">{uploading ? 'Uploading video…' : 'Click to upload or drag and drop'}</span>
            <span className="mt-1 block text-xs text-muted-foreground">MP4 or WebM · maximum 48 MB</span>
          </span>
        </button>
      )}

      {uploading && <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`Uploading ${label}`}><div className="h-full w-2/3 animate-pulse rounded-full bg-brand-blue" /></div>}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept=".mp4,.m4v,.webm,video/mp4,video/webm"
        className="sr-only"
        disabled={uploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      {value && !isUploadedFile && (
        <p className="flex items-center gap-2 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          <Film className="h-3.5 w-3.5 shrink-0" />
          This item currently uses an external link. Uploading a file replaces it.
        </p>
      )}
      <Input
        value={value || ''}
        onChange={(event) => { onChange(event.target.value.trim()); setError(''); }}
        placeholder="/uploads/video.mp4 or https://…"
        className="text-xs"
        aria-label={`${label} URL`}
      />
      {error && <p className="text-xs font-medium text-destructive" role="alert">{error}</p>}
    </div>
  );
}
