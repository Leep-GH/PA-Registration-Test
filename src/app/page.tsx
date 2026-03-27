import type { Metadata } from 'next';
import { getAllPdps } from '@/lib/db/repositories/pdps';
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

  const registeredCount = allPdps.filter((p) => p.status === 'registered' && p.isActive).length;
  const candidateCount = allPdps.filter((p) => p.status === 'candidate' && p.isActive).length;

  return (
    <DashboardContent
      pdps={allPdps}
      lastRun={lastRun}
      registeredCount={registeredCount}
      candidateCount={candidateCount}
    />
  );
}
