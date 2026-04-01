'use client';

import { useState, type FormEvent } from 'react';
import { useLanguage } from '@/components/language-provider';
import { t } from '@/lib/i18n';

export default function SubscribeForm() {
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json() as { message?: string; error?: string };

      if (res.ok) {
        setStatus('success');
        setMessage(data.message ?? t(language, 'newsletterSuccess'));
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error ?? t(language, 'newsletterError'));
      }
    } catch {
      setStatus('error');
      setMessage(t(language, 'newsletterError'));
    }
  }

  return (
    <div className="card p-6">
      {status === 'success' ? (
        <div className="flex items-start gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-sm font-body">
          <span>✓</span>
          <span>{message}</span>
        </div>
      ) : (
        <>
          <p className="text-xs font-body text-slate-400 mb-4">
            {language === 'en'
              ? 'An email will be sent as soon as a change is detected in the registry. No spam, unsubscribe with one click.'
              : "Un email sera envoyé dès qu'un changement est détecté dans le registre. Pas de spam, désinscription en un clic."}
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
            <label htmlFor="subscribe-email" className="sr-only">
              {language === 'en' ? 'Email address' : 'Adresse email'}
            </label>
            <input
              id="subscribe-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t(language, 'newsletterPlaceholder')}
              required
              disabled={status === 'loading'}
              className="flex-1 px-3.5 py-2 text-sm font-body border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent placeholder:text-slate-400 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={status === 'loading' || !email.trim()}
              className="px-5 py-2 text-sm font-body font-semibold text-white bg-accent hover:bg-accent-hover rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap transition-colors"
            >
              {status === 'loading'
                ? language === 'en'
                  ? 'Sending…'
                  : 'Envoi…'
                : t(language, 'newsletterButton')}
            </button>
          </form>
        </>
      )}

      {status === 'error' && message && (
        <p className="mt-2 text-sm text-red-600 font-body">{message}</p>
      )}
    </div>
  );
}
