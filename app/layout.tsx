import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'Madhav Bharat Gas Agency | Commercial & Industrial LPG',
  description: 'Madhav Bharat Gas Agency is an authorized Bharatgas distributor for commercial and industrial LPG assistance.',
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#004b93' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body className="font-sans">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
