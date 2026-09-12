'use client';

import { useEffect, useState } from 'react';
import { Save, Download, AlertTriangle, Bell, Mail, Globe, FileText, CheckCircle2, LoaderCircle, Send, XCircle, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/admin/page-header';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { agencySettings as initialSettings } from '@/lib/mock-data';
import type { AgencySettings, EmailServiceStatus } from '@/lib/types';
import { toast } from 'sonner';
import { usePersistentSingleton } from '@/hooks/use-persistent-data';

export default function SettingsPage() {
  const [settings, setSettings, , saveSettings] = usePersistentSingleton<AgencySettings>('agency-settings', initialSettings);
  const [emailStatus, setEmailStatus] = useState<EmailServiceStatus | null>(null);
  const [testRecipient, setTestRecipient] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (passwords.next.length < 8) return toast.error('New password must be at least 8 characters');
    if (passwords.next !== passwords.confirm) return toast.error('New password confirmation does not match');
    setChangingPassword(true);
    try {
      const response = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.next }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to update password');
      setPasswords({ current: '', next: '', confirm: '' });
      toast.success('Password updated successfully');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to update password'); }
    finally { setChangingPassword(false); }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin/email/status', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load email service status');
        return response.json();
      })
      .then(setEmailStatus)
      .catch((error) => { if (error.name !== 'AbortError') toast.error(error.message); });
    return () => controller.abort();
  }, []);

  const update = <K extends keyof AgencySettings>(key: K, value: AgencySettings[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));

  const handleSave = () => saveSettings().then(() => toast.success('Settings saved successfully')).catch((error) => toast.error(error.message));

  const handleTestEmail = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testRecipient.trim())) {
      toast.error('Enter a valid test recipient email address');
      return;
    }
    setSendingTest(true);
    try {
      const response = await fetch('/api/admin/email/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipient: testRecipient.trim().toLowerCase() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Test email failed');
      toast.success('SMTP test email sent successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Test email failed');
    } finally {
      setSendingTest(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/export');
      if (!response.ok) throw new Error((await response.json()).error || 'Export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mbga-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Backup exported');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Export failed'); }
  };

  const clearOperationalData = async () => {
    try {
      const response = await fetch('/api/admin/data', { method: 'DELETE' });
      if (!response.ok) throw new Error((await response.json()).error || 'Unable to clear data');
      toast.success('Operational records cleared');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to clear data'); }
  };

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="Settings" description="Manage agency settings, notifications, and email templates.">
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </PageHeader>

      <Tabs defaultValue="general">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="email">Email Templates</TabsTrigger>
          <TabsTrigger value="password">Change Password</TabsTrigger>
          <TabsTrigger value="danger">Danger Zone</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">General Agency Settings</CardTitle>
              <CardDescription>Basic information about your agency.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Agency name <span className="text-destructive">*</span></Label>
                <Input value={settings.agencyName} onChange={(e) => update('agencyName', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Tagline</Label>
                <Input value={settings.tagline} onChange={(e) => update('tagline', e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
              <CardDescription>How customers can reach you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Primary phone</Label>
                  <Input value={settings.phonePrimary} onChange={(e) => update('phonePrimary', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Secondary phone</Label>
                  <Input value={settings.phoneSecondary} onChange={(e) => update('phoneSecondary', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={settings.email} onChange={(e) => update('email', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>WhatsApp number</Label>
                  <Input value={settings.whatsappNumber} onChange={(e) => update('whatsappNumber', e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Office address</Label>
                <Textarea rows={2} value={settings.officeAddress} onChange={(e) => update('officeAddress', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Google Maps embed URL / iframe</Label>
                <Textarea
                  rows={3}
                  value={settings.mapEmbedUrl || ''}
                  onChange={(e) => update('mapEmbedUrl', e.target.value)}
                  placeholder="Paste the Google Maps embed URL or full iframe code"
                />
                <p className="text-xs text-muted-foreground">Google Maps → Share → Embed a map → copy HTML. The public contact map will use this.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Business hours</Label>
                <Input value={settings.businessHours} onChange={(e) => update('businessHours', e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-brand-blue" />
                Social Links
              </CardTitle>
              <CardDescription>Your social media profiles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Facebook</Label>
                <Input value={settings.facebook} onChange={(e) => update('facebook', e.target.value)} placeholder="https://facebook.com/..." />
              </div>
              <div className="space-y-1.5">
                <Label>Instagram</Label>
                <Input value={settings.instagram} onChange={(e) => update('instagram', e.target.value)} placeholder="https://instagram.com/..." />
              </div>
              <div className="space-y-1.5">
                <Label>LinkedIn</Label>
                <Input value={settings.linkedin} onChange={(e) => update('linkedin', e.target.value)} placeholder="https://linkedin.com/..." />
              </div>
              <div className="space-y-1.5">
                <Label>Twitter / X</Label>
                <Input value={settings.twitter} onChange={(e) => update('twitter', e.target.value)} placeholder="https://twitter.com/..." />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-brand-blue" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Choose what alerts you receive.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'notifyNewBookings' as const, label: 'New booking alerts', desc: 'Get notified when a new booking is placed' },
                { key: 'notifyNewEnquiries' as const, label: 'New enquiry alerts', desc: 'Get notified when a new enquiry is submitted' },
                { key: 'notifyNewFeedback' as const, label: 'New feedback alerts', desc: 'Get notified when new feedback is received' },
                { key: 'notifyLowStock' as const, label: 'Low stock alerts', desc: 'Get notified when a product is running low' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch checked={settings[item.key]} onCheckedChange={(v) => update(item.key, v)} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {emailStatus?.configured ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-amber-600" />}
                SMTP Email Service
              </CardTitle>
              <CardDescription>Credentials stay in server environment variables and are never returned to this page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`rounded-lg border p-4 ${emailStatus?.configured ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                <p className="text-sm font-semibold text-brand-navy">
                  {emailStatus === null ? 'Checking email service…' : emailStatus.configured ? 'Email service configured' : 'Email service not configured'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {emailStatus?.configured ? `Sender: ${emailStatus.fromAddress}` : 'Add the documented SMTP variables to .env.local or the production hosting environment. The application remains operational without them.'}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="smtp-test-recipient">Test recipient</Label>
                  <Input id="smtp-test-recipient" type="email" value={testRecipient} onChange={(event) => setTestRecipient(event.target.value)} placeholder="recipient@example.com" />
                </div>
                <Button type="button" variant="outline" onClick={handleTestEmail} disabled={sendingTest}>
                  {sendingTest ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send Test Email
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4 text-brand-blue" />
                Email Templates
              </CardTitle>
              <CardDescription>Customize automated email responses. Use {'{{variables}}'} for dynamic content.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Booking confirmation email</Label>
                <Textarea rows={5} value={settings.emailTemplateBooking} onChange={(e) => update('emailTemplateBooking', e.target.value)} className="font-mono text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label>Enquiry acknowledgement email</Label>
                <Textarea rows={5} value={settings.emailTemplateEnquiry} onChange={(e) => update('emailTemplateEnquiry', e.target.value)} className="font-mono text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label>Feedback response email</Label>
                <Textarea rows={5} value={settings.emailTemplateFeedback} onChange={(e) => update('emailTemplateFeedback', e.target.value)} className="font-mono text-xs" />
              </div>
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        <TabsContent value="password">
          <Card className="max-w-2xl">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><LockKeyhole className="h-4 w-4 text-brand-blue" />Update Password</CardTitle><CardDescription>Change the password for your currently signed-in administrator account.</CardDescription></CardHeader>
            <CardContent><form className="space-y-4" onSubmit={handlePasswordChange}>
              <div className="space-y-1.5"><Label htmlFor="current-password">Current password</Label><Input id="current-password" type="password" autoComplete="current-password" value={passwords.current} onChange={(event) => setPasswords((value) => ({ ...value, current: event.target.value }))} required /></div>
              <div className="space-y-1.5"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={8} value={passwords.next} onChange={(event) => setPasswords((value) => ({ ...value, next: event.target.value }))} required /></div>
              <div className="space-y-1.5"><Label htmlFor="confirm-password">Confirm new password</Label><Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} value={passwords.confirm} onChange={(event) => setPasswords((value) => ({ ...value, confirm: event.target.value }))} required /></div>
              <Button type="submit" disabled={changingPassword}>{changingPassword && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}Update Password</Button>
            </form></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-brand-blue" />
                  Backup & Export
                </CardTitle>
                <CardDescription>Download a JSON backup of CMS content, settings, submissions and audit logs.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export all data
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Danger Zone
                </CardTitle>
                <CardDescription>Irreversible actions. Proceed with caution.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Reset agency settings to defaults</p>
                    <p className="text-xs text-muted-foreground">This restores the agency settings form to its initial values.</p>
                  </div>
                  <ConfirmDialog
                    trigger={<Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/5">Reset content</Button>}
                    title="Reset agency settings?"
                    description="This will replace the current agency settings with the initial configured values."
                    confirmLabel="Reset settings"
                    onConfirm={() => { setSettings(initialSettings); toast.success('Default values loaded. Select Save Changes to apply them.'); }}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Delete operational records</p>
                    <p className="text-xs text-muted-foreground">Permanently remove all bookings, enquiries, and feedback.</p>
                  </div>
                  <ConfirmDialog
                    trigger={<Button variant="destructive">Delete all data</Button>}
                    title="Delete all data?"
                    description="This permanently deletes bookings, enquiries, feedback and public submissions. Website content and products remain untouched."
                    confirmLabel="Delete records"
                    onConfirm={clearOperationalData}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
