'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/i18n';
import type { PeppolAp } from '@/lib/db/schema';

interface Props {
  ap: PeppolAp;
}

export default function PeppolDetailContent({ ap }: Props) {
  const { language } = useLanguage();
  const locale = language === 'fr' ? 'fr-FR' : 'en-US';

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString(locale, { dateStyle: 'long' });
  }

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
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-navy truncate">{ap.name}</h1>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 text-xs font-body font-semibold rounded-lg bg-blue-50 text-blue-700 whitespace-nowrap">
            {t(language, 'peppolDetailOnlyBadge')}
          </span>
        </div>

        {/* Not-a-PA notice */}
        <div className="mt-5 flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <span className="text-amber-500 text-base leading-none mt-0.5" aria-hidden="true">⚠</span>
          <p className="text-xs font-body text-amber-800 leading-relaxed">
            {t(language, 'peppolDetailNotPaNotice')}
          </p>
        </div>

        <div className="border-t border-slate-200 mt-6" />

        <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {ap.country && (
            <>
              <dt className="text-xs font-body font-medium text-slate-400 uppercase tracking-wide">
                {t(language, 'peppolDetailCountry')}
              </dt>
              <dd className="text-navy font-body">{ap.country}</dd>
            </>
          )}
          {ap.authority && (
            <>
              <dt className="text-xs font-body font-medium text-slate-400 uppercase tracking-wide">
                {t(language, 'peppolDetailAuthority')}
              </dt>
              <dd className="text-navy font-body">{ap.authority}</dd>
            </>
          )}
          <>
            <dt className="text-xs font-body font-medium text-slate-400 uppercase tracking-wide">
              {t(language, 'peppolDetailCertifications')}
            </dt>
            <dd>
              <div className="flex gap-1.5">
                {ap.apCertified && (
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-body font-semibold rounded-md bg-blue-50 text-blue-700">
                    AP
                  </span>
                )}
                {ap.smpCertified && (
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-body font-semibold rounded-md bg-purple-50 text-purple-700">
                    SMP
                  </span>
                )}
                {!ap.apCertified && !ap.smpCertified && (
                  <span className="text-slate-400 font-body">—</span>
                )}
              </div>
            </dd>
          </>
          <>
            <dt className="text-xs font-body font-medium text-slate-400 uppercase tracking-wide">
              {t(language, 'peppolDetailFirstSeen')}
            </dt>
            <dd className="text-navy font-body">{fmtDate(ap.firstSeenAt)}</dd>
          </>
          <>
            <dt className="text-xs font-body font-medium text-slate-400 uppercase tracking-wide">
              {t(language, 'peppolDetailLastSeen')}
            </dt>
            <dd className="text-navy font-body">{fmtDate(ap.lastSeenAt)}</dd>
          </>
          <>
            <dt className="text-xs font-body font-medium text-slate-400 uppercase tracking-wide">
              {t(language, 'peppolDetailSource')}
            </dt>
            <dd>
              <a
                href="https://peppol.org/peppolauthority/community-of-certified-providers/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:text-accent-hover text-sm transition-colors"
              >
                {t(language, 'peppolDetailViewOnPeppol')}
              </a>
            </dd>
          </>
        </dl>
      </div>
    </div>
  );
}
