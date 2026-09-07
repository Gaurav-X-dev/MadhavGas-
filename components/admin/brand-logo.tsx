'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface MbgaLogoProps {
  className?: string;
  variant?: 'light' | 'dark';
}

interface Branding {
  logoUrl: string;
  logoAlt: string;
  agencyName: string;
  tagline: string;
}

const fallback: Branding = {
  logoUrl: '/assets/brands/mbga-logo.svg',
  logoAlt: 'Madhav Bharat Gas Agency logo',
  agencyName: 'Madhav Bharat Gas',
  tagline: 'Authorized Bharatgas Distributor',
};

/**
 * Admin identity block: the logo the agency actually uploaded, with its saved
 * name underneath. Reads the same public content endpoint the website uses, so
 * changing the logo or name in Site Content updates the panel too.
 */
export function MbgaLogo({ className, variant = 'dark' }: MbgaLogoProps) {
  const isLight = variant === 'light';
  const [branding, setBranding] = useState<Branding>(fallback);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/public/content', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!active || !payload) return;
        setBranding({
          logoUrl: payload.siteContent?.mbgaLogoUrl || fallback.logoUrl,
          logoAlt: payload.siteContent?.mbgaLogoAlt || fallback.logoAlt,
          agencyName: payload.agencySettings?.agencyName || fallback.agencyName,
          tagline: payload.agencySettings?.tagline || fallback.tagline,
        });
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  // Logo above, agency name beneath: a full agency name will not fit beside the
  // logo in a 256px sidebar without being cut off.
  return (
    <div className={cn('flex min-w-0 max-w-full flex-col items-start gap-2', className)}>
      {imageFailed ? (
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-blue text-lg font-bold text-white">
          {branding.agencyName.trim().charAt(0).toUpperCase() || 'M'}
        </span>
      ) : (
        <img
          src={branding.logoUrl}
          alt={branding.logoAlt}
          onError={() => setImageFailed(true)}
          className="h-9 w-auto max-w-full object-contain object-left"
        />
      )}
      <span className="flex min-w-0 max-w-full flex-col leading-tight">
        <span className={cn('text-sm font-bold leading-snug', isLight ? 'text-white' : 'text-brand-navy')}>
          {branding.agencyName}
        </span>
        <span
          className={cn(
            'mt-0.5 text-[10px] font-medium uppercase leading-snug tracking-wide',
            isLight ? 'text-white/60' : 'text-muted-foreground',
          )}
        >
          {branding.tagline}
        </span>
      </span>
    </div>
  );
}
