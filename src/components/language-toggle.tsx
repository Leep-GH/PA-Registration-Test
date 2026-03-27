'use client';

import { useLanguage } from '@/components/language-provider';

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex gap-2 ml-auto items-center">
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1.5 text-xs font-body font-medium uppercase tracking-wider rounded transition-colors ${
          language === 'en'
            ? 'text-accent border border-accent/70 bg-accent/10'
            : 'text-cream/80 border border-cream/20 hover:text-cream'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('fr')}
        className={`px-3 py-1.5 text-xs font-body font-medium uppercase tracking-wider rounded transition-colors ${
          language === 'fr'
            ? 'text-accent border border-accent/70 bg-accent/10'
            : 'text-cream/80 border border-cream/20 hover:text-cream'
        }`}
      >
        FR
      </button>
    </div>
  );
}
