import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPdpBySlug, getAllPdps } from '@/lib/db/repositories/pdps';
import { getChangesForPdp } from '@/lib/db/repositories/changes';

interface Props {
  params: { slug: string };
}

export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const pdpList = await getAllPdps({ isActive: true });
    return pdpList.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pdp = await getPdpBySlug(params.slug).catch(() => null);
  if (!pdp) return { title: 'PDP introuvable' };
  return {
    title: pdp.name,
    description: `Fiche détaillée et historique de ${pdp.name} — registre DGFiP des PDP.`,
  };
}

const STATUS_LABELS: Record<string, string> = {
  registered: 'Immatriculée',
  candidate: 'Candidate',
  removed: 'Retirée',
};

const STATUS_CLASSES: Record<string, string> = {
  registered: 'bg-green-100 text-green-800 border-green-200',
  candidate: 'bg-amber-100 text-amber-800 border-amber-200',
  removed: 'bg-red-100 text-red-800 border-red-200',
};

const EVENT_LABELS: Record<string, { label: string; classes: string }> = {
  added: { label: 'Ajout', classes: 'bg-green-100 text-green-800' },
  removed: { label: 'Suppression', classes: 'bg-red-100 text-red-800' },
  status_changed: { label: 'Changement', classes: 'bg-amber-100 text-amber-800' },
};

export default async function PdpDetailPage({ params }: Props) {
  const pdp = await getPdpBySlug(params.slug).catch(() => null);
  if (!pdp) notFound();

  const history = await getChangesForPdp(pdp.id, 50).catch(() => []);

  const statusClass = STATUS_CLASSES[pdp.status] ?? 'bg-gray-100 text-gray-800 border-gray-200';
  const statusLabel = STATUS_LABELS[pdp.status] ?? pdp.status;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Retour au registre
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{pdp.name}</h1>
            {pdp.registrationNumber && (
              <p className="text-sm text-gray-500 mt-1">N° {pdp.registrationNumber}</p>
            )}
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusClass}`}
          >
            {statusLabel}
          </span>
        </div>

        <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {pdp.registrationDate && (
            <>
              <dt className="text-gray-500">Date d&apos;immatriculation</dt>
              <dd className="text-gray-900">{pdp.registrationDate}</dd>
            </>
          )}
          {pdp.websiteUrl && (
            <>
              <dt className="text-gray-500">Site web</dt>
              <dd>
                <a
                  href={pdp.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline truncate block"
                >
                  {pdp.websiteUrl}
                </a>
              </dd>
            </>
          )}
          <dt className="text-gray-500">Première observation</dt>
          <dd className="text-gray-900">
            {new Date(pdp.firstSeenAt).toLocaleDateString('fr-FR', { dateStyle: 'long' })}
          </dd>
          <dt className="text-gray-500">Dernière observation</dt>
          <dd className="text-gray-900">
            {new Date(pdp.lastSeenAt).toLocaleDateString('fr-FR', { dateStyle: 'long' })}
          </dd>
          <dt className="text-gray-500">Source</dt>
          <dd>
            <a
              href="https://www.impots.gouv.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              impots.gouv.fr
            </a>
          </dd>
        </dl>
      </div>

      {/* Change history */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Historique des modifications</h2>

        {history.length === 0 ? (
          <p className="text-gray-500 text-sm">Aucune modification enregistrée.</p>
        ) : (
          <ol className="relative border-l border-gray-200 ml-3 space-y-6">
            {history.map((event) => {
              const et = EVENT_LABELS[event.eventType] ?? { label: event.eventType, classes: 'bg-gray-100 text-gray-800' };
              let detail = '';
              try {
                const ov = event.oldValue ? JSON.parse(event.oldValue) : null;
                const nv = event.newValue ? JSON.parse(event.newValue) : null;
                if (event.eventType === 'status_changed' && ov && nv) {
                  detail = `${ov.status} → ${nv.status}`;
                }
              } catch { /* ignore */ }

              return (
                <li key={event.id} className="ml-4">
                  <div className="absolute w-3 h-3 bg-gray-200 rounded-full -left-1.5 border border-white" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${et.classes}`}
                    >
                      {et.label}
                    </span>
                    <time className="text-xs text-gray-500">
                      {new Date(event.detectedAt).toLocaleString('fr-FR', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </time>
                  </div>
                  {detail && <p className="mt-1 text-sm text-gray-600">{detail}</p>}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
