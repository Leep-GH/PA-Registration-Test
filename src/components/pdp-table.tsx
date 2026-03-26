'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Pdp } from '@/lib/db/schema';

type SortKey = 'name' | 'status' | 'registrationDate' | 'firstSeenAt';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'registered' | 'candidate' | 'removed';

const STATUS_LABELS: Record<string, string> = {
  registered: 'Immatriculée',
  candidate: 'Candidate',
  removed: 'Retirée',
};

const STATUS_BADGE: Record<string, string> = {
  registered: 'status-badge-registered',
  candidate: 'status-badge-candidate',
  removed: 'status-badge-removed',
};

interface Props {
  pdps: Pdp[];
}

export default function PdpTable({ pdps }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const filtered = pdps
    .filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.slug.includes(q) ||
          (p.registrationNumber?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = a.name.localeCompare(b.name, 'fr');
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'registrationDate':
          cmp = (a.registrationDate ?? '').localeCompare(b.registrationDate ?? '');
          break;
        case 'firstSeenAt':
          cmp = a.firstSeenAt.localeCompare(b.firstSeenAt);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

  function SortArrow({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="ml-1 text-navy/15">↕</span>;
    return <span className="ml-1 text-accent">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1">
          {(['all', 'registered', 'candidate', 'removed'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-3 min-h-[44px] text-sm font-body font-medium uppercase tracking-wide transition-colors cursor-pointer select-none ${
                statusFilter === s
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-navy/55 hover:text-navy'
              }`}
            >
              {s === 'all' ? 'Tous' : STATUS_LABELS[s] ?? s}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto border border-navy/15 bg-cream rounded px-3 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-navy/30"
        />
      </div>

      <p className="text-xs font-mono text-navy/40 uppercase tracking-wider">
        {filtered.length} plateforme{filtered.length !== 1 ? 's agréée' : ' agréée'}{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm font-body">
          <thead>
            <tr className="border-b-2 border-navy/10">
              {(
                [
                  { key: 'name' as SortKey, label: 'Nom' },
                  { key: 'status' as SortKey, label: 'Statut' },
                  { key: null, label: 'N° immatriculation' },
                  { key: 'registrationDate' as SortKey, label: 'Date' },
                  { key: null, label: 'Site web' },
                  { key: 'firstSeenAt' as SortKey, label: 'Première obs.' },
                ] as { key: SortKey | null; label: string }[]
              ).map(({ key, label }) => (
                <th
                  key={label}
                  className={`px-3 py-2.5 text-left text-[11px] font-body font-semibold text-navy/50 uppercase tracking-widest whitespace-nowrap ${
                    key ? 'cursor-pointer hover:text-navy select-none' : ''
                  }`}
                  onClick={() => key && handleSort(key)}
                >
                  {label}
                  {key && <SortArrow col={key} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-navy/40 font-body">
                  Aucune plateforme agréée trouvée.
                </td>
              </tr>
            ) : (
              filtered.map((pdp) => (
                <tr key={pdp.id} className="border-b border-navy/5 hover:bg-navy/[0.02] transition-colors">
                  <td className="px-3 py-2.5 font-medium">
                    <Link
                      href={`/pdp/${pdp.slug}`}
                      className="text-navy hover:text-accent transition-colors"
                    >
                      {pdp.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={
                        STATUS_BADGE[pdp.status] ?? 'status-badge border-l-gray-400 text-gray-600'
                      }
                    >
                      {STATUS_LABELS[pdp.status] ?? pdp.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-navy/50">
                    {pdp.registrationNumber ?? '—'}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-navy/50 whitespace-nowrap">
                    {pdp.registrationDate ?? '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    {pdp.websiteUrl ? (
                      <a
                        href={pdp.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline text-xs font-mono truncate block max-w-[160px]"
                      >
                        {pdp.websiteUrl.replace(/^https?:\/\//, '')}
                      </a>
                    ) : (
                      <span className="text-navy/20">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-navy/50 whitespace-nowrap">
                    {new Date(pdp.firstSeenAt).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
