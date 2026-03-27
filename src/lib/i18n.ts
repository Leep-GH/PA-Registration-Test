// Translation dictionary
export type Language = 'en' | 'fr';

export const translations = {
  en: {
    // Header
    headerSubtitle: 'Approved Platforms · DGFiP Registry',
    navRegistry: 'Registry',
    navHistory: 'History',
    
    // Main page
    pageTitle: 'Approved Platform Registry',
    pageDescription:
      'Real-time tracking of the official DGFiP registry of approved platforms (ex-PDP) for electronic invoicing.',
    lastUpdated: 'Last updated:',
    sourceLink: 'Source: impots.gouv.fr',
    
    // Stats
    statsRegistered: 'Registered',
    statsCandidate: 'Candidate',
    statsAdded: 'Added this month',
    statsRemoved: 'Withdrawn this month',
    statsNotEnoughData: 'Not enough data yet — check back after the first weekly cycle',
    
    // Table
    statusRegistered: 'Registered',
    statusCandidate: 'Candidate',
    statusRemoved: 'Withdrawn',
    tableStatusFilter: 'All',
    tableSearch: 'Search…',
    tableColName: 'Name',
    tableColStatus: 'Status',
    tableColDate: 'Registered On',
    tableColWebsite: 'Website',
    tableColFirstSeen: 'First Tracked',
    tooltipFirstTracked: 'The date this platform was first detected by this tracker',
    tableNoResults: 'No approved platforms found.',
    tablePlatforms: (count: number) =>
      `${count} platform${count !== 1 ? 's' : ''} tracked`,
    tablePlatformsApproved: (count: number) =>
      `${count} platform${count !== 1 ? 's' : ''} approved`,
    
    // Pagination
    paginationPrevious: '← Previous',
    paginationNext: 'Next →',
    paginationPage: (current: number, total: number) =>
      `Page ${current} / ${total}`,
    
    // Newsletter
    newsletterTitle: 'Receive change alerts',
    newsletterPlaceholder: 'your@email.com',
    newsletterButton: 'Subscribe',
    newsletterSuccess: 'Confirmation email sent. Please check your inbox.',
    newsletterError: 'Subscription error. Please try again.',
    
    // Privacy
    privacyTitle: 'Privacy Policy',
    privacyLastUpdated: 'Last updated: March 2026',
    
    // History
    historyTitle: 'Change History',
    
    // Detail page
    detailBackToRegistry: '← Back to registry',
    detailRegistrationNumber: 'No.',
    detailRegistrationDate: 'Registration date',
    detailWebsite: 'Website',
    detailContactEmail: 'Contact email',
    detailFirstTracked: 'First tracked',
    detailLastTracked: 'Last tracked',
    detailSource: 'Source',
    detailChangeHistory: 'Change History',
    detailNoChanges: 'No changes recorded.',
    detailEventAdded: 'Added',
    detailEventRemoved: 'Removed',
    detailEventStatusChanged: 'Status changed',
    
    // Footer
    footerDisclaimer: 'Unofficial tracker — data source:',
    footerPrivacy: 'Privacy Policy',
  },
  fr: {
    // Header
    headerSubtitle: 'Plateformes Agréées · Suivi DGFiP',
    navRegistry: 'Registre',
    navHistory: 'Historique',
    
    // Main page
    pageTitle: 'Registre des Plateformes Agréées',
    pageDescription:
      'Suivi du registre officiel DGFiP mis à jour quotidiennement.',
    lastUpdated: 'Dernière mise à jour :',
    sourceLink: 'Source : impots.gouv.fr',
    
    // Stats
    statsRegistered: 'Immatriculée',
    statsCandidate: 'Candidate',
    statsAdded: 'Ajoutée ce mois-ci',
    statsRemoved: 'Retirée ce mois-ci',
    statsNotEnoughData: 'Données insuffisantes — revenez après le premier cycle hebdomadaire',
    
    // Table
    statusRegistered: 'Immatriculée',
    statusCandidate: 'Candidate',
    statusRemoved: 'Retirée',
    tableStatusFilter: 'Tous',
    tableSearch: 'Rechercher…',
    tableColName: 'Nom',
    tableColStatus: 'Statut',
    tableColDate: 'Enregistrée le',
    tableColWebsite: 'Site web',
    tableColFirstSeen: 'Première détection',
    tooltipFirstTracked: 'La date de la première détection de cette plateforme par ce suivi',
    tableNoResults: 'Aucune plateforme agréée trouvée.',
    tablePlatforms: (count: number) =>
      `${count} plateforme${count !== 1 ? ' suivie' : ' suivie'}${count !== 1 ? 's' : ''}`,
    tablePlatformsApproved: (count: number) =>
      `${count} plateforme${count !== 1 ? ' agréée' : ' agréée'}${count !== 1 ? 's' : ''}`,
    
    // Pagination
    paginationPrevious: '← Précédent',
    paginationNext: 'Suivant →',
    paginationPage: (current: number, total: number) =>
      `Page ${current} / ${total}`,
    
    // Newsletter
    newsletterTitle: 'Recevoir les alertes de modification',
    newsletterPlaceholder: 'votre@email.com',
    newsletterButton: 'S\'abonner',
    newsletterSuccess: 'Email de confirmation envoyé. Vérifiez votre boîte de réception.',
    newsletterError: 'Erreur d\'abonnement. Réessayez.',
    
    // Privacy
    privacyTitle: 'Politique de confidentialité',
    privacyLastUpdated: 'Dernière mise à jour : mars 2026',
    
    // History
    historyTitle: 'Historique des modifications',
    
    // Detail page
    detailBackToRegistry: '← Retour au registre',
    detailRegistrationNumber: 'N°',
    detailRegistrationDate: 'Date d\'immatriculation',
    detailWebsite: 'Site web',
    detailContactEmail: 'Email de contact',
    detailFirstTracked: 'Première observation',
    detailLastTracked: 'Dernière observation',
    detailSource: 'Source',
    detailChangeHistory: 'Historique des modifications',
    detailNoChanges: 'Aucune modification enregistrée.',
    detailEventAdded: 'Ajout',
    detailEventRemoved: 'Suppression',
    detailEventStatusChanged: 'Changement',
    
    // Footer
    footerDisclaimer: 'Tracker non officiel — données source :',
    footerPrivacy: 'Politique de confidentialité',
  },
} as const;

export function t(lang: Language, key: keyof typeof translations.en, ...args: unknown[]) {
  const dict = translations[lang];
  const value = dict[key as keyof typeof dict];
  if (typeof value === 'function') {
    return (value as any)(...args);
  }
  return value as string;
}
