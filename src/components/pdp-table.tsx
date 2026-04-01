'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';
import { t, type Language } from '@/lib/i18n';
import type { Pdp } from '@/lib/db/schema';

type SortKey = 'name' | 'status' | 'registrationDate' | 'firstSeenAt';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'registered' | 'candidate' | 'removed';
type RegistryFilter = 'all' | 'pa' | 'peppol_ap' | 'both';

const PAGE_SIZE = 25;

const STATUS_BADGE: Record<string, string> = {
  registered: 'status-badge-registered',
  candidate: 'status-badge-candidate',
  removed: 'status-badge-removed',
};

interface Props {
  pdps: Pdp[];
  /** Set of pdpIds that also appear in the Peppol AP registry */
  linkedPdpIds?: Set<number>;
  /** Set of peppolApIds: used when registryFilter='peppol_ap' or 'both' */
  peppolApIds?: Set<number>;
}

export default function PdpTable({ pdps, linkedPdpIds = new Set() }: Props) {
  const { language } = useLanguage();
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [registryFilter, setRegistryFilter] = useState<RegistryFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hoveredHeader, setHoveredHeader] = useState<string | null>(null);
  const [hoveredStatusCell, setHoveredStatusCell] = useState<string | null>(null);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  }

  function changeStatusFilter(s: StatusFilter) {
    setStatusFilter(s);
    setPage(1);
  }

  function changeRegistryFilter(r: RegistryFilter) {
    setRegistryFilter(r);
    setPage(1);
  }

  function changeSearch(q: string) {
    setSearch(q);
    setPage(1);
  }

  const filtered = useMemo(() => {
    return pdps
      .filter((p) => {
        // Status filter
        if (statusFilter !== 'all' && p.status !== statusFilter) return false;

        // Registry filter
        const isLinked = linkedPdpIds.has(p.id);
        if (registryFilter === 'pa' && isLinked) return false;          // PA-only: exclude linked
        if (registryFilter === 'peppol_ap' && !isLinked) return false;  // Peppol AP: only show certified
        if (registryFilter === 'both' && !isLinked) return false;       // Both: only show linked

        // Search
        if (search) {
          const q = search.toLowerCase();
          return (
            p.name.toLowerCase().includes(q) ||
            p.slug.includes(q)
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
  }, [pdps, statusFilter, registryFilter, linkedPdpIds, search, sortKey, sortDir]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  }, [filtered.length]);

  const safePage = useMemo(() => {
    return Math.min(page, totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    return filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  }, [filtered, safePage]);

  function SortArrow({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="ml-1 text-navy/15">↕</span>;
    return <span className="ml-1 text-accent">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  function getStatusLabel(status: string): string {
    if (status === 'registered') return t(language, 'statusRegistered');
    if (status === 'candidate') return t(language, 'statusCandidate');
    if (status === 'removed') return t(language, 'statusRemoved');
    return status;
  }

  const registryOptions: { value: RegistryFilter; label: string }[] = [
    { value: 'all',       label: t(language, 'registryFilterAll') },
    { value: 'pa',        label: t(language, 'registryFilterPa') },
    { value: 'peppol_ap', label: t(language, 'registryFilterPeppolAp') },
    { value: 'both',      label: t(language, 'registryFilterBoth') },
  ];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-start">
        {/* Status tabs */}
        <div className="flex gap-1">
          {(['all', 'registered', 'candidate', 'removed'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => changeStatusFilter(s)}
              className={`px-4 py-3 min-h-[44px] text-sm font-body font-medium uppercase tracking-wide transition-colors cursor-pointer select-none ${
                statusFilter === s
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-navy/55 hover:text-navy'
              }`}
            >
              {s === 'all' ? t(language, 'tableStatusFilter') : getStatusLabel(s)}
            </button>
          ))}
        </div>

        {/* Registry multi-select checkboxes */}
        <div className="flex items-center gap-3 ml-4 flex-wrap">
          <span className="text-[11px] font-body font-semibold text-navy/50 uppercase tracking-widest">
            {t(language, 'registryFilterLabel')}
          </span>
          {registryOptions.map(({ value, label }) => (
            <label
              key={value}
              className="flex items-center gap-1.5 cursor-pointer select-none"
            >
              <input
                type="radio"
                name="registry-filter"
                checked={registryFilter === value}
                onChange={() => changeRegistryFilter(value)}
                className="accent-accent w-3.5 h-3.5"
              />
              <span
                className={`text-sm font-body transition-colors ${
                  registryFilter === value ? 'text-accent font-medium' : 'text-navy/60'
                }`}
              >
                {label}
              </span>
              {value === 'both' && linkedPdpIds.size > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 text-[10px] rounded-full bg-accent/10 text-accent font-mono">
                  {linkedPdpIds.size}
                </span>
              )}
            </label>
          ))}
        </div>

        <input
          type="search"
          placeholder={t(language, 'tableSearch')}
          value={search}
          onChange={(e) => changeSearch(e.target.value)}
          className="ml-auto border border-navy/15 bg-cream rounded px-3 py-1.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-navy/30"
        />
      </div>

      <p className="text-xs font-mono text-navy/40 uppercase tracking-wider">
        {t(language, statusFilter === 'registered' ? 'tablePlatformsApproved' : 'tablePlatforms', filtered.length)}
      </p>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm font-body">
          <thead>
            <tr className="border-b-2 border-navy/10">
              {(
                [
                  { key: 'name' as SortKey, label: t(language, 'tableColName') },
                  { key: 'status' as SortKey, label: t(language, 'tableColStatus') },
                  { key: 'registrationDate' as SortKey, label: t(language, 'tableColDate') },
                  { key: null, label: t(language, 'tableColWebsite') },
                  { key: 'firstSeenAt' as SortKey, label: t(language, 'tableColFirstSeen') },
                ] as { key: SortKey | null; label: string }[]
              ).map(({ key, label }) => (
                <th
                  key={label}
                  className={`relative px-3 py-2.5 text-left text-[11px] font-body font-semibold text-navy/50 uppercase tracking-widest whitespace-nowrap ${
                    key ? 'cursor-pointer hover:text-navy select-none' : ''
                  }`}
                  onClick={() => key && handleSort(key)}
                  onMouseEnter={() => key === 'firstSeenAt' && setHoveredHeader('firstSeenAt')}
                  onMouseLeave={() => setHoveredHeader(null)}
                >
                  {label}
                  {key && <SortArrow col={key} />}
                  {key === 'firstSeenAt' && hoveredHeader === 'firstSeenAt' && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-navy text-cream text-[10px] font-normal whitespace-nowrap rounded z-10 pointer-events-none">
                      {t(language, 'tooltipFirstTracked')}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody
            key={`page-${safePage}`}
            className="transition-opacity duration-150 ease-in-out"
          >
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-navy/40 font-body">
                  {t(language, 'tableNoResults')}
                </td>
              </tr>
            ) : (
              paginated.map((pdp) => {
                const isLinked = linkedPdpIds.has(pdp.id);
                return (
                  <tr key={pdp.id} className="border-b border-navy/5 hover:bg-navy/[0.03] transition-colors cursor-pointer">
                    <td className="px-3 py-2.5 font-medium">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/pdp/${pdp.slug}`}
                          className="text-accent underline hover:text-accent/80 transition-colors font-semibold"
                        >
                          {pdp.name}
                        </Link>
                        {isLinked && (
                          <span
                            title={t(language, 'registryFilterBoth')}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap"
                          >
                            <span>⇌</span>
                            {t(language, 'badgeBothRegistries')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div
                        className="relative inline-block"
                        onMouseEnter={() => setHoveredStatusCell(`${pdp.id}`)}
                        onMouseLeave={() => setHoveredStatusCell(null)}
                      >
                        <span
                          className={
                            STATUS_BADGE[pdp.status] ?? 'status-badge border-l-gray-400 text-gray-600'
                          }
                        >
                          {getStatusLabel(pdp.status)}
                        </span>
                        {pdp.statusText && hoveredStatusCell === `${pdp.id}` && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-navy text-cream text-[10px] font-normal whitespace-nowrap rounded z-10 pointer-events-none">
                            {pdp.statusText}
                          </div>
                        )}
                      </div>
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
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="px-4 py-2 text-sm font-body font-medium text-navy/70 border border-navy/15 rounded hover:border-navy/35 hover:text-navy disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {t(language, 'paginationPrevious')}
          </button>
          <span className="text-xs font-mono text-navy/50 uppercase tracking-wider" key={`pg-${safePage}`}>
            {t(language, 'paginationPage', safePage, totalPages)}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="px-4 py-2 text-sm font-body font-medium text-navy/70 border border-navy/15 rounded hover:border-navy/35 hover:text-navy disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            {t(language, 'paginationNext')}
          </button>
        </div>
      )}
    </div>
  );
}
