'use client';

import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/i18n';
import StatsBar from '@/components/stats-bar';
import PdpTable from '@/components/pdp-table';
import type { Pdp, PeppolAp } from '@/lib/db/schema';

interface DashboardContentProps {
  pdps: Pdp[];
  lastRun: { runAt: string } | null;
  registeredCount: number;
  candidateCount: number;
  /** Set of pdpIds that also appear in the Peppol AP registry */
  linkedPdpIds: Set<number>;
  /** Peppol APs (DGFIP authority) that have no matching PA record */
  peppolOnlyAps: PeppolAp[];
}

export default function DashboardContent({
  pdps,
  lastRun,
  registeredCount,
  candidateCount,
  linkedPdpIds,
  peppolOnlyAps,
}: DashboardContentProps) {
  const { language } = useLanguage();

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent via-blue-600 to-blue-800 p-8 sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="relative z-10">
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
            {t(language, 'pageTitle')}
          </h1>
          <p className="mt-3 text-blue-100 font-body text-sm leading-relaxed max-w-xl">
            {t(language, 'pageDescription')}
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs font-body text-blue-200">
            <span>{t(language, 'sourcesLabel')}</span>
            <a
              href="https://www.impots.gouv.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-white underline underline-offset-2 transition-colors"
            >
              {t(language, 'sourceLink')}
            </a>
            <span className="text-blue-300">·</span>
            <a
              href="https://peppol.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-white underline underline-offset-2 transition-colors"
            >
              {t(language, 'peppolSourceLink')}
            </a>
          </div>
          {lastRun && (
            <p className="mt-3 text-[11px] font-mono text-blue-200/70 uppercase tracking-wider">
              {t(language, 'lastUpdated')}{' '}
              {new Date(lastRun.runAt).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US', {
                dateStyle: 'long',
                timeStyle: 'short',
              })}
            </p>
          )}
        </div>
      </div>

      <StatsBar
        registeredCount={registeredCount}
        candidateCount={candidateCount}
      />

      <PdpTable pdps={pdps} linkedPdpIds={linkedPdpIds} peppolOnlyAps={peppolOnlyAps} />
    </div>
  );
}

