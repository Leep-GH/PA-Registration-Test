/**
 * RSS 2.0 feed builder.
 * Pure function — no database access. Accepts pre-fetched change event data.
 */

export interface RssChangeItem {
  id: number;
  pdpName: string;
  pdpSlug: string;
  eventType: 'added' | 'removed' | 'status_changed';
  detectedAt: string; // ISO 8601
}

const EVENT_LABELS: Record<string, string> = {
  added: 'AJOUT',
  removed: 'SUPPRESSION',
  status_changed: 'CHANGEMENT DE STATUT',
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toRfc822(isoDate: string): string {
  try {
    return new Date(isoDate).toUTCString();
  } catch {
    return isoDate;
  }
}

function buildDescription(item: RssChangeItem): string {
  switch (item.eventType) {
    case 'added':
      return `Nouvelle plateforme agréée (ex-PDP) détectée : ${item.pdpName}`;
    case 'removed':
      return `Plateforme agréée retirée du registre DGFiP : ${item.pdpName}`;
    case 'status_changed':
      return `Changement de statut détecté pour : ${item.pdpName}`;
    default:
      return item.pdpName;
  }
}

/**
 * Builds a valid RSS 2.0 XML string from the provided change events.
 *
 * @param changes - Change events (up to 50, newest first)
 * @param baseUrl - Canonical app URL (NEXT_PUBLIC_APP_URL)
 */
export function buildRssFeed(changes: RssChangeItem[], baseUrl: string): string {
  const lastBuildDate = changes.length > 0 ? toRfc822(changes[0].detectedAt) : toRfc822(new Date().toISOString());

  const items = changes
    .slice(0, 50)
    .map((item) => {
      const label = EVENT_LABELS[item.eventType] ?? item.eventType.toUpperCase();
      const title = `[${label}] ${escapeXml(item.pdpName)}`;
      const link = `${baseUrl}/pdp/${item.pdpSlug}`;
      const description = escapeXml(buildDescription(item));
      const pubDate = toRfc822(item.detectedAt);
      const guid = `${link}#change-${item.id}`;

      return `    <item>
      <title>${title}</title>
      <link>${escapeXml(link)}</link>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>
      <guid isPermaLink="false">${escapeXml(guid)}</guid>
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>PA Registry Tracker — Flux de modifications</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>Dernières modifications du registre DGFiP des Plateformes Agréées (ex-PDP)</description>
    <language>fr-FR</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${escapeXml(baseUrl)}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;
}
