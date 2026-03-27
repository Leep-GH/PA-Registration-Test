'use client';

import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/i18n';
import StatsBar from '@/components/stats-bar';
import PdpTable from '@/components/pdp-table';
import type { Pdp } from '@/lib/db/schema';

interface DashboardContentProps {
  pdps: Pdp[];
  lastRun: { runAt: string } | null;
  registeredCount: number;
  candidateCount: number;
}

export default function DashboardContent({
  pdps,
  lastRun,
  registeredCount,
  candidateCount,
}: DashboardContentProps) {
  const { language } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl text-navy">
          {t(language, 'pageTitle')}
        </h1>
        <p className="mt-3 text-navy/60 font-body text-sm leading-relaxed max-w-2xl">
          {t(language, 'pageDescription')}{' '}
          <a
            href="https://www.impots.gouv.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            {t(language, 'sourceLink')}
          </a>
        </p>
        {lastRun && (
          <p className="mt-2 text-xs font-mono text-navy/40 uppercase tracking-wider">
            {t(language, 'lastUpdated')}{' '}
            {new Date(lastRun.runAt).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US', {
              dateStyle: 'long',
              timeStyle: 'short',
            })}
          </p>
        )}
        <div className="hr-rule mt-6" />
      </div>

      <StatsBar
        registeredCount={registeredCount}
        candidateCount={candidateCount}
      />

      <PdpTable pdps={pdps} />
    </div>
  );
}
