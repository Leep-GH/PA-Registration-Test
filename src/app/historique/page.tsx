import type { Metadata } from 'next';
import Link from 'next/link';
import { getChanges } from '@/lib/db/repositories/changes';
import ChangeTimeline from '@/components/change-timeline';

export const metadata: Metadata = {
  title: 'Historique des modifications',
  description: "Historique complet des changements détectés dans le registre DGFiP des Plateformes Agréées (ex-PDP).",
};

export const revalidate = 3600;

const VALID_TYPES = ['added', 'removed', 'status_changed'] as const;
type EventType = (typeof VALID_TYPES)[number];
const PAGE_SIZE = 50;

interface Props {
  searchParams: { type?: string; page?: string };
}

export default async function HistoriquePage({ searchParams }: Props) {
  // Validate and sanitise query params
  const rawType = searchParams.type;
  const eventType: EventType | undefined =
    rawType && VALID_TYPES.includes(rawType as EventType)
      ? (rawType as EventType)
      : undefined;

  const pageNum = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  const offset = (pageNum - 1) * PAGE_SIZE;

  const { total, changes } = await getChanges({
    type: eventType,
    limit: PAGE_SIZE,
    offset,
  }).catch(() => ({ total: 0, changes: [] }));

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl text-navy">Historique des modifications</h1>
        <p className="mt-3 text-navy/60 font-body text-sm leading-relaxed max-w-2xl">
          Toutes les modifications détectées dans le registre DGFiP des Plateformes Agréées depuis le démarrage du tracker.
        </p>
        <div className="hr-rule mt-6" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-body text-navy/40 uppercase tracking-wide mr-1">Filtrer :</span>
        {[
          { label: 'Tous', value: undefined },
          { label: 'Ajouts', value: 'added' },
          { label: 'Suppressions', value: 'removed' },
          { label: 'Changements', value: 'status_changed' },
        ].map(({ label, value }) => {
          const isActive = eventType === value;
          const href = value ? `?type=${value}` : '?';
          return (
            <Link
              key={label}
              href={href}
              className={`px-4 py-3 min-h-[44px] inline-flex items-center text-sm font-body font-medium uppercase tracking-wide transition-colors ${
                isActive
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-navy/55 hover:text-navy'
              }`}
            >
              {label}
            </Link>
          );
        })}

        {/* CSV download */}
        <a
          href="/api/v1/pdps?format=csv"
          download="pdps.csv"
          className="ml-auto px-3 py-1 text-xs font-mono text-accent uppercase tracking-wider hover:underline"
        >
          Télécharger CSV
        </a>
      </div>

      <p className="text-xs font-mono text-navy/40 uppercase tracking-wider">
        {total} modification{total !== 1 ? 's' : ''} au total
      </p>

      <ChangeTimeline changes={changes} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex gap-2 justify-center pt-4">
          {pageNum > 1 && (
            <Link
              href={`?${eventType ? `type=${eventType}&` : ''}page=${pageNum - 1}`}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-navy/50 border border-navy/10 hover:bg-navy/[0.02] transition-colors"
            >
              ← Précédent
            </Link>
          )}
          <span className="px-4 py-2 text-xs font-mono text-navy/40">
            Page {pageNum} / {totalPages}
          </span>
          {pageNum < totalPages && (
            <Link
              href={`?${eventType ? `type=${eventType}&` : ''}page=${pageNum + 1}`}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-navy/50 border border-navy/10 hover:bg-navy/[0.02] transition-colors"
            >
              Suivant →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
