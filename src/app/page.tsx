import type { Metadata } from 'next';
import { getAllPdps } from '@/lib/db/repositories/pdps';
import { getChanges } from '@/lib/db/repositories/changes';
import { getLastSuccessfulRun } from '@/lib/db/repositories/runs';
import StatsBar from '@/components/stats-bar';
import PdpTable from '@/components/pdp-table';
import SubscribeForm from '@/components/subscribe-form';

export const metadata: Metadata = {
  title: 'Registre PA',
  description:
    'Liste complète des Plateformes Agréées (PA, ex-PDP) certifiées DGFiP pour la facturation électronique.',
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Registre des Plateformes Agréées (PA, ex-PDP)
        </h1>
        <p className="mt-2 text-gray-600">
          Suivi du registre officiel DGFiP mis à jour quotidiennement.{' '}
          <a
            href="https://www.impots.gouv.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Source : impots.gouv.fr
          </a>
        </p>
        {lastRun && (
          <p className="mt-1 text-sm text-gray-500">
            Dernière mise à jour :{' '}
            {new Date(lastRun.runAt).toLocaleString('fr-FR', {
              dateStyle: 'long',
              timeStyle: 'short',
            })}
          </p>
        )}
      </div>

      <StatsBar
        registeredCount={registeredCount}
        candidateCount={candidateCount}
        addedThisMonth={addedThisMonth}
        removedThisMonth={removedThisMonth}
      />

      <PdpTable pdps={allPdps} />

      <div className="border-t border-gray-200 pt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recevoir les alertes de modification
        </h2>
        <SubscribeForm />
      </div>
    </div>
  );
}
