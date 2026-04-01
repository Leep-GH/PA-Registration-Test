'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';
import { t, type Language } from '@/lib/i18n';
import type { Pdp, PeppolAp } from '@/lib/db/schema';

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
  /** Peppol APs (DGFIP authority) that have no matching PA record */
  peppolOnlyAps?: PeppolAp[];
}

export default function PdpTable({ pdps, linkedPdpIds = new Set(), peppolOnlyAps = [] }: Props) {
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
    if (r === 'peppol_ap') setStatusFilter('all');
    setPage(1);
  }

  function changeSearch(q: string) {
    setSearch(q);
    setPage(1);
  }

  const filteredPdps = useMemo(() => {
    if (registryFilter === 'peppol_ap') return [];
    return pdps
      .filter((p) => {
        if (statusFilter !== 'all' && p.status !== statusFilter) return false;
        const isLinked = linkedPdpIds.has(p.id);
        if (registryFilter === 'pa' && isLinked) return false;
        if (registryFilter === 'both' && !isLinked) return false;
        if (search) {
          const q = search.toLowerCase();
          return p.name.toLowerCase().includes(q) || p.slug.includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        switch (sortKey) {
          case 'name':             cmp = a.name.localeCompare(b.name, 'fr'); break;
          case 'status':           cmp = a.status.localeCompare(b.status); break;
          case 'registrationDate': cmp = (a.registrationDate ?? '').localeCompare(b.registrationDate ?? ''); break;
          case 'firstSeenAt':      cmp = a.firstSeenAt.localeCompare(b.firstSeenAt); break;
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [pdps, statusFilter, registryFilter, linkedPdpIds, search, sortKey, sortDir]);

  const filteredPeppolAps = useMemo(() => {
    if (registryFilter !== 'peppol_ap') return [];
    return peppolOnlyAps
      .filter((ap) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return ap.name.toLowerCase().includes(q) || (ap.country ?? '').toLowerCase().includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [peppolOnlyAps, registryFilter, search]);

  const filterCounts: Record<RegistryFilter, number> = useMemo(() => ({
    all:       pdps.length,
    pa:        pdps.length - linkedPdpIds.size,
    peppol_ap: peppolOnlyAps.length,
    both:      linkedPdpIds.size,
  }), [pdps.length, linkedPdpIds.size, peppolOnlyAps.length]);

  const totalPages = useMemo(() => {
    const count = registryFilter === 'peppol_ap' ? filteredPeppolAps.length : filteredPdps.length;
    return Math.max(1, Math.ceil(count / PAGE_SIZE));
  }, [filteredPdps.length, filteredPeppolAps.length, registryFilter]);

  const safePage = useMemo(() => {
    return Math.min(page, totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    const source = (registryFilter === 'peppol_ap' ? filteredPeppolAps : filteredPdps) as (Pdp | PeppolAp)[];
    return source.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  }, [filteredPdps, filteredPeppolAps, registryFilter, safePage]);

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
    <div className="card overflow-hidden">
      {/* Controls */}
      <div className="p-5 pb-0 space-y-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {/* Registry filter chips */}
            {registryOptions.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => changeRegistryFilter(value)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-body font-semibold transition-all ${
                  registryFilter === value
                    ? 'bg-accent text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-navy'
                }`}
              >
                {label}
                <span className={`text-[10px] font-mono px-1.5 py-px rounded-md leading-none ${
                  registryFilter === value
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200/80 text-slate-500'
                }`}>
                  {filterCounts[value]}
                </span>
              </button>
            ))}
          </div>

          <input
            type="search"
            placeholder={t(language, 'tableSearch')}
            value={search}
            onChange={(e) => changeSearch(e.target.value)}
            className="border border-slate-200 bg-white rounded-lg px-3.5 py-2 text-sm font-body focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-slate-400 w-48"
          />
        </div>

        {/* Status tabs — hidden in Peppol-only mode */}
        {registryFilter !== 'peppol_ap' && (
          <div className="flex gap-1 border-b border-slate-200 -mx-5 px-5">
            {(['all', 'registered', 'candidate', 'removed'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => changeStatusFilter(s)}
                className={`px-4 py-2.5 text-sm font-body font-medium transition-colors cursor-pointer select-none border-b-2 -mb-px ${
                  statusFilter === s
                    ? 'text-accent border-accent'
                    : 'text-slate-500 border-transparent hover:text-navy hover:border-slate-300'
                }`}
              >
                {s === 'all' ? t(language, 'tableStatusFilter') : getStatusLabel(s)}
              </button>
            ))}
          </div>
        )}

        <p className="text-xs font-body font-medium text-slate-400 pb-2">
          {registryFilter === 'peppol_ap'
            ? t(language, 'tablePlatforms', filteredPeppolAps.length)
            : t(language, statusFilter === 'registered' ? 'tablePlatformsApproved' : 'tablePlatforms', filteredPdps.length)}
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {registryFilter === 'peppol_ap' ? (
          /* Peppol-only table */
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="px-5 py-3 text-left text-[11px] font-body font-semibold text-slate-500 uppercase tracking-wider">{t(language, 'tableColName')}</th>
                <th className="px-5 py-3 text-left text-[11px] font-body font-semibold text-slate-500 uppercase tracking-wider">{t(language, 'peppolApCountry')}</th>
                <th className="px-5 py-3 text-left text-[11px] font-body font-semibold text-slate-500 uppercase tracking-wider">{t(language, 'peppolApCertifications')}</th>
              </tr>
            </thead>
            <tbody key={`page-peppol-${safePage}`} className="transition-opacity duration-150 ease-in-out">
              {(paginated as PeppolAp[]).length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-slate-400 font-body">
                    {t(language, 'tableNoResults')}
                  </td>
                </tr>
              ) : (
                (paginated as PeppolAp[]).map((ap) => (
                  <tr key={ap.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-medium">
                      <Link
                        href={`/peppol/${ap.slug}`}
                        className="text-accent hover:text-accent-hover transition-colors font-semibold"
                      >
                        {ap.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">{ap.country ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1.5">
                        {ap.apCertified && (
                          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-body font-semibold rounded-md bg-blue-50 text-blue-700">AP</span>
                        )}
                        {ap.smpCertified && (
                          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-body font-semibold rounded-md bg-purple-50 text-purple-700">SMP</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          /* PA (DGFiP) table */
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
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
                    className={`relative px-5 py-3 text-left text-[11px] font-body font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap ${
                      key ? 'cursor-pointer hover:text-navy select-none' : ''
                    }`}
                    onClick={() => key && handleSort(key)}
                    onMouseEnter={() => key === 'firstSeenAt' && setHoveredHeader('firstSeenAt')}
                    onMouseLeave={() => setHoveredHeader(null)}
                  >
                    {label}
                    {key && <SortArrow col={key} />}
                    {key === 'firstSeenAt' && hoveredHeader === 'firstSeenAt' && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1.5 bg-navy text-white text-[10px] font-normal whitespace-nowrap rounded-lg z-10 pointer-events-none shadow-lg">
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
              {filteredPdps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400 font-body">
                    {t(language, 'tableNoResults')}
                  </td>
                </tr>
              ) : (
                (paginated as Pdp[]).map((pdp) => {
                  const isLinked = linkedPdpIds.has(pdp.id);
                  return (
                    <tr key={pdp.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-medium">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/pdp/${pdp.slug}`}
                            className="text-accent hover:text-accent-hover transition-colors font-semibold"
                          >
                            {pdp.name}
                          </Link>
                          {isLinked && (
                            <span className="relative group inline-flex">
                              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-body font-semibold rounded-md bg-teal-50 text-teal-700 whitespace-nowrap leading-tight cursor-default">
                                {t(language, 'badgeBothRegistries')}
                              </span>
                              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-navy text-white text-[10px] font-normal rounded-lg z-20 w-56 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg">
                                {t(language, 'badgeBothTooltip')}
                              </span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div
                          className="relative inline-block"
                          onMouseEnter={() => setHoveredStatusCell(`${pdp.id}`)}
                          onMouseLeave={() => setHoveredStatusCell(null)}
                        >
                          <span
                            className={
                              STATUS_BADGE[pdp.status] ?? 'status-badge bg-gray-50 text-gray-600'
                            }
                          >
                            {getStatusLabel(pdp.status)}
                          </span>
                          {pdp.statusText && hoveredStatusCell === `${pdp.id}` && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-navy text-white text-[10px] font-normal whitespace-nowrap rounded-lg z-10 pointer-events-none shadow-lg">
                              {pdp.statusText}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-500 whitespace-nowrap">
                        {pdp.registrationDate ?? '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        {pdp.websiteUrl ? (
                          <a
                            href={pdp.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:text-accent-hover text-sm truncate block max-w-[180px] transition-colors"
                          >
                            {pdp.websiteUrl.replace(/^https?:\/\//, '')}
                          </a>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-500 whitespace-nowrap">
                        {new Date(pdp.firstSeenAt).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="px-4 py-2 text-sm font-body font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-navy disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {t(language, 'paginationPrevious')}
          </button>
          <span className="text-xs font-body font-medium text-slate-400" key={`pg-${safePage}`}>
            {t(language, 'paginationPage', safePage, totalPages)}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="px-4 py-2 text-sm font-body font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-navy disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {t(language, 'paginationNext')}
          </button>
        </div>
      )}
    </div>
  );
}
