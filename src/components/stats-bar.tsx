'use client';

import { useState } from 'react';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/i18n';

interface Props {
  registeredCount: number;
  candidateCount: number;
  addedThisMonth: number | null;
  removedThisMonth: number | null;
}

export default function StatsBar({ registeredCount, candidateCount, addedThisMonth, removedThisMonth }: Props) {
  const { language } = useLanguage();

  return (
    <div className="flex items-baseline gap-8 sm:gap-12 overflow-x-auto py-2">
      <Stat value={registeredCount} label={t(language, 'statsRegistered')} accent />
      <div className="w-px h-8 bg-navy/10 flex-shrink-0" />
      <Stat value={candidateCount} label={t(language, 'statsCandidate')} />
      <div className="w-px h-8 bg-navy/10 flex-shrink-0" />
      <Stat value={addedThisMonth} label={t(language, 'statsAdded')} tooltip={addedThisMonth === null ? t(language, 'statsNotEnoughData') : undefined} />
      <div className="w-px h-8 bg-navy/10 flex-shrink-0" />
      <Stat value={removedThisMonth} label={t(language, 'statsRemoved')} tooltip={removedThisMonth === null ? t(language, 'statsNotEnoughData') : undefined} />
    </div>
  );
}

function Stat({ value, label, accent = false, tooltip }: { value: number | null; label: string; accent?: boolean; tooltip?: string }) {
  const [hoveredStat, setHoveredStat] = useState(false);

  return (
    <div 
      className="flex flex-col items-start flex-shrink-0 relative"
      onMouseEnter={() => tooltip && setHoveredStat(true)}
      onMouseLeave={() => setHoveredStat(false)}
    >
      <span className={`font-display text-4xl sm:text-5xl tabular-nums ${accent ? 'text-accent' : 'text-navy'}`}>
        {value !== null ? value : '—'}
      </span>
      <span className="text-[11px] font-body text-navy/40 uppercase tracking-wider mt-1">{label}</span>
      {tooltip && hoveredStat && (
        <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-navy text-cream text-[10px] font-normal whitespace-nowrap rounded z-10 pointer-events-none">
          {tooltip}
        </div>
      )}
    </div>
  );
}
