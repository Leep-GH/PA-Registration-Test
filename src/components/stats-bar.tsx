'use client';

import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/i18n';

interface Props {
  registeredCount: number;
  candidateCount: number;
  addedThisMonth: number;
  removedThisMonth: number;
}

export default function StatsBar({ registeredCount, candidateCount, addedThisMonth, removedThisMonth }: Props) {
  const { language } = useLanguage();

  return (
    <div className="flex items-baseline gap-8 sm:gap-12 overflow-x-auto py-2">
      <Stat value={registeredCount} label={t(language, 'statsRegistered')} accent />
      <div className="w-px h-8 bg-navy/10 flex-shrink-0" />
      <Stat value={candidateCount} label={t(language, 'statsCandidate')} />
      <div className="w-px h-8 bg-navy/10 flex-shrink-0" />
      <Stat value={addedThisMonth} label={t(language, 'statsAdded')} />
      <div className="w-px h-8 bg-navy/10 flex-shrink-0" />
      <Stat value={removedThisMonth} label={t(language, 'statsRemoved')} />
    </div>
  );
}

function Stat({ value, label, accent = false }: { value: number; label: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-start flex-shrink-0">
      <span className={`font-display text-4xl sm:text-5xl tabular-nums ${accent ? 'text-accent' : 'text-navy'}`}>{value}</span>
      <span className="text-[11px] font-body text-navy/40 uppercase tracking-wider mt-1">{label}</span>
    </div>
  );
}
