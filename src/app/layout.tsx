import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { LanguageProvider } from '@/components/language-provider';
import LanguageToggle from '@/components/language-toggle';
import NavLinks from '@/components/nav-links';

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
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-cream text-navy">
        <LanguageProvider>
          <header className="bg-navy text-cream">
            <div className="max-w-5xl mx-auto px-4 pt-9 pb-5">
              <Link href="/" className="block">
                <span className="font-display text-4xl sm:text-5xl tracking-tight">
                  Registry{' '}
                  <span className="text-accent">PA</span>
                </span>
                <span className="block text-cream/50 text-[10px] font-body uppercase tracking-[0.35em] mt-2">
                  Plateformes Agréées · e-Invoicing Registry
                </span>
              </Link>
            </div>
            <nav className="max-w-5xl mx-auto px-4 pb-5 flex items-center gap-6 text-sm font-body">
              <NavLinks />
              <LanguageToggle />
            </nav>
            <div className="h-px bg-gradient-to-r from-accent via-accent/50 to-transparent" />
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
