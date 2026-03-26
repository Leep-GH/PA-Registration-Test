export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getPdpBySlug } from '@/lib/db/repositories/pdps';
import { getChangesForPdp } from '@/lib/db/repositories/changes';

interface RouteParams {
  params: { slug: string };
}

// Slug validation: only lowercase alphanumeric and hyphens
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(
  _req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { slug } = params;

  if (!SLUG_REGEX.test(slug) || slug.length > 200) {
    return NextResponse.json(
      { error: 'Invalid slug format', code: 'bad_request' },
      { status: 400 },
    );
  }

  const pdp = await getPdpBySlug(slug);
  if (!pdp) {
    return NextResponse.json(
      { error: 'PDP not found', code: 'not_found' },
      { status: 404 },
    );
  }

  const statusHistory = await getChangesForPdp(pdp.id, 100);

  return NextResponse.json(
    {
      pdp: {
        ...pdp,
        status_history: statusHistory,
      },
    },
    {
      headers: { 'Cache-Control': 'public, max-age=300' },
    },
  );
}
