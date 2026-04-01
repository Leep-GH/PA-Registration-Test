'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from './language-provider';
import { t } from '@/lib/i18n';

export default function NavLinks() {
  const pathname = usePathname();
  const { language } = useLanguage();

  const links = [
    { href: '/', label: t(language, 'navRegistry') },
    { href: '/historique', label: t(language, 'navHistory') },
  ];

  return (
    <>
      {links.map(({ href, label }) => {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`text-sm font-body pb-1 border-b-2 transition-colors ${
              isActive
                ? 'text-cream border-accent'
                : 'text-cream/65 border-transparent hover:text-cream hover:border-cream/25'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}
