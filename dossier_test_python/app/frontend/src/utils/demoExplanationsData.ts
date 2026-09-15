import { ExplanationData } from '../components/common/DemoExplanationModal';

export const DEMO_EXPLANATIONS = {
  // Config & Scan Explanations
  scanBrowseFolder: {
    title: 'Sélection du Dossier Cible à Scanner',
    icon: '📁',
    category: 'MODE DÉMO • CONFIGURATION',
    description: 'Permet de parcourir vos répertoires pour sélectionner le dossier absolu à indexer.',
    details: [
      'Renseigne le chemin absolu du dossier source.',
      'Parcourt l\'arborescence locale ou réseau.',
    ],
    actionText: 'Parcourir les dossiers',
  } as ExplanationData,

  scanAddExclusion: {
    title: 'Gestion des Dossiers Exclus du Scan',
    icon: '🚫',
    category: 'MODE DÉMO • CONFIGURATION',
    description: 'Définissez des sous-répertoires à ignorer lors de l\'indexation (caches, fichiers temporaires).',
    details: [
      'Évite d\'indexer des volumes inutiles.',
      'Accélère le traitement des scans ultérieurs.',
    ],
    actionText: 'Ajouter une exclusion',
  } as ExplanationData,

  scanEdsInput: {
    title: 'Identification du Serveur NAS (EDS)',
    icon: '💻',
    category: 'MODE DÉMO • CONFIGURATION',
    description: 'Renseignez ou choisissez le nom du serveur de stockage.',
    details: [
      'Associe la source au serveur réseau correspondant.',
      'Affiche des suggestions basées sur l\'historique.',
    ],
    actionText: 'Saisir le nom d\'EDS',
  } as ExplanationData,

  scanCelluleInput: {
    title: 'Cellule de la Source',
    icon: '🏢',
    category: 'MODE DÉMO • CONFIGURATION',
    description: 'Indiquez la cellule ou le service métier propriétaire de ce dossier.',
    details: [
      'Structure la propriété documentaire par service.',
      'Propose des suggestions de cellules déjà existantes.',
    ],
    actionText: 'Saisir la cellule',
  } as ExplanationData,

  scanDeposit: {
    title: 'Dépôt & Indexation Directe',
    icon: '📂',
    category: 'MODE DÉMO • CONFIGURATION',
    description: 'Zone de glisser-déposer pour indexer directement un dossier dans la base de données PostgreSQL.',
    details: [
      'Glissez-déposez n\'importe quel dossier local dans cette zone.',
      'Transmet les fichiers par paquets instantanés (Stream-to-DB).',
      'Consigne en direct chaque paquet inséré dans PostgreSQL.',
    ],
    actionText: 'Compris',
  } as ExplanationData,

  scanForceComplete: {
    title: 'Option : Forcer un Scan Complet',
    icon: '🔄',
    category: 'MODE DÉMO • CONFIGURATION',
    description: 'Force la réindexation intégrale de tous les fichiers, y compris ceux déjà enregistrés.',
    details: [
      'Recalcule les tailles et remet à jour l\'ensemble des métadonnées.',
      'Recommandé après une réorganisation importante.',
    ],
    actionText: 'Basculer l\'option scan complet',
  } as ExplanationData,

  scanTriggerStart: {
    title: 'Déclenchement du Scan PostgreSQL',
    icon: '🚀',
    category: 'MODE DÉMO • EXECUTION',
    description: 'Démarre le traitement d\'indexation des fichiers dans la base de données PostgreSQL.',
    details: [
      'Supervision en temps réel du nombre de fichiers analysés.',
      'Gestion automatique des doublons et conflits de chemins.',
    ],
    actionText: 'Déclencher le scan',
  } as ExplanationData,

  // Champ de saisie mots-clés
  searchQueryInput: {
    title: 'Saisie de Mots-clés de Recherche',
    icon: '🔍',
    category: 'MODE DÉMO • SAISIE',
    description: 'Saisissez des termes, des noms de fichiers ou des chemins pour lancer une recherche instantanée dans le catalogue.',
    details: [
      'Lancement automatique de la recherche dès 2 caractères saisis.',
      'Validation immédiate avec la touche Entrée.',
      'Recherche combinée sur les noms et arborescences indexés.',
    ],
    actionText: 'Continuer la saisie',
  } as ExplanationData,

  // Dropdown EDS
  edsFilterDropdown: {
    title: 'Filtre par Serveurs NAS (EDS)',
    icon: '💻',
    category: 'MODE DÉMO • FILTRAGE',
    description: 'Permet de cibler la recherche sur des serveurs de stockage ou EDS spécifiques.',
    details: [
      'Sélection multiple de serveurs.',
      'Filtre instantanément la liste des résultats.',
    ],
    actionText: 'Afficher les EDS',
  } as ExplanationData,

  // Dropdown Cellules
  sourceFilterDropdown: {
    title: 'Filtre par Cellules / Services',
    icon: '🏢',
    category: 'MODE DÉMO • FILTRAGE',
    description: 'Cible les fichiers appartenant à un service ou une cellule spécifique.',
    details: [
      'Permet d\'isoler la production documentaire par service métier.',
    ],
    actionText: 'Afficher les cellules',
  } as ExplanationData,

  // Dropdown Extensions
  extFilterDropdown: {
    title: 'Filtre par Extensions (.pdf, .docx...)',
    icon: '📄',
    category: 'MODE DÉMO • FILTRAGE',
    description: 'Sélectionnez une ou plusieurs extensions pour filtrer les types de fichiers.',
    details: [
      'Liste ordonnée par la fréquence des formats enregistrés en base.',
      'Ciblage rapide de documents PDF, images, vidéos ou tableurs.',
    ],
    actionText: 'Afficher les extensions',
  } as ExplanationData,

  // Dropdown Tags
  tagFilterDropdown: {
    title: 'Filtre par Étiquettes (Tags)',
    icon: '🏷️',
    category: 'MODE DÉMO • FILTRAGE',
    description: 'Recherchez les fichiers disposant de tags métier personnalisés.',
    details: [
      'Facilite le suivi des dossiers (ex: "à archiver", "important").',
    ],
    actionText: 'Afficher les tags',
  } as ExplanationData,

  // Filtre de Dates
  dateFilterSelect: {
    title: 'Filtre par Date de Modification',
    icon: '📅',
    category: 'MODE DÉMO • TEMPOREL',
    description: 'Restreint les résultats selon l\'ancienneté des fichiers.',
    details: [
      'Modes : Avant une date, Après une date, ou Entre deux dates.',
      'Idéal pour retrouver un document récent ou analyser l\'archivage.',
    ],
    actionText: 'Changer la plage de dates',
  } as ExplanationData,

  // Cible de recherche (Chemin vs Nom)
  searchField: (field: string): ExplanationData => ({
    title: `Portée de recherche : ${field === 'nom_fichier' ? 'Nom du fichier' : 'Chemin complet'}`,
    icon: '🎯',
    category: 'MODE DÉMO • RECHERCHE',
    description: `Vous avez basculé la portée sur : "${field === 'nom_fichier' ? 'Nom' : 'Chemin'}". Cela permet d'affiner précisément où PostgreSQL doit chercher les termes.`,
    details: [
      'Chemin complet : Recherche dans toute l\'arborescence de dossiers (ex: D:\\Archives\\juillard.pdf).',
      'Nom du fichier : Recherche uniquement sur le nom propre (ex: juillard.pdf), ignorant les sous-dossiers.',
    ],
    actionText: `Passer en recherche par ${field === 'nom_fichier' ? 'Nom' : 'Chemin'}`,
  }),

  // Mode de recherche (Intelligent vs Strict)
  searchMode: (mode: string): ExplanationData => ({
    title: `Mode d'analyse : ${mode === 'intelligent' ? 'Intelligent (Flou & Accents)' : 'Strict (Exact)'}`,
    icon: '💡',
    category: 'MODE DÉMO • ALGORITHME',
    description: `Vous basculez le moteur sur le mode "${mode === 'intelligent' ? 'Intelligent' : 'Strict'}".`,
    details: [
      'Intelligent : Tolère les fautes d\'orthographe, ignore les accents et majuscules, et cherche les mots dans n\'importe quel ordre.',
      'Strict : Exige une correspondance exacte de la chaîne de caractères telle qu me saisie.',
    ],
    actionText: `Activer le mode ${mode === 'intelligent' ? 'Intelligent' : 'Strict'}`,
  }),

  // Panneau de Filtres Avancés
  filtersToggle: (willOpen: boolean): ExplanationData => ({
    title: willOpen ? 'Ouverture des Filtres Avancés' : 'Fermeture des Filtres Avancés',
    icon: '⚙️',
    category: 'MODE DÉMO • FILTRAGE',
    description: 'Le panneau de filtres combinatoires permet de croiser plusieurs critères métier sur des millions de fichiers indexés.',
    details: [
      'Filtrage multi-critères : EDS (serveurs NAS), Cellules émettrices, Extensions (.pdf, .docx...).',
      'Filtres temporels : Filtrer par date de modification (avant, après, entre deux dates).',
      'Étiquettes métier : Filtrer par tags enregistrés.',
    ],
    actionText: willOpen ? 'Afficher les filtres' : 'Masquer les filtres',
  }),

  // Réinitialisation du Formulaire
  resetForm: {
    title: 'Réinitialisation Générale',
    icon: '🔄',
    category: 'MODE DÉMO • ACTION',
    description: 'Efface tous les mots-clés et filtres actifs pour réinitialiser la vue du catalogue à son état par défaut.',
    details: [
      'Vide la barre de recherche.',
      'Désactive les filtres d\'EDS, de cellules, d\'extensions et de dates.',
      'Replie le tiroir des filtres avancés.',
    ],
    actionText: 'Réinitialiser la recherche',
  } as ExplanationData,

  // Fichiers Vides Seulement
  emptyFilesOnly: (active: boolean): ExplanationData => ({
    title: active ? 'Désactivation du filtre Fichiers Vides' : 'Affichage des Fichiers Vides (0 octets)',
    icon: '⚠️',
    category: 'MODE DÉMO • NETTOYAGE',
    description: 'Isole spécifiquement les fichiers pesant exactement 0 octet sur les disques NAS.',
    details: [
      'Détecte les échecs de transfert de fichiers ou fichiers fantômes.',
      'Facilite le nettoyage rapide des espaces de stockage.',
    ],
    actionText: active ? 'Afficher tous les fichiers' : 'Isoler les fichiers vides',
  }),

  // Exportation CSV
  exportCSV: (totalCount: number): ExplanationData => ({
    title: `Exportation de ${totalCount.toLocaleString('fr-FR')} résultat(s) en CSV`,
    icon: '📥',
    category: 'MODE DÉMO • EXPORTATION',
    description: 'Génère un fichier CSV téléchargeable contenant la totalité des métadonnées de la recherche courante.',
    details: [
      'Export complet : Noms, chemins d\'accès, extensions, tailles, dates et tags.',
      'Compatible avec Microsoft Excel, LibreOffice et outils d\'analyse Big Data.',
    ],
    actionText: 'Télécharger le fichier CSV',
  }),

  // Tri par colonne
  sortBy: (sortField: string): ExplanationData => ({
    title: `Tri des résultats par : ${sortField}`,
    icon: '📊',
    category: 'MODE DÉMO • ORGANISATION',
    description: `Reclasse l'ensemble des résultats de la recherche selon le critère "${sortField}".`,
    details: [
      'Date : Classement par dernière date de modification.',
      'Taille : Classement par volume occupé en octets.',
      'Nom : Classement alphabétique sur le nom du fichier.',
    ],
    actionText: 'Appliquer ce tri',
  }),

  // Sens du tri
  sortOrder: (order: 'asc' | 'desc'): ExplanationData => ({
    title: `Ordre de tri : ${order === 'desc' ? 'Descendant (↓)' : 'Ascendant (↑)'}`,
    icon: '↕️',
    category: 'MODE DÉMO • ORGANISATION',
    description: `Bascule l'orientation du tri en mode ${order === 'desc' ? 'décroissant' : 'croissant'}.`,
    details: [
      'Descendant (↓) : Du plus récent/grand au plus ancien/petit.',
      'Ascendant (↑) : Du plus ancien/petit au plus récent/grand.',
    ],
    actionText: `Trier en ordre ${order === 'desc' ? 'descendant' : 'ascendant'}`,
  }),

  // Navigation Onglets
  navTab: (tabId: string, label: string): ExplanationData => {
    const titles: Record<string, string> = {
      overview: 'Menu Principal de la Démo',
      search: 'Onglet Recherche Avancée',
      tree: 'Onglet Explorateur d\'Arborescence',
      heaviest: 'Onglet Fichiers Volumineux',
      cleanup: 'Onglet Nettoyage & Doublons',
      evolution: 'Onglet Évolution & Volumétrie',
      config: 'Onglet Configuration & Scan NAS',
    };
    const desc: Record<string, string> = {
      overview: 'Retourne à l\'écran d\'accueil synthétique d\'auto-découverte du catalogue.',
      search: 'Permet de lancer des requêtes multi-critères instantanées sur PostgreSQL.',
      tree: 'Affiche la structure hiérarchique complète des répertoires NAS.',
      heaviest: 'Analyse les fichiers les plus lourds pour optimiser l\'espace disque.',
      cleanup: 'Identifie les fichiers obsolètes ou dupliqués.',
      evolution: 'Présente des graphiques sur la croissance des données dans le temps.',
      config: 'Permet de configurer l\'indexeur de fichiers et les dossiers surveillés.',
    };
    const specificDetails: Record<string, string[]> = {
      config: [
        'Téléchargement de l\'outil local : Application C# .EXE avec configuration pré-remplie.',
        'Les listes EDS et Cellules sont automatiquement injectées dans le fichier scan_nas.cfg.',
        'Import par glisser-déposer de fichiers de résultats JSON générés hors-ligne.',
      ],
    };
    return {
      title: titles[tabId] || `Navigation : ${label}`,
      icon: '🚀',
      category: 'MODE DÉMO • NAVIGATION',
      description: desc[tabId] || `Bascule l'affichage vers la section ${label}.`,
      details: specificDetails[tabId] || [
        'Navigation fluide sans rechargement de page.',
        'Conserve vos filtres en arrière-plan pendant la navigation.',
      ],
      actionText: `Ouvrir ${label}`,
    };
  },

  // Boutons de la fonctionnalité Scan
  scanDownloadExe: {
    title: 'Téléchargement du Client Natif C# (.EXE)',
    icon: '⚡',
    category: 'MODE DÉMO • OUTIL LOCAL',
    description: 'Télécharge le pack ZIP contenant scan_nas.exe et son fichier de configuration pré-rempli depuis la base de données.',
    details: [
      'Sélection du dossier à scanner via la fenêtre native Windows.',
      'Les listes EDS et Cellules sont pré-configurées dans scan_nas.cfg — aucune saisie manuelle requise.',
      'Génère automatiquement un fichier scan_resultat_XXXXXXXX.json dans le même dossier que le .exe.',
      'Aucune connexion réseau nécessaire — compatible réseau entreprise avec reverse proxy.',
    ],
    actionText: 'Télécharger le pack .zip',
  } as ExplanationData,

  scanDepositJson: {
    title: 'Import par Glisser-Déposer de Scan JSON',
    icon: '📥',
    category: 'MODE DÉMO • IMPORT HORS-LIGNE',
    description: 'Zone de dépôt pour importer un fichier scan_resultat.json généré hors-ligne.',
    details: [
      'Import de résultats d\'indexation réalisés sur des sous-réseaux isolés.',
      'Traitement et ingestion par paquets de 2 000 fichiers directement dans PostgreSQL.',
      'Suivi de la console de progression en direct.',
    ],
    actionText: 'Glisser-déposer',
  } as ExplanationData,

  // Masquer l'en-tête
  toggleHeader: (visible: boolean): ExplanationData => ({
    title: visible ? 'Masquage du Bandeau Supérieur' : 'Affichage du Bandeau Supérieur',
    icon: visible ? '🔼' : '🔽',
    category: 'MODE DÉMO • INTERFACE',
    description: visible
      ? 'Réduit l\'en-tête de l\'application pour libérer un maximum d\'espace vertical pour la table.'
      : 'Rétablit l\'en-tête contenant les logos institutionnels et boutons globaux.',
    details: [
      'Gagnez de la hauteur d\'affichage pour l\'inspection des fichiers.',
      'Votre préférence est enregistrée localement dans le navigateur.',
    ],
    actionText: visible ? 'Masquer l\'en-tête' : 'Afficher l\'en-tête',
  }),

  // Mode Démo toggle
  toggleDemoMode: (currentMode: boolean): ExplanationData => ({
    title: currentMode ? 'Quitter le Mode Démo' : 'Activer le Mode Démo Interactif',
    icon: '👁️',
    category: 'MODE DÉMO • SYSTÈME',
    description: currentMode
      ? 'Désactive les popups d\'explication et revient au mode standard connecté à la base PostgreSQL.'
      : 'Active l\'interface rouge guidée avec explication centrale sur chaque action.',
    details: [
      'Mode Démo : Idéal pour les présentations et la découverte de l\'outil.',
      'Mode Standard : Action directe immédiate sur la base de données.',
    ],
    actionText: currentMode ? 'Quitter la démo' : 'Basculer en Mode Démo',
  }),

  // Paramètres Modal
  openSettings: {
    title: 'Gestionnaire des Fonctionnalités du Catalogue',
    icon: '⚙️',
    category: 'MODE DÉMO • PARAMÈTRES',
    description: 'Ouvre le panneau de personnalisation des onglets et modules visibles dans le catalogue.',
    details: [
      'Activez ou masquez des onglets métier (Recherche, Arborescence, Volumétrie, Scan...).',
      'Personnalisez le catalogue pour les besoins spécifiques de chaque service.',
    ],
    actionText: 'Ouvrir les Paramètres',
  } as ExplanationData,

  // Mode Clothilde
  toggleClothilde: (currentTheme: string): ExplanationData => ({
    title: currentTheme === 'clothilde' ? 'Passer en Thème Standard' : 'Activer le Mode Clothilde',
    icon: '🌸',
    category: 'MODE DÉMO • THÈME',
    description: 'Change l\'ambiance visuelle du catalogue avec un thème personnalisé et une animation interactive.',
    details: [
      'Effet de particule floral et palette de couleurs personnalisée.',
      'Démonstration des capacités de thématisation du catalogue.',
    ],
    actionText: currentTheme === 'clothilde' ? 'Activer Thème Standard' : 'Activer Mode Clothilde',
  }),

  // Localiser dans l'arborescence (depuis la table)
  locateInTree: (fileName: string): ExplanationData => ({
    title: `Localiser "${fileName}" dans l'arborescence`,
    icon: '📁',
    category: 'MODE DÉMO • ARBORESCENCE',
    description: `Bascule directement vers l'onglet Arborescence et ouvre le dossier contenant le fichier "${fileName}".`,
    details: [
      'Déplie automatiquement les sous-dossiers parents.',
      'Surligne le fichier cible dans sa structure de répertoire exacte.',
    ],
    actionText: 'Localiser dans l\'arborescence',
  }),

  // Ajouter / Éditer Tags
  editFileTags: (fileName: string): ExplanationData => ({
    title: `Gestion des Tags pour "${fileName}"`,
    icon: '🏷️',
    category: 'MODE DÉMO • MÉTADONNÉES',
    description: 'Permet d\'associer des étiquettes métier (ex: "à archiver", "important", "projet") à ce fichier.',
    details: [
      'Mise à jour instantanée des tags dans la base de données PostgreSQL.',
      'Les tags permettent des recherches croisées ultra-rapides.',
    ],
    actionText: 'Gérer les tags du fichier',
  }),

  // Clic sur ligne de résultat / aperçu
  openFileDetails: (fileName: string): ExplanationData => ({
    title: `Inspection du Fichier "${fileName}"`,
    icon: '🔍',
    category: 'MODE DÉMO • APERÇU',
    description: 'Ouvre le panneau latéral d\'inspection détaillée avec aperçu du contenu et métadonnées complètes.',
    details: [
      'Informations complètes : Taille exacte, dates de création/modification, propriétaire, permissions.',
      'Aperçu visuel pour les images et documents supportés.',
    ],
    actionText: 'Consulter la fiche fichier',
  }),
};
