import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { LanguageProvider } from '@/components/language-provider';
import LanguageToggle from '@/components/language-toggle';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  title: {
    default: 'PA Registry Tracker',
    template: '%s | PA Registry Tracker',
  },
  description:
    'Real-time tracking of the official DGFiP registry of approved platforms (ex-PDP) for electronic invoicing.',
  metadataBase: new URL(appUrl),
  openGraph: {
    title: 'PA Registry Tracker',
    description:
      'Real-time tracking of the official DGFiP registry of approved platforms (ex-PDP).',
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
    <html lang="en">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-cream text-navy">
        <LanguageProvider>
          <header className="bg-white border-b border-slate-200">
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                  <span className="text-white font-bold text-sm">PA</span>
                </div>
                <span className="font-display font-bold text-lg text-navy">
                  Registry PA
                </span>
              </Link>
              <nav className="flex items-center gap-6 text-sm font-body font-medium">
                <Link href="/" className="text-slate-600 hover:text-accent transition-colors">
                  Registry
                </Link>
                <Link href="/historique" className="text-slate-600 hover:text-accent transition-colors">
                  History
                </Link>
                <div className="w-px h-5 bg-slate-200" />
                <LanguageToggle />
              </nav>
            </div>
          </header>

          <main className="max-w-6xl mx-auto px-6 py-10">{children}</main>

          <footer className="border-t border-slate-200 mt-16 py-8 text-center text-xs text-slate-400 font-body">
            <p>
              Unofficial tracker — data source:{' '}
              <a
                href="https://www.impots.gouv.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                impots.gouv.fr
              </a>
              {' · '}
              <a
                href="https://peppol.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                peppol.org
              </a>
            </p>
            <p className="mt-2">
              <Link href="/privacy" className="hover:underline">
                Privacy Policy
              </Link>
            </p>
          </footer>
        </LanguageProvider>
      </body>
    </html>
  );
}
