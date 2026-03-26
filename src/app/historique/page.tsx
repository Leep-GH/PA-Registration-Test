import type { Metadata } from 'next';
import Link from 'next/link';
import { getChanges } from '@/lib/db/repositories/changes';
import ChangeTimeline from '@/components/change-timeline';

export const metadata: Metadata = {
  title: 'Historique des modifications',
  description: "Historique complet des changements détectés dans le registre DGFiP des PDP.",
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Historique des modifications</h1>
        <p className="mt-2 text-gray-600">
          Toutes les modifications détectées dans le registre DGFiP depuis le démarrage du tracker.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-gray-500 mr-1">Filtrer :</span>
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
              className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
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
          className="ml-auto px-3 py-1 text-sm text-blue-600 border border-blue-300 rounded-full hover:bg-blue-50"
        >
          Télécharger CSV
        </a>
      </div>

      <p className="text-sm text-gray-500">
        {total} modification{total !== 1 ? 's' : ''} au total
      </p>

      <ChangeTimeline changes={changes} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex gap-2 justify-center pt-4">
          {pageNum > 1 && (
            <Link
              href={`?${eventType ? `type=${eventType}&` : ''}page=${pageNum - 1}`}
              className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              ← Précédent
            </Link>
          )}
          <span className="px-4 py-2 text-sm text-gray-500">
            Page {pageNum} / {totalPages}
          </span>
          {pageNum < totalPages && (
            <Link
              href={`?${eventType ? `type=${eventType}&` : ''}page=${pageNum + 1}`}
              className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              Suivant →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
