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
  registered: 'bg-green-100 text-green-800 border border-green-200',
  candidate: 'bg-amber-100 text-amber-800 border border-amber-200',
  removed: 'bg-red-100 text-red-800 border border-red-200',
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
    if (sortKey !== col) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
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
              className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                statusFilter === s
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
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
          className="ml-auto border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <p className="text-sm text-gray-500">
        {filtered.length} plateforme{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
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
                  className={`px-4 py-3 text-left font-medium text-gray-700 whitespace-nowrap ${
                    key ? 'cursor-pointer hover:text-blue-600 select-none' : ''
                  }`}
                  onClick={() => key && handleSort(key)}
                >
                  {label}
                  {key && <SortArrow col={key} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Aucune plateforme trouvée.
                </td>
              </tr>
            ) : (
              filtered.map((pdp) => (
                <tr key={pdp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/pdp/${pdp.slug}`}
                      className="text-blue-600 hover:underline"
                    >
                      {pdp.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_BADGE[pdp.status] ?? 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {STATUS_LABELS[pdp.status] ?? pdp.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {pdp.registrationNumber ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {pdp.registrationDate ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {pdp.websiteUrl ? (
                      <a
                        href={pdp.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs truncate block max-w-[160px]"
                      >
                        {pdp.websiteUrl.replace(/^https?:\/\//, '')}
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
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
