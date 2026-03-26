'use client';

import type { ChangeEvent } from '@/lib/db/schema';

interface ChangeEventWithPdp extends ChangeEvent {
  pdpName: string;
  pdpSlug: string;
}

interface Props {
  changes: ChangeEventWithPdp[];
}

const EVENT_LABELS: Record<string, { label: string; colour: string }> = {
  added: { label: 'Ajouté', colour: 'bg-green-100 text-green-800 border-green-200' },
  removed: { label: 'Retiré', colour: 'bg-red-100 text-red-800 border-red-200' },
  status_changed: { label: 'Statut modifié', colour: 'bg-amber-100 text-amber-800 border-amber-200' },
};

const BORDER_COLOURS: Record<string, string> = {
  added: 'border-green-400',
  removed: 'border-red-400',
  status_changed: 'border-amber-400',
};

function groupByDate(changes: ChangeEventWithPdp[]): Map<string, ChangeEventWithPdp[]> {
  const groups = new Map<string, ChangeEventWithPdp[]>();
  for (const change of changes) {
    const date = change.detectedAt.slice(0, 10);
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date)!.push(change);
  }
  return groups;
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ChangeTimeline({ changes }: Props) {
  if (changes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 border border-dashed border-gray-300 rounded-lg">
        Aucun changement détecté depuis le lancement du tracker.
      </div>
    );
  }

  const groups = groupByDate(changes);

  return (
    <div className="space-y-8">
      {Array.from(groups.entries()).map(([date, events]) => (
        <div key={date}>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {formatDate(date)}
          </h2>
          <div className="space-y-3">
            {events.map((event) => {
              const meta = EVENT_LABELS[event.eventType] ?? EVENT_LABELS.status_changed;
              const borderColour = BORDER_COLOURS[event.eventType] ?? 'border-gray-300';
              const oldVal = event.oldValue ? JSON.parse(event.oldValue) : null;
              const newVal = event.newValue ? JSON.parse(event.newValue) : null;

              return (
                <div
                  key={event.id}
                  className={`flex items-start gap-3 p-4 bg-white border-l-4 ${borderColour} rounded-r-lg shadow-sm`}
                >
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${meta.colour}`}
                  >
                    {meta.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <a
                      href={`/pdp/${event.pdpSlug}`}
                      className="font-medium text-gray-900 hover:text-blue-600 hover:underline truncate block"
                    >
                      {event.pdpName}
                    </a>
                    {event.eventType === 'status_changed' && oldVal && newVal && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {oldVal.status} → {newVal.status}
                      </p>
                    )}
                  </div>
                  <time className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(event.detectedAt).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
