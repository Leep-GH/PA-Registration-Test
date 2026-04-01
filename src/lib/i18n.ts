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
      'Tracking the official DGFiP registry of Plateformes Agréées and the OpenPeppol certified Access Points registry.',
    lastUpdated: 'Last updated:',
    sourcesLabel: 'Sources:',
    sourceLink: 'impots.gouv.fr',
    peppolSourceLink: 'peppol.org',
    
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

    // Registry filter
    registryFilterLabel: 'Registry',
    registryFilterAll: 'All registries',
    registryFilterPa: 'PA only',
    registryFilterPeppolAp: 'Peppol AP only',
    registryFilterBoth: 'Both registries',
    badgePeppolAp: 'Peppol AP',
    badgeBothRegistries: 'Both',
    peppolApCountry: 'Country',
    peppolApAuthority: 'Authority',
    peppolApCertifications: 'Certifications',
    badgeBothTooltip: 'This platform is certified as both a French Plateforme Agréée (DGFiP) and a Peppol Access Point (OpenPeppol)',
    detailAddress: 'Address',
    detailPeppolSection: 'Peppol Access Point',
    detailPeppolExplainer: 'This platform is also certified as a Peppol Access Point by OpenPeppol. Peppol is an international network enabling cross-border electronic document exchange.',

    // Peppol-only detail page
    peppolDetailOnlyBadge: 'Peppol AP only',
    peppolDetailNotPaNotice: 'This platform appears in the OpenPeppol Access Point registry but is not registered as a French Plateforme Agréée (PA) in the DGFiP registry.',
    peppolDetailCountry: 'Country',
    peppolDetailAuthority: 'Authority',
    peppolDetailCertifications: 'Certifications',
    peppolDetailFirstSeen: 'First tracked',
    peppolDetailLastSeen: 'Last tracked',
    peppolDetailSource: 'Source',
    peppolDetailViewOnPeppol: 'View on peppol.org',
  },
  fr: {
    // Header
    headerSubtitle: 'Plateformes Agréées · Suivi DGFiP',
    navRegistry: 'Registre',
    navHistory: 'Historique',
    
    // Main page
    pageTitle: 'Registre des Plateformes Agréées',
    pageDescription:
      'Suivi du registre officiel DGFiP des Plateformes Agréées et du registre OpenPeppol des Access Points certifiés.',
    lastUpdated: 'Dernière mise à jour :',
    sourcesLabel: 'Sources :',
    sourceLink: 'impots.gouv.fr',
    peppolSourceLink: 'peppol.org',
    
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

    // Registry filter
    registryFilterLabel: 'Registre',
    registryFilterAll: 'Tous les registres',
    registryFilterPa: 'PA uniquement',
    registryFilterPeppolAp: 'Peppol AP uniquement',
    registryFilterBoth: 'Les deux registres',
    badgePeppolAp: 'Peppol AP',
    badgeBothRegistries: 'Les deux',
    peppolApCountry: 'Pays',
    peppolApAuthority: 'Autorité',
    peppolApCertifications: 'Certifications',
    badgeBothTooltip: 'Cette plateforme est certifiée à la fois Plateforme Agréée (DGFiP) et Point d\'Accès Peppol (OpenPeppol)',
    detailAddress: 'Adresse',
    detailPeppolSection: 'Point d\'Accès Peppol',
    detailPeppolExplainer: 'Cette plateforme est également certifiée Point d\'Accès Peppol par OpenPeppol. Peppol est un réseau international permettant l\'échange de documents électroniques transfrontaliers.',

    // Peppol-only detail page
    peppolDetailOnlyBadge: 'Peppol AP uniquement',
    peppolDetailNotPaNotice: 'Cette plateforme est répertoriée dans le registre OpenPeppol des Points d\'Accès mais n\'est pas immatriculée comme Plateforme Agréée (PA) dans le registre DGFiP.',
    peppolDetailCountry: 'Pays',
    peppolDetailAuthority: 'Autorité',
    peppolDetailCertifications: 'Certifications',
    peppolDetailFirstSeen: 'Première détection',
    peppolDetailLastSeen: 'Dernière détection',
    peppolDetailSource: 'Source',
    peppolDetailViewOnPeppol: 'Voir sur peppol.org',
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
