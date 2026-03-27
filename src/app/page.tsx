import type { Metadata } from 'next';
import { getAllPdps } from '@/lib/db/repositories/pdps';
import { getChanges } from '@/lib/db/repositories/changes';
import { getLastSuccessfulRun } from '@/lib/db/repositories/runs';
import DashboardContent from '@/app/dashboard-content';

export const metadata: Metadata = {
  title: 'PA Registry Tracker',
  description:
    'Complete list of approved platforms (PA, ex-PDP) certified by DGFiP for electronic invoicing.',
};

// Revalidate every hour as a fallback; trigger-scrape calls revalidatePath('/') on success
export const revalidate = 3600;

export default async function DashboardPage() {
  let allPdps = await getAllPdps().catch(() => []);
  const lastRun = await getLastSuccessfulRun().catch(() => null);

  // Stats: changes in last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const recentChanges = await getChanges({
    since: thirtyDaysAgo,
    limit: 200,
    offset: 0,
  }).catch(() => ({ total: 0, changes: [] }));

  const registeredCount = allPdps.filter((p) => p.status === 'registered' && p.isActive).length;
  const candidateCount = allPdps.filter((p) => p.status === 'candidate' && p.isActive).length;
  const addedThisMonth = recentChanges.changes.filter((c) => c.eventType === 'added').length;
  const removedThisMonth = recentChanges.changes.filter((c) => c.eventType === 'removed').length;

  return (
    <DashboardContent
      pdps={allPdps}
      lastRun={lastRun}
      registeredCount={registeredCount}
      candidateCount={candidateCount}
      addedThisMonth={addedThisMonth}
      removedThisMonth={removedThisMonth}
    />
  );
}
