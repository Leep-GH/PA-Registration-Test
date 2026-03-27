'use client';

import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/i18n';

interface Props {
  registeredCount: number;
  candidateCount: number;
}

export default function StatsBar({ registeredCount, candidateCount }: Props) {
  const { language } = useLanguage();

  return (
    <div className="flex items-baseline gap-12 sm:gap-16">
      <Stat value={registeredCount} label={t(language, 'statsRegistered')} accent />
      <Stat value={candidateCount} label={t(language, 'statsCandidate')} />
    </div>
  );
}

function Stat({ value, label, accent = false }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-start flex-shrink-0">
      <span className={`font-display text-5xl sm:text-6xl tabular-nums ${accent ? 'text-accent' : 'text-navy'}`}>
        {value}
      </span>
      <span className="text-[11px] font-body text-navy/40 uppercase tracking-wider mt-1">{label}</span>
    </div>
  );
}
