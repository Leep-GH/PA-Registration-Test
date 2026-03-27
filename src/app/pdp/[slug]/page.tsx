import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPdpBySlug, getAllPdps } from '@/lib/db/repositories/pdps';
import { getChangesForPdp } from '@/lib/db/repositories/changes';
import PdpDetailContent from './pdp-detail-content';

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
  if (!pdp) return { title: 'Platform Not Found' };
  return {
    title: pdp.name,
    description: `Details and change history for ${pdp.name} — DGFiP Platform Registry.`,
  };
}

export default async function PdpDetailPage({ params }: Props) {
  const pdp = await getPdpBySlug(params.slug).catch(() => null);
  if (!pdp) notFound();

  const history = await getChangesForPdp(pdp.id, 50).catch(() => []);

  return <PdpDetailContent pdp={pdp} history={history} />;
}
