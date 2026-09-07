'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LoaderCircle, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchResult {
  id: string;
  resource: string;
  label: string;
  description: string;
  href: string;
}

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    if (query.trim().length < 2) { setResults([]); setLoading(false); return () => controller.abort(); }
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/search?q=${encodeURIComponent(query.trim())}`, { cache: 'no-store', signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Search failed');
        setResults(result.items || []);
        setActiveIndex(-1);
        setOpen(true);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  useEffect(() => {
    const close = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  return (
    <div ref={rootRef} className="relative hidden sm:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => query.trim().length >= 2 && setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
          if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActiveIndex((index) => Math.min(index + 1, results.length - 1)); }
          if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
          if (event.key === 'Enter' && activeIndex >= 0) { event.preventDefault(); document.getElementById(`admin-search-result-${activeIndex}`)?.click(); }
        }}
        placeholder="Search bookings, enquiries…"
        className="h-9 w-52 pl-9 pr-8 md:w-72"
        aria-label="Global search"
        role="combobox"
        aria-expanded={open}
        aria-controls="admin-search-results"
      />
      {loading && <LoaderCircle className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-brand-blue" />}
      {open && (
        <div id="admin-search-results" role="listbox" className="absolute right-0 top-11 z-50 w-[min(390px,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-card shadow-xl">
          {results.length ? results.map((item, index) => (
            <Link id={`admin-search-result-${index}`} role="option" aria-selected={index === activeIndex} key={`${item.resource}-${item.id}`} href={item.href} onClick={() => { setOpen(false); setQuery(''); }} className={`block border-b px-4 py-3 last:border-0 ${index === activeIndex ? 'bg-brand-blue/5' : 'hover:bg-muted/50'}`}>
              <div className="flex items-center justify-between gap-3"><span className="truncate text-sm font-semibold">{item.label}</span><span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-brand-blue">{item.resource}</span></div>
              <p className="mt-1 truncate text-xs text-muted-foreground">{item.description}</p>
            </Link>
          )) : <div className="p-6 text-center text-sm text-muted-foreground">No matching bookings, enquiries, feedback or products.</div>}
        </div>
      )}
    </div>
  );
}
