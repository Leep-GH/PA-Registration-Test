export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAllPdps } from '@/lib/db/repositories/pdps';
import { getLastSuccessfulRun } from '@/lib/db/repositories/runs';

const VALID_STATUSES = ['registered', 'candidate', 'removed', 'all'] as const;
type StatusFilter = (typeof VALID_STATUSES)[number];

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);

  // Validate query params
  const rawStatus = searchParams.get('status') ?? 'all';
  const format = searchParams.get('format');

  if (!VALID_STATUSES.includes(rawStatus as StatusFilter)) {
    return NextResponse.json(
      { error: `Invalid status value. Allowed: ${VALID_STATUSES.join(', ')}`, code: 'bad_request' },
      { status: 400 },
    );
  }

  const statusFilter: StatusFilter = rawStatus as StatusFilter;

  const filter =
    statusFilter === 'all'
      ? undefined
      : { status: statusFilter };

  const [pdpList, lastRun] = await Promise.all([
    getAllPdps(filter),
    getLastSuccessfulRun(),
  ]);

  // CSV export
  if (format === 'csv' || req.headers.get('accept')?.includes('text/csv')) {
    const csvHeader = 'name,slug,status,registration_number,registration_date,website_url,first_seen_at,last_seen_at\n';
    const csvRows = pdpList.map((p) => {
      const row = [
        p.name,
        p.slug,
        p.status,
        p.registrationNumber ?? '',
        p.registrationDate ?? '',
        p.websiteUrl ?? '',
        p.firstSeenAt,
        p.lastSeenAt,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
      return row.join(',');
    });

    return new NextResponse(csvHeader + csvRows.join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="pdps.csv"',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }

  return NextResponse.json(
    {
      as_of: lastRun?.runAt ?? null,
      source: process.env.DGFIP_PDP_URL ?? null,
      count: pdpList.length,
      pdps: pdpList,
    },
    {
      headers: { 'Cache-Control': 'public, max-age=300' },
    },
  );
}
