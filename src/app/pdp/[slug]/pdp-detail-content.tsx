'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/i18n';
import type { Pdp, PeppolAp } from '@/lib/db/schema';

interface Props {
  pdp: Pdp;
  history: Array<{
    id: number;
    eventType: string;
    oldValue: string | null;
    newValue: string | null;
    detectedAt: string;
  }>;
  linkedPeppolAp?: PeppolAp | null;
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

export default function PdpDetailContent({ pdp, history, linkedPeppolAp }: Props) {
  const { language } = useLanguage();
  const locale = language === 'fr' ? 'fr-FR' : 'en-US';

  const statusClass = STATUS_CLASSES[pdp.status] ?? 'status-badge border-l-gray-400 text-navy/50';
  const statusLabel = STATUS_LABELS[language]?.[pdp.status] ?? pdp.status;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-body font-medium text-accent hover:text-accent-hover transition-colors">
          <span>←</span> {t(language, 'detailBackToRegistry')}
        </Link>
      </div>

      <div className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-navy truncate">{pdp.name}</h1>
            {pdp.registrationNumber && (
              <p className="text-xs font-body text-slate-400 mt-2">
                {t(language, 'detailRegistrationNumber')} {pdp.registrationNumber}
              </p>
            )}
          </div>
          <span className={statusClass}>
            {statusLabel}
          </span>
        </div>

        <div className="border-t border-slate-200 mt-6" />

        <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {pdp.registrationDate && (
            <>
              <dt className="text-xs font-body font-medium text-slate-400 uppercase tracking-wide">
                {t(language, 'detailRegistrationDate')}
              </dt>
              <dd className="text-navy font-body">{pdp.registrationDate}</dd>
            </>
          )}
          {pdp.websiteUrl && (
            <>
              <dt className="text-xs font-body font-medium text-slate-400 uppercase tracking-wide">
                {t(language, 'detailWebsite')}
              </dt>
              <dd>
                <a
                  href={pdp.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accent-hover truncate block text-sm transition-colors"
                >
                  {pdp.websiteUrl}
                </a>
              </dd>
            </>
          )}
          {pdp.contactEmail && (
            <>
              <dt className="text-xs font-body font-medium text-slate-400 uppercase tracking-wide">
                {t(language, 'detailContactEmail')}
              </dt>
              <dd>
                <a
                  href={`mailto:${pdp.contactEmail}`}
                  className="text-accent hover:text-accent-hover truncate block text-sm transition-colors"
                >
                  {pdp.contactEmail}
                </a>
              </dd>
            </>
          )}
          {pdp.physicalAddress && (
            <>
              <dt className="text-xs font-body font-medium text-slate-400 uppercase tracking-wide">
                {t(language, 'detailAddress')}
              </dt>
              <dd className="text-navy font-body">{pdp.physicalAddress}</dd>
            </>
          )}
          <dt className="text-xs font-body font-medium text-slate-400 uppercase tracking-wide">
            {t(language, 'detailFirstTracked')}
          </dt>
          <dd className="text-navy font-body">
            {new Date(pdp.firstSeenAt).toLocaleDateString(locale, { dateStyle: 'long' })}
          </dd>
          <dt className="text-xs font-body font-medium text-slate-400 uppercase tracking-wide">
            {t(language, 'detailLastTracked')}
          </dt>
          <dd className="text-navy font-body">
            {new Date(pdp.lastSeenAt).toLocaleDateString(locale, { dateStyle: 'long' })}
          </dd>
          <dt className="text-xs font-body font-medium text-slate-400 uppercase tracking-wide">
            {t(language, 'detailSource')}
          </dt>
          <dd>
            <a
              href="https://www.impots.gouv.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-hover text-sm transition-colors"
            >
              impots.gouv.fr
            </a>
          </dd>
        </dl>
      </div>

      {/* Peppol AP section */}
      {linkedPeppolAp && (
        <div className="card p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display font-bold text-xl text-navy">
              {t(language, 'detailPeppolSection')}
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-body font-semibold rounded-md bg-teal-50 text-teal-700">
              {t(language, 'badgeBothRegistries')}
            </span>
          </div>
          <p className="mt-3 text-sm font-body text-slate-500 max-w-prose">
            {t(language, 'detailPeppolExplainer')}
          </p>
          <div className="border-t border-slate-200 mt-4" />
          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <dt className="text-xs font-body font-medium text-slate-400 uppercase tracking-wide">
              {t(language, 'peppolApCountry')}
            </dt>
            <dd className="text-navy font-body">{linkedPeppolAp.country ?? '—'}</dd>
            <dt className="text-xs font-body font-medium text-slate-400 uppercase tracking-wide">
              {t(language, 'peppolApAuthority')}
            </dt>
            <dd className="text-navy font-body">{linkedPeppolAp.authority ?? '—'}</dd>
            <dt className="text-xs font-body font-medium text-slate-400 uppercase tracking-wide">
              {t(language, 'peppolApCertifications')}
            </dt>
            <dd>
              <div className="flex gap-1.5">
                {linkedPeppolAp.apCertified && (
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-body font-semibold rounded-md bg-blue-50 text-blue-700">AP</span>
                )}
                {linkedPeppolAp.smpCertified && (
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-body font-semibold rounded-md bg-purple-50 text-purple-700">SMP</span>
                )}
              </div>
            </dd>
            <dt className="text-xs font-body font-medium text-slate-400 uppercase tracking-wide">
              {t(language, 'detailSource')}
            </dt>
            <dd>
              <a
                href="https://peppol.org/members/peppol-certified-service-providers/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:text-accent-hover text-sm transition-colors"
              >
                peppol.org
              </a>
            </dd>
          </dl>
        </div>
      )}

      {/* Change history */}
      <div>
        <h2 className="font-display font-bold text-xl text-navy mb-4">
          {t(language, 'detailChangeHistory')}
        </h2>

        {history.length === 0 ? (
          <p className="text-slate-400 text-sm font-body">
            {t(language, 'detailNoChanges')}
          </p>
        ) : (
          <ol className="relative border-l border-slate-200 ml-3 space-y-6">
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
                    <time className="text-xs font-body text-slate-400">
                      {new Date(event.detectedAt).toLocaleString(locale, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </time>
                  </div>
                  {detail && <p className="mt-1 text-xs font-body text-slate-500">{detail}</p>}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
