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
          <div className="hr-rule mt-6" />
        </div>

        <section className="space-y-4">
          <h2 className="font-display text-xl text-navy">1. About Us</h2>
          <p className="text-navy/70 font-body leading-relaxed">
            PA Registry Tracker is an unofficial monitoring service for the DGFiP registry of approved platforms (formerly PDP — Plateformes de Dématérialisation Partenaires). It is available at{' '}
            <a href={appUrl} className="text-accent hover:underline">
              {appUrl}
            </a>.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-xl text-navy">2. Data Collected</h2>
          <p className="text-navy/70 font-body leading-relaxed">
            This service collects <strong>only email addresses</strong> from users who voluntarily subscribe to modification alerts. No other personal data is collected (no tracking cookies, no third-party analytics).
          </p>
          <ul className="list-disc list-inside text-navy/70 font-body space-y-1">
            <li>Email address (for sending alerts)</li>
            <li>Date and time of subscription</li>
            <li>Confirmation status (double opt-in)</li>
            <li>Unsubscribe token (randomized, not linked to your identity)</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-xl text-navy">3. Purpose of Processing</h2>
          <p className="text-navy/70 font-body leading-relaxed">
            Email addresses are used <strong>exclusively</strong> to send you alerts when changes are detected in the DGFiP registry of approved platforms. They are never shared, sold, or used for commercial purposes.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-xl text-navy">4. Double Opt-In</h2>
          <p className="text-navy/70 font-body leading-relaxed">
            Subscription requires email confirmation (double opt-in). Unconfirmed subscriptions are automatically deleted after 48 hours.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-xl text-navy">5. Data Retention</h2>
          <p className="text-navy/70 font-body leading-relaxed">
            Your data is retained while you are subscribed. Following unsubscription, a timestamped record is retained for proof of consent and revocation (in compliance with GDPR). This record contains only your email address and subscription/unsubscription timestamps.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-xl text-navy">6. Your Rights (GDPR)</h2>
          <p className="text-navy/70 font-body leading-relaxed">Under GDPR, you have the following rights:</p>
          <ul className="list-disc list-inside text-navy/70 font-body space-y-1">
            <li>
              <strong>Right to withdraw consent and delete:</strong> Use the unsubscribe link in any email, or access{' '}
              <code className="text-xs bg-gray-100 px-1 rounded">{appUrl}/api/unsubscribe?token=&lt;your-token&gt;</code>
            </li>
            <li>
              <strong>Right of access:</strong> Contact us at the address below
            </li>
            <li>
              <strong>Right to rectify:</strong> Unsubscribe and resubscribe with the correct address
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-xl text-navy">7. Contact</h2>
          <p className="text-navy/70 font-body leading-relaxed">
            For any questions about your personal data, contact the data controller via the GitHub repository associated with this project.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-xl text-navy">8. Cookies</h2>
          <p className="text-navy/70 font-body leading-relaxed">
            This site uses no tracking or analytics cookies. No third-party scripts are loaded.
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
        <div className="hr-rule mt-6" />
      </div>

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
