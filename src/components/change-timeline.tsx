'use client';

import type { ChangeEvent } from '@/lib/db/schema';

interface ChangeEventWithPdp extends ChangeEvent {
  pdpName: string;
  pdpSlug: string;
}

interface Props {
  changes: ChangeEventWithPdp[];
}

const EVENT_LABELS: Record<string, { label: string; badgeClass: string }> = {
  added: { label: 'Ajouté', badgeClass: 'status-badge-registered' },
  removed: { label: 'Retiré', badgeClass: 'status-badge-removed' },
  status_changed: { label: 'Modifié', badgeClass: 'status-badge-candidate' },
};

const BORDER_COLOURS: Record<string, string> = {
  added: 'border-l-emerald-600',
  removed: 'border-l-red-500',
  status_changed: 'border-l-amber-500',
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
      <div className="text-center py-12 text-navy/40 border border-dashed border-navy/10 rounded font-body">
        Aucun changement détecté depuis le lancement du tracker.
      </div>
    );
  }

  const groups = groupByDate(changes);

  return (
    <div className="space-y-10">
      {Array.from(groups.entries()).map(([date, events]) => (
        <div key={date}>
          <h2 className="text-xs font-mono font-medium text-navy/40 uppercase tracking-[0.2em] mb-4">
            {formatDate(date)}
          </h2>
          <div className="space-y-2">
            {events.map((event) => {
              const meta = EVENT_LABELS[event.eventType] ?? EVENT_LABELS.status_changed;
              const borderColour = BORDER_COLOURS[event.eventType] ?? 'border-l-gray-300';
              const oldVal = event.oldValue ? JSON.parse(event.oldValue) : null;
              const newVal = event.newValue ? JSON.parse(event.newValue) : null;

              return (
                <div
                  key={event.id}
                  className={`flex items-start gap-3 px-4 py-3 border-l-2 ${borderColour} hover:bg-navy/[0.02] transition-colors`}
                >
                  <span className={meta.badgeClass}>
                    {meta.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <a
                      href={`/pdp/${event.pdpSlug}`}
                      className="font-body font-medium text-navy hover:text-accent transition-colors truncate block"
                    >
                      {event.pdpName}
                    </a>
                    {event.eventType === 'status_changed' && oldVal && newVal && (
                      <p className="text-xs font-mono text-navy/40 mt-0.5">
                        {oldVal.status} → {newVal.status}
                      </p>
                    )}
                  </div>
                  <time className="text-[10px] font-mono text-navy/30 whitespace-nowrap uppercase tracking-wider">
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
