'use client';

import { useState } from 'react';
import { Save, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/admin/page-header';
import { QRPreview } from '@/components/admin/qr-preview';
import { qrSettings as initialSettings } from '@/lib/mock-data';
import { toast } from 'sonner';
import { usePersistentSingleton } from '@/hooks/use-persistent-data';

export default function QrSettingsPage() {
  const [settings, setSettings, , saveSettings] = usePersistentSingleton('qr-settings', initialSettings);

  const update = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));

  const handleSave = () => saveSettings().then(() => toast.success('QR settings saved')).catch((error) => toast.error(error.message));

  const whatsappLink = `https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(settings.defaultMessage)}`;

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="QR Settings" description="Configure your WhatsApp booking QR code.">
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">WhatsApp Configuration</CardTitle>
              <CardDescription>Set the number and default message for QR bookings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>WhatsApp number <span className="text-destructive">*</span></Label>
                <Input
                  value={settings.whatsappNumber}
                  onChange={(e) => update('whatsappNumber', e.target.value)}
                  placeholder="+91 98250 00000"
                />
                <p className="text-xs text-muted-foreground">Include the country code without spaces for a valid WhatsApp link.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Default booking message <span className="text-destructive">*</span></Label>
                <Textarea
                  rows={6}
                  value={settings.defaultMessage}
                  onChange={(e) => update('defaultMessage', e.target.value)}
                  placeholder="Hello MBGA, I would like to book a cylinder..."
                />
                <p className="text-xs text-muted-foreground">This message will be pre-filled when customers scan the QR code.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Booking page URL</Label>
                <Input
                  value={settings.bookingUrl}
                  onChange={(e) => update('bookingUrl', e.target.value)}
                  placeholder="https://your-domain.example/contact"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4 text-brand-blue" />
                QR Usage Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-xs font-bold text-brand-blue">1</span>
                <span>Download the QR code image using the button on the right.</span>
              </div>
              <div className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-xs font-bold text-brand-blue">2</span>
                <span>Print and place the QR code at your agency counter, delivery vehicles, and customer premises.</span>
              </div>
              <div className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-xs font-bold text-brand-blue">3</span>
                <span>Customers scan the code with their phone camera to open WhatsApp with a pre-filled booking message.</span>
              </div>
              <div className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-xs font-bold text-brand-blue">4</span>
                <span>Share the booking link via SMS, email, or social media for online orders.</span>
              </div>
              <Separator className="my-2" />
              <p className="text-xs">Note: The QR code encodes your WhatsApp link with the default message. Update the number before going live.</p>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-base">Live QR Preview</CardTitle>
              <CardDescription>Generated from your current settings.</CardDescription>
            </CardHeader>
            <CardContent>
              <QRPreview value={settings.bookingUrl || whatsappLink} label={settings.bookingUrl ? 'Booking page QR code' : 'WhatsApp booking QR code'} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
