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
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-cream text-navy">
        <LanguageProvider>
          <header className="bg-navy text-cream">
            <div className="max-w-5xl mx-auto px-4 pt-8 pb-6">
              <Link href="/" className="block">
                <span className="font-display text-3xl sm:text-4xl tracking-tight">
                  Registry{' '}
                  <span className="text-accent">PA</span>
                </span>
                <span className="block text-cream/50 text-[11px] font-body uppercase tracking-[0.3em] mt-1.5">
                  Approved Platforms · DGFiP Registry
                </span>
              </Link>
            </div>
            <nav className="max-w-5xl mx-auto px-4 pb-4 flex items-center gap-5 text-sm font-body">
              <Link href="/" className="text-cream/70 hover:text-cream transition-colors">
                Registry
              </Link>
              <Link href="/historique" className="text-cream/70 hover:text-cream transition-colors">
                History
              </Link>
              <LanguageToggle />
            </nav>
            <div className="h-px bg-gradient-to-r from-accent via-accent/60 to-transparent" />
          </header>

          <main className="max-w-5xl mx-auto px-4 py-10">{children}</main>

          <footer className="hr-rule mt-16 py-8 text-center text-xs text-navy/40 font-mono">
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
