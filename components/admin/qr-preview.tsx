'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface QRPreviewProps {
  value: string;
  label?: string;
}

export function QRPreview({ value, label = 'QR Code Preview' }: QRPreviewProps) {
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { width: 320, margin: 2, color: { dark: '#082F57', light: '#FFFFFF' } })
      .then((url) => { if (active) setQrUrl(url); })
      .catch(() => { if (active) setQrUrl(''); });
    return () => { active = false; };
  }, [value]);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    toast.success('Link copied to clipboard');
  };

  const handleDownload = async () => {
    try {
      if (!qrUrl) throw new Error('QR code is not ready');
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mbga-qr-code.png';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('QR code downloaded');
    } catch {
      toast.error('Could not download QR code');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/30 p-6">
        <div className="rounded-lg border border-border bg-white p-3 shadow-sm">
          {qrUrl ? <img src={qrUrl} alt="QR code preview" width={200} height={200} className="h-48 w-48" /> : <div className="grid h-48 w-48 place-items-center text-xs text-muted-foreground">Generating QR…</div>}
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <div className="space-y-1.5">
        <Label>Booking link</Label>
        <div className="flex gap-2">
          <Input value={value} readOnly className="text-xs" />
          <Button type="button" variant="outline" size="icon" onClick={handleCopy}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={handleDownload} disabled={!qrUrl}>
          <Download className="mr-2 h-4 w-4" />
          Download QR
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href={value} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Test link
          </a>
        </Button>
      </div>
    </div>
  );
}
