export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getLatestRunChanges } from '@/lib/db/repositories/changes';
import { getLastSuccessfulRun } from '@/lib/db/repositories/runs';

export async function GET(): Promise<NextResponse> {
  const [changes, lastRun] = await Promise.all([
    getLatestRunChanges(),
    getLastSuccessfulRun(),
  ]);

  return NextResponse.json(
    {
      total: changes.length,
      limit: changes.length,
      offset: 0,
      run_at: lastRun?.runAt ?? null,
      changes,
    },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  );
}
