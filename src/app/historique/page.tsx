import type { Metadata } from 'next';
import { getChanges } from '@/lib/db/repositories/changes';
import HistoryContent from './history-content';

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
    since: '2026-03-27',
    limit: PAGE_SIZE,
    offset,
  }).catch(() => ({ total: 0, changes: [] }));

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <HistoryContent
      total={total}
      changes={changes}
      eventType={eventType}
      pageNum={pageNum}
      totalPages={totalPages}
    />
  );
}
