'use client';

import { useLanguage } from '@/components/language-provider';

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex gap-1 ml-auto items-center">
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1.5 text-xs font-body font-semibold uppercase tracking-wider transition-colors ${
          language === 'en'
            ? 'text-navy bg-cream rounded'
            : 'text-cream/70 hover:text-cream'
        }`}
      >
        EN
      </button>
      <span className="text-cream/30 text-xs">|</span>
      <button
        onClick={() => setLanguage('fr')}
        className={`px-3 py-1.5 text-xs font-body font-semibold uppercase tracking-wider transition-colors ${
          language === 'fr'
            ? 'text-navy bg-cream rounded'
            : 'text-cream/70 hover:text-cream'
        }`}
      >
        FR
      </button>
    </div>
  );
}
