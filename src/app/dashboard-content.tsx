'use client';

import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/i18n';
import PdpTable from '@/components/pdp-table';
import type { Pdp, PeppolAp } from '@/lib/db/schema';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1600&q=80';

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

function HeroStat({ value, label, accent = false }: { value: number; label: string; accent?: boolean }) {
  return (
    <div>
      <span className={`font-display text-5xl sm:text-6xl tabular-nums ${accent ? 'text-accent' : 'text-white'}`}>
        {value}
      </span>
      <span className="block text-cream/45 text-[10px] font-body uppercase tracking-widest mt-1.5">
        {label}
      </span>
    </div>
  );
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
    <>
      {/* Full-bleed hero */}
      <div
        className="-mx-4 -mt-10 relative overflow-hidden min-h-[400px] sm:min-h-[460px]"
        style={{
          backgroundImage: `url(${HERO_IMAGE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-navy/96 via-navy/88 to-navy/65" />
        <div className="relative z-10 px-4 pt-16 pb-14 sm:pt-20 sm:pb-16">
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl text-white tracking-tight leading-none">
            {t(language, 'pageTitle')}
          </h1>
          <p className="mt-4 text-cream/70 font-body text-sm sm:text-base max-w-lg leading-relaxed">
            {t(language, 'pageDescription')}
          </p>
          {lastRun && (
            <p className="mt-2 text-cream/30 text-[10px] font-mono uppercase tracking-widest">
              {t(language, 'lastUpdated')}{' '}
              {new Date(lastRun.runAt).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US', {
                dateStyle: 'long',
                timeStyle: 'short',
              })}
            </p>
          )}
          <div className="mt-10 flex gap-10 sm:gap-16">
            <HeroStat value={registeredCount} label={t(language, 'statsRegistered')} />
            <HeroStat value={candidateCount} label={t(language, 'statsCandidate')} accent />
          </div>
          <p className="mt-8 text-cream/30 text-[10px] font-body">
            {t(language, 'sourcesLabel')}{' '}
            <a
              href="https://www.impots.gouv.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cream/50 hover:text-cream transition-colors underline underline-offset-2"
            >
              {t(language, 'sourceLink')}
            </a>
            {' · '}
            <a
              href="https://peppol.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cream/50 hover:text-cream transition-colors underline underline-offset-2"
            >
              {t(language, 'peppolSourceLink')}
            </a>
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="mt-10">
        <PdpTable pdps={pdps} linkedPdpIds={linkedPdpIds} peppolOnlyAps={peppolOnlyAps} />
      </div>
    </>
  );
}


