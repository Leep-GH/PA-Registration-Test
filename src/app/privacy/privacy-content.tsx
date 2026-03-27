'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';

interface Props {
  appUrl: string;
}

export default function PrivacyContent({ appUrl }: Props) {
  const { language } = useLanguage();

  if (language === 'en') {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="font-display text-3xl text-navy">Privacy Policy</h1>
          <p className="mt-2 text-xs font-mono text-navy/40 uppercase tracking-wider">Last updated: March 2026</p>
          <p className="mt-4 text-sm text-navy/60 italic leading-relaxed">
            This is an independent monitoring service. It is not affiliated with, endorsed by, or connected to the DGFiP or the French government. All data is sourced from the official DGFiP registry at <a href="https://www.impots.gouv.fr" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">impots.gouv.fr</a>.
          </p>
          <div className="hr-rule mt-6" />
        </div>

        <section className="space-y-4">
          <h2 className="font-display text-xl text-navy">What we collect</h2>
          <p className="text-navy/70 font-body leading-relaxed">
            Nothing. This site collects no personal data, no email addresses, and sets no tracking cookies.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-xl text-navy">Analytics</h2>
          <p className="text-navy/70 font-body leading-relaxed">
            This site uses no third-party analytics or tracking scripts.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-xl text-navy">Data source</h2>
          <p className="text-navy/70 font-body leading-relaxed">
            All platform data is sourced from the official DGFiP registry at{' '}
            <a href="https://www.impots.gouv.fr" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              impots.gouv.fr
            </a>. This is an unofficial tracker — it is not affiliated with DGFiP or the French government.
          </p>
        </section>

        <div className="pt-4">
          <Link href="/" className="text-xs font-mono text-accent uppercase tracking-wider hover:underline">
            ← Back to registry
          </Link>
        </div>
      </div>
    );
  }

  // French version
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-3xl text-navy">Politique de confidentialité</h1>
        <p className="mt-2 text-xs font-mono text-navy/40 uppercase tracking-wider">Dernière mise à jour : mars 2026</p>
        <p className="mt-4 text-sm text-navy/60 italic leading-relaxed">
          Ceci est un service de surveillance indépendant. Il n&apos;est pas affilié à, approuvé par ou connecté à la DGFiP ou au gouvernement français. Toutes les données proviennent du registre officiel DGFiP sur <a href="https://www.impots.gouv.fr" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">impots.gouv.fr</a>.
        </p>
        <div className="hr-rule mt-6" />
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-xl text-navy">Ce que nous collectons</h2>
        <p className="text-navy/70 font-body leading-relaxed">
          Rien. Ce site ne collecte aucune donnée personnelle, aucune adresse e-mail, et ne définit aucun cookie de suivi.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl text-navy">Analyse</h2>
        <p className="text-navy/70 font-body leading-relaxed">
          Ce site n&apos;utilise aucun script d&apos;analyse ou de suivi tiers.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl text-navy">Source des données</h2>
        <p className="text-navy/70 font-body leading-relaxed">
          Toutes les données de plateforme proviennent du registre officiel DGFiP sur{' '}
          <a href="https://www.impots.gouv.fr" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            impots.gouv.fr
          </a>. Ceci est un suivi non officiel — il n&apos;est pas affilié à la DGFiP ou au gouvernement français.
        </p>
      </section>

      <div className="pt-4">
        <Link href="/" className="text-xs font-mono text-accent uppercase tracking-wider hover:underline">
          ← Retour au registre
        </Link>
      </div>
    </div>
  );
}
