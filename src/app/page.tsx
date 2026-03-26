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
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl text-navy">
          Registre des Plateformes Agréées
        </h1>
        <p className="mt-3 text-navy/60 font-body text-sm leading-relaxed max-w-2xl">
          Suivi du registre officiel DGFiP mis à jour quotidiennement.{' '}
          <a
            href="https://www.impots.gouv.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Source : impots.gouv.fr
          </a>
        </p>
        {lastRun && (
          <p className="mt-2 text-xs font-mono text-navy/40 uppercase tracking-wider">
            Dernière mise à jour :{' '}
            {new Date(lastRun.runAt).toLocaleString('fr-FR', {
              dateStyle: 'long',
              timeStyle: 'short',
            })}
          </p>
        )}
        <div className="hr-rule mt-6" />
      </div>

      <StatsBar
        registeredCount={registeredCount}
        candidateCount={candidateCount}
        addedThisMonth={addedThisMonth}
        removedThisMonth={removedThisMonth}
      />

      <div className="hr-rule" />

      <PdpTable pdps={allPdps} />

      <div className="hr-rule pt-10">
        <h2 className="font-display text-xl text-navy mb-4">
          Recevoir les alertes de modification
        </h2>
        <SubscribeForm />
      </div>
    </div>
  );
}
