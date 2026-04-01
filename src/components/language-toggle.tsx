'use client';

import { useLanguage } from '@/components/language-provider';

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex gap-0.5 items-center bg-slate-100 rounded-lg p-0.5">
      <button
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1 text-xs font-body font-semibold rounded-md transition-all ${
          language === 'en'
            ? 'bg-white text-navy shadow-sm'
            : 'text-slate-500 hover:text-navy'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('fr')}
        className={`px-2.5 py-1 text-xs font-body font-semibold rounded-md transition-all ${
          language === 'fr'
            ? 'bg-white text-navy shadow-sm'
            : 'text-slate-500 hover:text-navy'
        }`}
      >
        FR
      </button>
    </div>
  );
}
