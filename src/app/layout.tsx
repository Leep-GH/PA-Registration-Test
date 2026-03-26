import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  title: {
    default: 'PA Registry Tracker',
    template: '%s | PA Registry Tracker',
  },
  description:
    'Suivi du registre officiel DGFiP des Plateformes Agréées (PA, ex-PDP) pour la facturation électronique.',
  metadataBase: new URL(appUrl),
  openGraph: {
    title: 'PA Registry Tracker',
    description:
      'Suivi en temps réel du registre officiel DGFiP des Plateformes Agréées (ex-PDP).',
    url: appUrl,
    siteName: 'PA Registry Tracker',
    type: 'website',
  },
  alternates: {
    types: {
      'application/rss+xml': `${appUrl}/rss.xml`,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link
          rel="alternate"
          type="application/rss+xml"
          title="PA Registry Tracker — Flux de modifications"
          href={`${appUrl}/rss.xml`}
        />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="bg-white border-b border-gray-200">
          <nav className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
            <Link href="/" className="font-semibold text-gray-900 hover:text-blue-600">
              PA Tracker
            </Link>
            <Link href="/" className="text-sm text-gray-600 hover:text-blue-600">
              Registre
            </Link>
            <Link href="/historique" className="text-sm text-gray-600 hover:text-blue-600">
              Historique
            </Link>
          </nav>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>

        <footer className="border-t border-gray-200 mt-12 py-6 text-center text-sm text-gray-500">
          <p>
            Tracker non officiel — données source :{' '}
            <a
              href="https://www.impots.gouv.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              impots.gouv.fr
            </a>
          </p>
          <p className="mt-1">
            <Link href="/privacy" className="hover:underline">
              Politique de confidentialité
            </Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
