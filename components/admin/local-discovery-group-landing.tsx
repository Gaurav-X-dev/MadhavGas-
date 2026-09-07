import type { LocalDiscoveryGroup } from '@/lib/types';

const groupMeta: Record<LocalDiscoveryGroup, { title: string; singular: string; description: string }> = {
  localities: { title: 'Nearby Localities', singular: 'Locality', description: 'Manage configured nearby locality references for the public discovery section.' },
  categories: { title: 'LPG Categories', singular: 'Category', description: 'Manage supported LPG category references for the public discovery section.' },
  topics: { title: 'Popular LPG Topics', singular: 'Topic', description: 'Manage useful LPG information topics for the public discovery section.' },
};

export function LocalDiscoveryGroupLanding({ group }: { group: LocalDiscoveryGroup }) {
  const meta = groupMeta[group];
  return (
    <div className="animate-fade-in-up">
      <nav className="mb-4 text-xs font-medium text-muted-foreground" aria-label="Breadcrumb">
        <a href="/admin/local-information" className="hover:text-brand-blue">Local LPG Information</a>
        <span className="mx-2" aria-hidden="true">/</span>
        <span className="text-foreground">{meta.title}</span>
      </nav>
      <div className="rounded-xl border bg-card p-6 shadow-sm md:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy md:text-3xl">{meta.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{meta.description}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={`/admin/local-information/${group}/new`} className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90">Add {meta.singular}</a>
          <a href="/admin/local-information" className="inline-flex h-10 items-center rounded-md border bg-background px-4 text-sm font-medium shadow-sm hover:bg-muted">Manage All Local Information</a>
        </div>
      </div>
    </div>
  );
}
