'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, History, Send, TestTube2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { EmailServiceStatus } from '@/lib/types';
import { newsletterCampaignSchema, validationMessage } from '@/lib/validation';

interface Campaign {
  id: string;
  subject: string;
  heading: string;
  status: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  sentAt: string | null;
  author: string;
}

const blank = { subject: '', heading: '', introduction: '', body: '', ctaLabel: '', ctaUrl: '' };

/**
 * Compose and send a newsletter to every active subscriber.
 *
 * Sending is blocked while SMTP is unconfigured, because the mail layer would
 * otherwise report every address as "Skipped" and look like a silent success.
 */
export function NewsletterComposer({ activeCount, onSent }: { activeCount: number; onSent: () => void }) {
  const [draft, setDraft] = useState(blank);
  const [testRecipient, setTestRecipient] = useState('');
  const [emailStatus, setEmailStatus] = useState<EmailServiceStatus | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [formError, setFormError] = useState('');

  const loadCampaigns = () => {
    fetch('/api/admin/newsletter/campaigns', { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload) => setCampaigns(payload.items || []))
      .catch(() => undefined);
  };

  useEffect(() => {
    fetch('/api/admin/email/status', { cache: 'no-store' })
      .then((response) => response.json())
      .then(setEmailStatus)
      .catch(() => undefined);
    loadCampaigns();
  }, []);

  const update = (patch: Partial<typeof blank>) => { setDraft((current) => ({ ...current, ...patch })); setFormError(''); };

  const validate = () => {
    const check = newsletterCampaignSchema.safeParse({ ...draft, testRecipient: '' });
    if (!check.success) {
      const message = validationMessage(check.error);
      setFormError(message);
      toast.error(message);
      return null;
    }
    return check.data;
  };

  const sendTest = async () => {
    const valid = validate();
    if (!valid) return;
    if (!testRecipient.trim()) { toast.error('Enter an address to send the test to'); return; }
    setTesting(true);
    try {
      const response = await fetch('/api/admin/newsletter/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...valid, testRecipient: testRecipient.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'The test email could not be sent');
      toast.success(`Test email sent to ${payload.recipient}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The test email could not be sent';
      setFormError(message);
      toast.error(message);
    } finally {
      setTesting(false);
    }
  };

  const send = async () => {
    const valid = validate();
    if (!valid) return;
    setSending(true);
    try {
      const response = await fetch('/api/admin/newsletter/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...valid, testRecipient: '' }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'The newsletter could not be sent');
      toast.success(`Newsletter sent to ${payload.sent} of ${payload.recipients} subscribers${payload.failed ? ` · ${payload.failed} failed` : ''}`);
      setDraft(blank);
      loadCampaigns();
      onSent();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The newsletter could not be sent';
      setFormError(message);
      toast.error(message);
    } finally {
      setSending(false);
      setConfirmOpen(false);
    }
  };

  const emailReady = emailStatus?.configured === true;

  return (
    <div className="space-y-5">
      {emailStatus && !emailReady && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="status">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong className="font-semibold">Email is not configured yet.</strong> Subscribers are still saved, but nothing can be
            sent until these environment variables are set: <span className="font-mono text-xs">{emailStatus.missing.join(', ')}</span>.
            See <span className="font-mono text-xs">docs/SMTP_SETUP.md</span>.
          </span>
        </div>
      )}
      {emailStatus && emailReady && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Email is configured. Newsletters will be sent from <strong className="font-semibold">{emailStatus.fromAddress}</strong>.</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Compose Newsletter</CardTitle>
          <CardDescription>
            Sent to every active subscriber. Each email carries a one-click unsubscribe link automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {formError && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{formError}</span>
            </div>
          )}
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nl-subject">Email subject <span className="text-destructive">*</span></Label>
              <Input id="nl-subject" value={draft.subject} onChange={(event) => update({ subject: event.target.value })} maxLength={180} placeholder="MBGA service update — August" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nl-heading">Heading in the email <span className="text-destructive">*</span></Label>
              <Input id="nl-heading" value={draft.heading} onChange={(event) => update({ heading: event.target.value })} maxLength={180} placeholder="This month at Madhav Bharat Gas Agency" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nl-intro">Opening line <span className="text-destructive">*</span></Label>
            <Textarea id="nl-intro" rows={3} value={draft.introduction} onChange={(event) => update({ introduction: event.target.value })} maxLength={1000} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nl-body">Message</Label>
            <Textarea id="nl-body" rows={9} value={draft.body} onChange={(event) => update({ body: event.target.value })} maxLength={6000} placeholder="Leave a blank line between paragraphs." />
            <p className="text-xs text-muted-foreground">Plain text only. Leave a blank line between paragraphs.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nl-cta-label">Button label <small className="text-muted-foreground">(optional)</small></Label>
              <Input id="nl-cta-label" value={draft.ctaLabel} onChange={(event) => update({ ctaLabel: event.target.value })} maxLength={120} placeholder="Book LPG" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nl-cta-url">Button link</Label>
              <Input id="nl-cta-url" value={draft.ctaUrl} onChange={(event) => update({ ctaUrl: event.target.value })} maxLength={2048} placeholder="https://…" />
            </div>
          </div>

          <div className="grid gap-4 rounded-xl border bg-muted/30 p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="nl-test">Send a test to yourself first</Label>
              <Input id="nl-test" type="email" value={testRecipient} onChange={(event) => setTestRecipient(event.target.value)} maxLength={255} placeholder="you@example.com" />
            </div>
            <div className="flex items-end gap-2">
              <Button type="button" variant="outline" disabled={!emailReady || testing || sending} onClick={sendTest}>
                <TestTube2 className="mr-2 h-4 w-4" />{testing ? 'Sending…' : 'Send Test'}
              </Button>
              <Button type="button" disabled={!emailReady || sending || testing || activeCount === 0} onClick={() => setConfirmOpen(true)}>
                <Send className="mr-2 h-4 w-4" />{sending ? 'Sending…' : `Send to ${activeCount} subscriber${activeCount === 1 ? '' : 's'}`}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4" />Sent Newsletters</CardTitle>
          <CardDescription>The last 50 sends, newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No newsletters have been sent yet.</p>
          ) : (
            <div className="divide-y">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{campaign.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {campaign.author} · {new Date(campaign.sentAt || campaign.createdAt).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{campaign.sentCount}/{campaign.recipientCount} delivered</Badge>
                    {campaign.failedCount > 0 && <Badge variant="destructive">{campaign.failedCount} failed</Badge>}
                    <Badge variant={campaign.status === 'Sent' ? 'default' : 'secondary'}>{campaign.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Send this newsletter to ${activeCount} subscriber${activeCount === 1 ? '' : 's'}?`}
        description="This sends real email immediately and cannot be undone. Send a test to yourself first if you have not already."
        confirmLabel="Send Newsletter"
        onConfirm={send}
      />
    </div>
  );
}
