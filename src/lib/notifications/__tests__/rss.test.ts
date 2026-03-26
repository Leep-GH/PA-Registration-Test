import { describe, it, expect } from 'vitest';
import { buildRssFeed, type RssChangeItem } from '@/lib/notifications/rss';

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const sampleChanges: RssChangeItem[] = [
  {
    id: 1,
    pdpName: 'Entreprise Alpha SA',
    pdpSlug: 'entreprise-alpha-sa',
    eventType: 'added',
    detectedAt: '2024-06-15T07:00:00.000Z',
  },
  {
    id: 2,
    pdpName: 'Société Bêta SARL',
    pdpSlug: 'societe-beta-sarl',
    eventType: 'removed',
    detectedAt: '2024-05-10T07:00:00.000Z',
  },
  {
    id: 3,
    pdpName: 'Gamma SAS',
    pdpSlug: 'gamma-sas',
    eventType: 'status_changed',
    detectedAt: '2024-04-01T07:00:00.000Z',
  },
];

const BASE_URL = 'https://pdp-tracker.example.com';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildRssFeed', () => {
  it('Should_ProduceValidRss2Xml_When_ChangesProvided', () => {
    const xml = buildRssFeed(sampleChanges, BASE_URL);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain('<channel>');
    expect(xml).toContain('</channel>');
    expect(xml).toContain('</rss>');
  });

  it('Should_IncludeCorrectItemTitle_When_EventTypeIsAdded', () => {
    const xml = buildRssFeed([sampleChanges[0]], BASE_URL);

    expect(xml).toContain('[AJOUT]');
    expect(xml).toContain('Entreprise Alpha SA');
  });

  it('Should_IncludeCorrectItemTitle_When_EventTypeIsRemoved', () => {
    const xml = buildRssFeed([sampleChanges[1]], BASE_URL);

    expect(xml).toContain('[SUPPRESSION]');
    expect(xml).toContain('Société Bêta SARL');
  });

  it('Should_IncludeCorrectItemTitle_When_EventTypeIsStatusChanged', () => {
    const xml = buildRssFeed([sampleChanges[2]], BASE_URL);

    expect(xml).toContain('[CHANGEMENT DE STATUT]');
    expect(xml).toContain('Gamma SAS');
  });

  it('Should_ReturnEmptyChannel_When_NoChanges', () => {
    const xml = buildRssFeed([], BASE_URL);

    expect(xml).toContain('<channel>');
    expect(xml).not.toContain('<item>');
  });

  it('Should_EscapeXmlSpecialCharacters_When_PdpNameContainsAmpersand', () => {
    const changeWithAmpersand: RssChangeItem = {
      id: 99,
      pdpName: 'Alpha & Bêta SAS',
      pdpSlug: 'alpha-beta-sas',
      eventType: 'added',
      detectedAt: '2024-06-15T07:00:00.000Z',
    };

    const xml = buildRssFeed([changeWithAmpersand], BASE_URL);

    // Raw ampersand must not appear inside XML content (it would make invalid XML)
    // The title/description text should use &amp; instead
    expect(xml).toContain('&amp;');
    // Verify the raw unescaped ampersand doesn't appear mid-content
    // (strip out the XML declaration which uses '&' in namespace URIs - those use xmlns: prefix)
    const channelContent = xml.replace(/xmlns:[^"]*"[^"]*"/g, '');
    expect(channelContent).not.toMatch(/Alpha & Bêta/);
  });

  it('Should_IncludeItemLinkWithSlug_When_ChangesProvided', () => {
    const xml = buildRssFeed([sampleChanges[0]], BASE_URL);

    expect(xml).toContain(`${BASE_URL}/pdp/entreprise-alpha-sa`);
  });

  it('Should_LimitToFiftyItems_When_MoreThanFiftyChangesProvided', () => {
    const manyChanges: RssChangeItem[] = Array.from({ length: 60 }, (_, i) => ({
      id: i + 1,
      pdpName: `PDP ${i + 1}`,
      pdpSlug: `pdp-${i + 1}`,
      eventType: 'added' as const,
      detectedAt: '2024-06-15T07:00:00.000Z',
    }));

    const xml = buildRssFeed(manyChanges, BASE_URL);

    // Count <item> elements
    const itemCount = (xml.match(/<item>/g) ?? []).length;
    expect(itemCount).toBe(50);
  });

  it('Should_FallbackToEventType_When_EventTypeIsUnrecognised', () => {
    // Exercises the `?? item.eventType.toUpperCase()` fallback in the label lookup
    const changeWithUnknownType = {
      ...sampleChanges[0],
      eventType: 'custom_type' as unknown as 'added',
    };

    const xml = buildRssFeed([changeWithUnknownType], BASE_URL);

    expect(xml).toContain('[CUSTOM_TYPE]');
  });
});
