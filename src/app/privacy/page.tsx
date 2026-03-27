import type { Metadata } from 'next';
import PrivacyContent from './privacy-content';

export const metadata: Metadata = {
  title: 'Privacy Policy | PA Registry Tracker',
  description: 'Privacy policy and personal data handling for PA Registry Tracker.',
};

export default function PrivacyPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  return <PrivacyContent appUrl={appUrl} />;
}
