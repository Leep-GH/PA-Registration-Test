import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description: 'Politique de confidentialité et traitement des données personnelles du PA Registry Tracker.',
};

export default function PrivacyPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="font-display text-3xl text-navy">Politique de confidentialité</h1>
      <p className="text-xs font-mono text-navy/40 uppercase tracking-wider">Dernière mise à jour : mars 2026</p>
      <div className="hr-rule" />

      <section className="space-y-4">
        <h2 className="font-display text-xl text-navy">1. Qui sommes-nous ?</h2>
        <p className="text-navy/70 font-body leading-relaxed">
          PA Registry Tracker est un service non officiel de surveillance du registre DGFiP
          des Plateformes Agréées (ex-PDP, Plateformes de Dématérialisation Partenaires). Il est disponible à l&apos;adresse{' '}
          <a href={appUrl} className="text-accent hover:underline">
            {appUrl}
          </a>.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl text-navy">2. Données collectées</h2>
        <p className="text-navy/70 font-body leading-relaxed">
          Ce service collecte <strong>uniquement les adresses e-mail</strong> des utilisateurs qui
          s&apos;abonnent volontairement aux alertes de modification. Aucune autre donnée
          personnelle n&apos;est collectée (pas de cookies de suivi, pas d&apos;analytics tiers).
        </p>
        <ul className="list-disc list-inside text-navy/70 font-body space-y-1">
          <li>Adresse e-mail (pour envoi des alertes)</li>
          <li>Date et heure de l&apos;abonnement</li>
          <li>Statut de confirmation (opt-in double)</li>
          <li>Jeton de désabonnement (aléatoire, non lié à votre identité)</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl text-navy">3. Finalité du traitement</h2>
        <p className="text-navy/70 font-body leading-relaxed">
          Les adresses e-mail sont utilisées <strong>exclusivement</strong> pour vous envoyer des
          alertes lorsque des modifications sont détectées dans le registre DGFiP des Plateformes Agréées (ex-PDP). Elles
          ne sont jamais partagées, vendues ou utilisées à des fins commerciales.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl text-navy">4. Double opt-in</h2>
        <p className="text-navy/70 font-body leading-relaxed">
          L&apos;abonnement requiert une confirmation par e-mail (double opt-in). Les abonnements
          non confirmés sous 48 heures sont automatiquement supprimés.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl text-navy">5. Durée de conservation</h2>
        <p className="text-navy/70 font-body leading-relaxed">
          Vos données sont conservées tant que vous êtes abonné(e). À la suite d&apos;un
          désabonnement, un enregistrement horodaté est conservé à des fins de preuve du
          consentement et de la révocation (conformément au RGPD). Cet enregistrement ne contient
          que votre adresse e-mail et les horodatages d&apos;abonnement et de désabonnement.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl text-navy">6. Vos droits (RGPD)</h2>
        <p className="text-navy/70 font-body leading-relaxed">Conformément au RGPD, vous disposez des droits suivants :</p>
        <ul className="list-disc list-inside text-navy/70 font-body space-y-1">
          <li>
            <strong>Droit de retrait du consentement et de suppression :</strong> utilisez le lien
            de désabonnement présent dans chaque e-mail, ou accédez à{' '}
            <code className="text-xs bg-gray-100 px-1 rounded">{appUrl}/api/unsubscribe?token=&lt;votre-jeton&gt;</code>
          </li>
          <li>
            <strong>Droit d&apos;accès :</strong> contactez-nous à l&apos;adresse ci-dessous
          </li>
          <li>
            <strong>Droit de rectification :</strong> désabonnez-vous et réabonnez-vous avec la
            bonne adresse
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl text-navy">7. Contact</h2>
        <p className="text-navy/70 font-body leading-relaxed">
          Pour toute question relative à vos données personnelles, contactez le responsable du
          traitement via le dépôt GitHub associé à ce projet.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl text-navy">8. Cookies</h2>
        <p className="text-navy/70 font-body leading-relaxed">
          Ce site n&apos;utilise aucun cookie de suivi ou d&apos;analyse. Aucun script tiers n&apos;est
          chargé.
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
