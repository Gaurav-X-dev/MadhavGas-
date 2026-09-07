import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getSingleton } from '@/lib/resources';
import type { AgencySettings, QrSettings } from '@/lib/types';
import { whatsappUrl } from '@/lib/site-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [qr, agency] = await Promise.all([
    getSingleton<QrSettings>('qr-settings'),
    getSingleton<AgencySettings>('agency-settings'),
  ]);
  if (!qr || !agency) return NextResponse.json({ error: 'QR settings not configured' }, { status: 404 });
  const image = await QRCode.toBuffer(qr.bookingUrl || whatsappUrl(qr, agency), {
    type: 'png', width: 360, margin: 2, color: { dark: '#082F57', light: '#FFFFFF' },
  });
  return new NextResponse(image, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=300' } });
}

