'use client';

import { useState, type FormEvent } from 'react';

export default function SubscribeForm() {
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
        setMessage(data.message ?? 'Un email de confirmation a été envoyé.');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error ?? "Une erreur s'est produite. Veuillez réessayer.");
      }
    } catch {
      setStatus('error');
      setMessage("Impossible de joindre le serveur. Veuillez réessayer.");
    }
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-1">
        Recevoir les alertes de modification
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Un email sera envoyé dès qu&apos;un changement est détecté dans le registre. Pas de spam, désinscription en un clic.
      </p>

      {status === 'success' ? (
        <div className="flex items-start gap-2 text-green-700 bg-green-50 border border-green-200 rounded p-3 text-sm">
          <span>✓</span>
          <span>{message}</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <label htmlFor="subscribe-email" className="sr-only">
            Adresse email
          </label>
          <input
            id="subscribe-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.fr"
            required
            disabled={status === 'loading'}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={status === 'loading' || !email.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {status === 'loading' ? 'Envoi…' : "M'alerter des changements"}
          </button>
        </form>
      )}

      {status === 'error' && message && (
        <p className="mt-2 text-sm text-red-600">{message}</p>
      )}
    </div>
  );
}
