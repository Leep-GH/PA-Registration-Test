export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getChanges } from '@/lib/db/repositories/changes';
import { buildRssFeed } from '@/lib/notifications/rss';

export async function GET(): Promise<NextResponse> {
  const { changes } = await getChanges({ limit: 50, offset: 0 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const rssItems = changes.map((c) => ({
    id: c.id,
    pdpName: c.pdpName,
    pdpSlug: c.pdpSlug,
    eventType: c.eventType as 'added' | 'removed' | 'status_changed',
    detectedAt: c.detectedAt,
  }));

  const xml = buildRssFeed(rssItems, baseUrl);

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate',
    },
  });
}
