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
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-navy">
          {t(language, 'historyTitle')}
        </h1>
        <p className="mt-3 text-slate-500 font-body text-sm leading-relaxed max-w-2xl">
          {language === 'en'
            ? 'Complete history of all changes detected in the DGFiP registry of approved platforms since tracker launch.'
            : 'Toutes les modifications détectées dans le registre DGFiP des Plateformes Agréées depuis le démarrage du tracker.'}
        </p>
        <div className="border-t border-slate-200 mt-6" />
      </div>

      {/* Tracking-start notice */}
      <div className="flex items-start gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-xs font-body text-blue-700">
        <span className="mt-0.5 text-blue-400">ℹ</span>
        <span>
          {language === 'en'
            ? 'Tracking started 26 March 2026 — changes shown from 27 March onwards.'
            : 'Le suivi a démarré le 26 mars 2026 — les modifications sont affichées à partir du 27 mars.'}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-body font-medium text-slate-400 uppercase tracking-wide mr-1">{labels.filter}</span>
        {filterOptions.map(({ label, value }) => {
          const isActive = eventType === value;
          const href = value ? `?type=${value}` : '?';
          return (
            <Link
              key={label}
              href={href}
              className={`px-3.5 py-1.5 inline-flex items-center text-xs font-body font-semibold rounded-lg transition-all ${
                isActive
                  ? 'bg-accent text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-navy'
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
          className="ml-auto px-3 py-1 text-xs font-body font-medium text-accent hover:text-accent-hover transition-colors"
        >
          {labels.download}
        </a>
      </div>

      <p className="text-xs font-body font-medium text-slate-400">
        {labels.total(total)}
      </p>

      <ChangeTimeline changes={changes} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex gap-2 justify-center pt-4">
          {pageNum > 1 && (
            <Link
              href={`?${eventType ? `type=${eventType}&` : ''}page=${pageNum - 1}`}
              className="px-4 py-2 text-sm font-body font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
            >
              {labels.previous}
            </Link>
          )}
          <span className="px-4 py-2 text-xs font-body font-medium text-slate-400">
            Page {pageNum} / {totalPages}
          </span>
          {pageNum < totalPages && (
            <Link
              href={`?${eventType ? `type=${eventType}&` : ''}page=${pageNum + 1}`}
              className="px-4 py-2 text-sm font-body font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
            >
              {labels.next}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
