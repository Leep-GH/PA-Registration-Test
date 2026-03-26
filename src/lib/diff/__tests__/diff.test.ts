import { describe, it, expect } from 'vitest';
import { detectChanges, type PreviousPdp } from '@/lib/diff/index';
import type { PdpRecord } from '@/lib/scraper/types';

// ---------------------------------------------------------------------------
// Fixture data — typed, no `any`
// ---------------------------------------------------------------------------

const basePrevious: PreviousPdp[] = [
  { id: 1, slug: 'entreprise-alpha', name: 'Entreprise Alpha', status: 'registered' },
  { id: 2, slug: 'societe-beta', name: 'Société Bêta', status: 'registered' },
];

const baseCurrent: PdpRecord[] = [
  { name: 'Entreprise Alpha', slug: 'entreprise-alpha', status: 'registered' },
  { name: 'Société Bêta', slug: 'societe-beta', status: 'registered' },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('detectChanges', () => {
  it('Should_ReturnEmpty_When_NoPdpsExistAndNoneScraped', () => {
    const result = detectChanges([], []);
    expect(result).toHaveLength(0);
  });

  it('Should_ReturnAdded_When_NewPdpNotInPrevious', () => {
    const current: PdpRecord[] = [
      ...baseCurrent,
      { name: 'Nouvelle Plateforme SAS', slug: 'nouvelle-plateforme-sas', status: 'candidate' },
    ];

    const result = detectChanges(current, basePrevious);

    expect(result).toHaveLength(1);
    expect(result[0].eventType).toBe('added');
    expect(result[0].pdpSlug).toBe('nouvelle-plateforme-sas');
    expect(result[0].pdpId).toBe(0);
    expect(result[0].oldValue).toBeNull();
    expect(result[0].newValue).toEqual({ name: 'Nouvelle Plateforme SAS', status: 'candidate' });
  });

  it('Should_ReturnRemoved_When_PreviousPdpNotInCurrent', () => {
    const current: PdpRecord[] = [baseCurrent[0]]; // alpha only, beta removed

    const result = detectChanges(current, basePrevious);

    expect(result).toHaveLength(1);
    expect(result[0].eventType).toBe('removed');
    expect(result[0].pdpSlug).toBe('societe-beta');
    expect(result[0].pdpId).toBe(2);
    expect(result[0].newValue).toBeNull();
    expect(result[0].oldValue).toEqual({ name: 'Société Bêta', status: 'registered' });
  });

  it('Should_ReturnStatusChanged_When_PdpStatusChanges', () => {
    const current: PdpRecord[] = [
      { name: 'Entreprise Alpha', slug: 'entreprise-alpha', status: 'removed' },
      baseCurrent[1],
    ];

    const result = detectChanges(current, basePrevious);

    expect(result).toHaveLength(1);
    expect(result[0].eventType).toBe('status_changed');
    expect(result[0].pdpSlug).toBe('entreprise-alpha');
    expect(result[0].pdpId).toBe(1);
    expect(result[0].oldValue).toEqual({ status: 'registered', name: 'Entreprise Alpha' });
    expect(result[0].newValue).toEqual({ status: 'removed', name: 'Entreprise Alpha' });
  });

  it('Should_ReturnNoChanges_When_ListIdentical', () => {
    const result = detectChanges(baseCurrent, basePrevious);
    expect(result).toHaveLength(0);
  });

  it('Should_HandleMultipleSimultaneousChanges', () => {
    const current: PdpRecord[] = [
      // alpha: status changed
      { name: 'Entreprise Alpha', slug: 'entreprise-alpha', status: 'removed' },
      // beta: removed (not in current)
      // gamma: new addition
      { name: 'Gamma SAS', slug: 'gamma-sas', status: 'candidate' },
    ];

    const result = detectChanges(current, basePrevious);

    expect(result).toHaveLength(3);

    const statusChange = result.find((r) => r.eventType === 'status_changed');
    expect(statusChange?.pdpSlug).toBe('entreprise-alpha');

    const removed = result.find((r) => r.eventType === 'removed');
    expect(removed?.pdpSlug).toBe('societe-beta');

    const added = result.find((r) => r.eventType === 'added');
    expect(added?.pdpSlug).toBe('gamma-sas');
  });

  it('Should_ReturnAdded_When_ScrapedListHasPdpsPreviouslyRemoved', () => {
    // A PDP that was removed (not in previous DB state) now reappears in scrape
    const previous: PreviousPdp[] = [
      { id: 1, slug: 'entreprise-alpha', name: 'Entreprise Alpha', status: 'registered' },
      // societe-beta is NOT in previous (was removed earlier)
    ];
    const current: PdpRecord[] = [
      baseCurrent[0],
      // societe-beta reappears:
      { name: 'Société Bêta', slug: 'societe-beta', status: 'registered' },
    ];

    const result = detectChanges(current, previous);

    expect(result).toHaveLength(1);
    expect(result[0].eventType).toBe('added');
    expect(result[0].pdpSlug).toBe('societe-beta');
    expect(result[0].pdpId).toBe(0);
  });

  it('Should_DetectNameChangeAsStatusChanged', () => {
    // The same slug (stable key) — when name AND status both change, it's a status_changed
    // event, and both old/new names are captured in the oldValue/newValue objects.
    const previous: PreviousPdp[] = [
      { id: 5, slug: 'acme-pdp', name: 'ACME PDP', status: 'candidate' },
    ];
    const current: PdpRecord[] = [
      { name: 'ACME Plateforme SAS', slug: 'acme-pdp', status: 'registered' },
    ];

    const result = detectChanges(current, previous);

    expect(result).toHaveLength(1);
    expect(result[0].eventType).toBe('status_changed');
    expect(result[0].pdpId).toBe(5);
    // Old name and new name are both captured
    expect((result[0].oldValue as { name: string }).name).toBe('ACME PDP');
    expect((result[0].newValue as { name: string }).name).toBe('ACME Plateforme SAS');
  });
});
