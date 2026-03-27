'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/i18n';
import type { Pdp } from '@/lib/db/schema';

interface Props {
  pdp: Pdp;
  history: Array<{
    id: number;
    eventType: string;
    oldValue: string | null;
    newValue: string | null;
    detectedAt: string;
  }>;
}

const STATUS_LABELS: Record<string, Record<string, string>> = {
  en: {
    registered: 'Registered',
    candidate: 'Candidate',
    removed: 'Withdrawn',
  },
  fr: {
    registered: 'Immatriculée',
    candidate: 'Candidate',
    removed: 'Retirée',
  },
};

const STATUS_CLASSES: Record<string, string> = {
  registered: 'status-badge-registered',
  candidate: 'status-badge-candidate',
  removed: 'status-badge-removed',
};

const EVENT_LABELS: Record<string, Record<string, { label: string; classes: string }>> = {
  en: {
    added: { label: 'Added', classes: 'status-badge-registered' },
    removed: { label: 'Removed', classes: 'status-badge-removed' },
    status_changed: { label: 'Status changed', classes: 'status-badge-candidate' },
  },
  fr: {
    added: { label: 'Ajout', classes: 'status-badge-registered' },
    removed: { label: 'Suppression', classes: 'status-badge-removed' },
    status_changed: { label: 'Changement', classes: 'status-badge-candidate' },
  },
};

export default function PdpDetailContent({ pdp, history }: Props) {
  const { language } = useLanguage();
  const locale = language === 'fr' ? 'fr-FR' : 'en-US';

  const statusClass = STATUS_CLASSES[pdp.status] ?? 'status-badge border-l-gray-400 text-navy/50';
  const statusLabel = STATUS_LABELS[language]?.[pdp.status] ?? pdp.status;

  return (
    <div className="space-y-10">
      <div>
        <Link href="/" className="text-xs font-mono text-accent uppercase tracking-wider hover:underline">
          {t(language, 'detailBackToRegistry')}
        </Link>
      </div>

      <div className="border border-navy/10 p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-3xl text-navy truncate">{pdp.name}</h1>
            {pdp.registrationNumber && (
              <p className="text-xs font-mono text-navy/40 mt-2">
                {t(language, 'detailRegistrationNumber')} {pdp.registrationNumber}
              </p>
            )}
          </div>
          <span className={statusClass}>
            {statusLabel}
          </span>
        </div>

        <div className="hr-rule mt-6" />

        <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {pdp.registrationDate && (
            <>
              <dt className="text-[10px] font-mono text-navy/40 uppercase tracking-widest">
                {t(language, 'detailRegistrationDate')}
              </dt>
              <dd className="text-navy font-body">{pdp.registrationDate}</dd>
            </>
          )}
          {pdp.websiteUrl && (
            <>
              <dt className="text-[10px] font-mono text-navy/40 uppercase tracking-widest">
                {t(language, 'detailWebsite')}
              </dt>
              <dd>
                <a
                  href={pdp.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline truncate block font-mono text-xs"
                >
                  {pdp.websiteUrl}
                </a>
              </dd>
            </>
          )}
          {pdp.contactEmail && (
            <>
              <dt className="text-[10px] font-mono text-navy/40 uppercase tracking-widest">
                {t(language, 'detailContactEmail')}
              </dt>
              <dd>
                <a
                  href={`mailto:${pdp.contactEmail}`}
                  className="text-accent hover:underline truncate block font-mono text-xs"
                >
                  {pdp.contactEmail}
                </a>
              </dd>
            </>
          )}
          <dt className="text-[10px] font-mono text-navy/40 uppercase tracking-widest">
            {t(language, 'detailFirstTracked')}
          </dt>
          <dd className="text-navy font-body">
            {new Date(pdp.firstSeenAt).toLocaleDateString(locale, { dateStyle: 'long' })}
          </dd>
          <dt className="text-[10px] font-mono text-navy/40 uppercase tracking-widest">
            {t(language, 'detailLastTracked')}
          </dt>
          <dd className="text-navy font-body">
            {new Date(pdp.lastSeenAt).toLocaleDateString(locale, { dateStyle: 'long' })}
          </dd>
          <dt className="text-[10px] font-mono text-navy/40 uppercase tracking-widest">
            {t(language, 'detailSource')}
          </dt>
          <dd>
            <a
              href="https://www.impots.gouv.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline font-mono text-xs"
            >
              impots.gouv.fr
            </a>
          </dd>
        </dl>
      </div>

      {/* Change history */}
      <div>
        <h2 className="font-display text-xl text-navy mb-4">
          {t(language, 'detailChangeHistory')}
        </h2>

        {history.length === 0 ? (
          <p className="text-navy/40 text-sm font-body">
            {t(language, 'detailNoChanges')}
          </p>
        ) : (
          <ol className="relative border-l border-navy/10 ml-3 space-y-6">
            {history.map((event) => {
              const et = EVENT_LABELS[language]?.[event.eventType] ?? {
                label: event.eventType,
                classes: 'bg-gray-100 text-gray-800',
              };
              let detail = '';
              try {
                const ov = event.oldValue ? JSON.parse(event.oldValue) : null;
                const nv = event.newValue ? JSON.parse(event.newValue) : null;
                if (event.eventType === 'status_changed' && ov && nv) {
                  detail = `${ov.status} → ${nv.status}`;
                }
              } catch { /* ignore */ }

              return (
                <li key={event.id} className="ml-4">
                  <div className="absolute w-2 h-2 bg-accent rounded-full -left-1 border-2 border-cream" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={et.classes}>
                      {et.label}
                    </span>
                    <time className="text-[10px] font-mono text-navy/30 uppercase tracking-wider">
                      {new Date(event.detectedAt).toLocaleString(locale, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </time>
                  </div>
                  {detail && <p className="mt-1 text-xs font-mono text-navy/40">{detail}</p>}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
