import type { Metadata } from 'next';
import { getAllPdps } from '@/lib/db/repositories/pdps';
import { getChanges } from '@/lib/db/repositories/changes';
import { getLastSuccessfulRun, getFirstRun } from '@/lib/db/repositories/runs';
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
  const firstRun = await getFirstRun().catch(() => null);

  // Check if tracker has been running for at least 7 days
  const now = new Date();
  const isNewTracker = firstRun ? (now.getTime() - new Date(firstRun.runAt).getTime()) < 7 * 24 * 60 * 60 * 1000 : true;

  // Stats: changes in last 30 days, but only from after the first run (to exclude initial data load)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const changesSince = firstRun ? new Date(new Date(firstRun.runAt).getTime() + 1000).toISOString() : thirtyDaysAgo;
  const recentChanges = await getChanges({
    since: changesSince,
    limit: 200,
    offset: 0,
  }).catch(() => ({ total: 0, changes: [] }));

  const registeredCount = allPdps.filter((p) => p.status === 'registered' && p.isActive).length;
  const candidateCount = allPdps.filter((p) => p.status === 'candidate' && p.isActive).length;
  
  // Only show stats if tracker has been running for 7+ days
  const addedThisMonth = isNewTracker ? null : recentChanges.changes.filter((c) => c.eventType === 'added').length;
  const removedThisMonth = isNewTracker ? null : recentChanges.changes.filter((c) => c.eventType === 'removed').length;

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
