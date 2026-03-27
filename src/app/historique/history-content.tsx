'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/i18n';
import ChangeTimeline from '@/components/change-timeline';
import type { ChangeEvent } from '@/lib/db/schema';

interface ChangeEventWithPdp extends ChangeEvent {
  pdpName: string;
  pdpSlug: string;
}

interface Props {
  total: number;
  changes: ChangeEventWithPdp[];
  eventType: 'added' | 'removed' | 'status_changed' | undefined;
  pageNum: number;
  totalPages: number;
}

const FILTER_LABELS = {
  en: {
    all: 'All',
    added: 'Additions',
    removed: 'Withdrawals',
    status_changed: 'Status changes',
    filter: 'Filter:',
    total: (count: number) => `${count} modification${count !== 1 ? 's' : ''} total`,
    download: 'Download CSV',
    previous: '← Previous',
    next: 'Next →',
  },
  fr: {
    all: 'Tous',
    added: 'Ajouts',
    removed: 'Suppressions',
    status_changed: 'Changements',
    filter: 'Filtrer :',
    total: (count: number) => `${count} modification${count !== 1 ? 's' : ''} au total`,
    download: 'Télécharger CSV',
    previous: '← Précédent',
    next: 'Suivant →',
  },
};

export default function HistoryContent({ total, changes, eventType, pageNum, totalPages }: Props) {
  const { language } = useLanguage();
  const labels = FILTER_LABELS[language];

  const filterOptions = [
    { label: labels.all, value: undefined },
    { label: labels.added, value: 'added' as const },
    { label: labels.removed, value: 'removed' as const },
    { label: labels.status_changed, value: 'status_changed' as const },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl text-navy">
          {t(language, 'historyTitle')}
        </h1>
        <p className="mt-3 text-navy/60 font-body text-sm leading-relaxed max-w-2xl">
          {language === 'en'
            ? 'Complete history of all changes detected in the DGFiP registry of approved platforms since tracker launch.'
            : 'Toutes les modifications détectées dans le registre DGFiP des Plateformes Agréées depuis le démarrage du tracker.'}
        </p>
        <div className="hr-rule mt-6" />
      </div>

      {/* Tracking-start notice */}
      <div className="flex items-start gap-2 px-4 py-3 bg-navy/[0.03] border border-navy/10 rounded text-xs font-body text-navy/55">
        <span className="mt-0.5 text-navy/30">ℹ</span>
        <span>
          {language === 'en'
            ? 'Tracking started 26 March 2026 — changes shown from 27 March onwards.'
            : 'Le suivi a démarré le 26 mars 2026 — les modifications sont affichées à partir du 27 mars.'}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-body text-navy/40 uppercase tracking-wide mr-1">{labels.filter}</span>
        {filterOptions.map(({ label, value }) => {
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
          {labels.download}
        </a>
      </div>

      <p className="text-xs font-mono text-navy/40 uppercase tracking-wider">
        {labels.total(total)}
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
              {labels.previous}
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
              {labels.next}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
