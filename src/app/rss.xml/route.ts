export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse> {
  // RSS feed temporarily disabled
  return new NextResponse('Not Found', { status: 404 });
}
