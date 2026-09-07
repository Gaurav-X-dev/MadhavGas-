'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    __MBGA_AGENCY__?: Record<string, unknown>;
    __MBGA_RUNTIME_LOADED__?: boolean;
  }
}

export function ReferenceRuntime({ agency }: { agency: Record<string, unknown> }) {
  useEffect(() => {
    window.__MBGA_AGENCY__ = agency;
    if (window.__MBGA_RUNTIME_LOADED__) return;
    const script = document.createElement('script');
    script.src = '/assets/js/reference-runtime.js';
    script.async = true;
    script.dataset.mbgaRuntime = 'true';
    script.onload = () => {
      document.documentElement.classList.add('js');
      window.__MBGA_RUNTIME_LOADED__ = true;
    };
    script.onerror = () => document.documentElement.classList.remove('js');
    document.body.appendChild(script);
    return () => { script.remove(); };
  }, [agency]);
  return null;
}
