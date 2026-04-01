import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPeppolApBySlug, getAllPeppolAps } from '@/lib/db/repositories/peppol-aps';
import PeppolDetailContent from './peppol-detail-content';

interface Props {
  params: { slug: string };
}

export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const aps = await getAllPeppolAps({ isActive: true });
    return aps.map((ap) => ({ slug: ap.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ap = await getPeppolApBySlug(params.slug).catch(() => null);
  if (!ap) return { title: 'Platform Not Found' };
  return {
    title: ap.name,
    description: `Peppol Access Point details for ${ap.name} — PA Registry Tracker.`,
  };
}

export default async function PeppolDetailPage({ params }: Props) {
  const ap = await getPeppolApBySlug(params.slug).catch(() => null);
  if (!ap) notFound();

  return <PeppolDetailContent ap={ap} />;
}
