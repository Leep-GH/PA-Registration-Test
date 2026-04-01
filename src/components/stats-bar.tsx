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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <StatCard value={registeredCount} label={t(language, 'statsRegistered')} color="emerald" />
      <StatCard value={candidateCount} label={t(language, 'statsCandidate')} color="amber" />
    </div>
  );
}

function StatCard({ value, label, color }: { value: number; label: string; color: 'emerald' | 'amber' }) {
  const dotColor = color === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500';
  return (
    <div className="card px-5 py-4">
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span className="text-xs font-body font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
      <span className="font-display font-extrabold text-3xl tabular-nums text-navy">
        {value}
      </span>
    </div>
  );
}
