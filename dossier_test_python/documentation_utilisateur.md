# Documentation Utilisateur — Application Catalogue NAS & Métadonnées

Bienvenue dans le guide utilisateur de l'application **Catalogue NAS & Métadonnées**. Ce document décrit de manière exhaustive l'utilisation des **6 fonctionnalités et modules majeurs** de l'interface graphique : **La Recherche**, **L'Arborescence**, **Le Scan (Indexation Web)**, **Le Portail de Connexion BDD**, **Les Boutons de Navigation de l'En-tête** et **L'Outil de Scan Client (`scan_nas.exe` & `scan_nas.bat`)**.

---

## 💡 Grandes Étapes du Raisonnement & Méthodologie

Pour élaborer cette documentation utilisateur complète, exhaustive et fidèle, nous avons suivi une démarche en **4 grandes étapes** :

1. **Analyse visuelle des captures d'écran transmises** : 
   - Identification des 6 vues et modules : la recherche multi-critères, l'explorateur d'arborescence réseau bidirectionnel, l'outil de scan local et import JSON web, la page de connexion BDD avec override d'URL, le bandeau d'en-tête utilisateur, et l'exécutable client C# natif de scan local.
   - Recensement exhaustif de chaque élément interactif : boutons, toggles, champs de texte, masquage de mot de passe, menus déroulants, fenêtres modales, fenêtres Pop-up de sélection de dossier, cartes d'outils et consoles de logs.

2. **Inspection approfondie du code source (Frontend & Backend & Client C#/Batch)** :
   - Analyse des composants React (`GatePage.tsx`, `Layout.tsx`, `SettingsModal.tsx`, `SearchBar.tsx`, `Filters.tsx`, `ResultsTable.tsx`, `FileRow.tsx`, `TreeTab.tsx`, `ConfigTab.tsx`) ainsi que des scripts d'indexation clients (`tools/scan_nas.exe` et `tools/scan_nas.bat`).
   - Vérification de la persistance en mémoire locale (`localStorage`), du découpage par paquets de 2 000 fichiers pour la transmission HTTP, et du calcul d'empreintes MD5.

3. **Cartographie fonctionnelle bouton par bouton** :
   - Structuration de la documentation sous forme de fiches explicatives par section.
   - Détail explicatif du rôle de chaque bouton, champ de saisie et bouton radio.

4. **Validation et Rédaction Didactique** :
   - Structuration claire accessible aux utilisateurs métier et aux administrateurs réseau.

---

## 🔍 1. Fonctionnalité "Recherche" (Onglet Recherche)

L'onglet **Recherche** est le moteur d'exploration principal du catalogue. Il permet de retrouver instantanément n'importe quel document référencé par les différentes cellules de l'organisation à partir de ses métadonnées.

---

### 1.1 Barre de Recherche Supérieure (`SearchBar`)

#### 1. Champ de Saisie `Rechercher...`
* **Rôle** : Zone de texte permettant de saisir un ou plusieurs mots-clés.
* **Comportement** :
  * La recherche se déclenche automatiquement à partir de **2 caractères** (temporisation de 500 ms).
  * L'appui sur la touche **Entrée** lance immédiatement la requête.
  * Si 1 seul caractère est saisi, un petit indicateur d'avertissement `min. 2 car.` apparaît.

#### 2. Toggle du Champ de Recherche : `Chemin` vs `Nom`
* **Chemin** *(actif par défaut)* : Recherche les mots-clés dans l'emplacement complet du fichier (dossier conteneur + nom de fichier).
* **Nom** : Limite la recherche strictly au nom du fichier (ex: `Rapport.pdf`).

#### 3. Toggle du Mode de Recherche : `Intelligent` vs `Strict`
* **Intelligent** *(actif par défaut)* : Mode de recherche tolérant et multi-mots (ignore la casse et les accents, ex: `apero` trouvera `apéro`).
* **Strict** : Recherche exacte sur la chaîne de caractères brute.

#### 4. Bouton `Filtres` (avec icône d'entonnoir)
* **Rôle** : Déplie ou replie le panneau de filtres avancés. Un badge bleu indique le nombre de filtres actifs.

#### 5. Bouton `Réinitialiser`
* **Rôle** : Efface d'un seul clic l'ensemble des critères de recherche et remet l'interface à zéro.

---

### 1.2 Panneau des Filtres Avancés (Dépliable)

* **Dropdown `Tous les EDS` / `EDS (N)`** : Filtre par serveur NAS / Entité de Domaine de Sécurité.
* **Dropdown `Toutes les Cellules` / `Cellules (N)`** : Filtre par cellule d'origine ayant indexé le fichier.
* **Dropdown `Toutes extensions` / `Extensions (N)`** : Liste dynamique des extensions (`.pdf`, `.xlsx`, `.docx`...).
* **Dropdown `Tags`** : Filtre par étiquettes attribuées (`à archiver`, `important`, `projet terminé`...).
* **Sélecteur `Filtrer par date`** : *Toutes les dates*, *Entre deux dates...*, *Après le...*, *Avant le...*.

---

### 1.3 Barres de Filtres Rapides & d'Exportation (`Filters`)

* **Bouton `Fichiers vides seulement`** (icône ambre) : Filtre uniquement les fichiers de **0 octet**.
* **Bouton `Exporter CSV (N)`** (icône téléchargement) : Exporte les résultats sous format `.csv`.
* **Menu `Trier par`** : `Date` *(défaut)*, `Taille`, `Nom`.
* **Menu `Sens du tri`** : `↓ Desc` *(décroissant)* ou `↑ Asc` *(croissant)*.

---

### 1.4 Tableau de Résultats & Actions sur les Fichiers (`ResultsTable` / `FileRow`)

* **Nom** : Icône colorée par type + surlignage des mots-clés. Clic pour développer.
* **Chemin** : Clic pour développer + **Bouton Copier (icône feuille)** + **Bouton Localiser (icône dossier jaune)** qui bascule vers l'Arborescence.
* **Ext. / Taille / Modifié / Source** : Badges techniques et dates de modification.
* **Tags** : Étiquettes colorées + **Bouton `＋`** pour ouvrir la modale d'édition des tags.
* **Pagination** : Boutons numérotés (`1`, `2`...) et flèches (`‹`, `›`).

---

## 🌳 2. Fonctionnalité "Arborescence" (Onglet Arborescence)

L'onglet **Arborescence** offre une vue hiérarchique de type "Explorateur de fichiers" pour parcourir les dossiers réseau.

---

### 2.1 Panneau Gauche : Explorateur EDS (`TreeExplorer`)

* **Sélecteur `EDS : [ NAS-LOCAL ▼ ]`** : Choisit le serveur NAS à explorer.
* **Arbre des Dossiers (`>`)** : Clic pour déplier/replier les sous-dossiers.
* **Badges de Cellules & Propriétaires** : Identifie la cellule responsable et le propriétaire du fichier.
* **Localisation Automatique** : Surbrillance et défilement automatique lorsqu'un fichier est ciblé depuis la recherche.

---

### 2.2 Panneau Droit : Détails de l'Élément Sélectionné

* **Bouton Fermer (`X`)** : Masque le volet droit pour agrandir l'arborescence.
* **Chemin complet** : Zone cliquable avec icône pour copier le chemin absolu.
* **Métadonnées** : Cartes *Taille* et *Date de Modification*.
* **Gestion des Tags** : Bouton **`+ Gérer les tags`** pour mise à jour immédiate.

---

## ⚙️ 3. Fonctionnalité "Scan" (Onglet Scan / Configuration Web)

L'onglet **Scan** est le centre de publication des métadonnées sur l'interface Web.

---

### 3.1 Étape 1 : Télécharger l'Outil de Scan Local

* **Carte 1 : Application C# (`.EXE`) — *RECOMMANDÉ*** : Bouton **`Télécharger .exe`**. Exécutable autonome natif.
* **Carte 2 : Script Windows Batch (`.BAT`) — *ALTERNATIVE SANS DROITS*** : Bouton **`Télécharger .bat`**. Script PowerShell autonome sans droits d'administrateur.

---

### 3.2 Étape 2 (Optionnelle) : Importer un Fichier de Scan JSON

* **Zone de Glisser-Déposer** : Clic ou dépôt du fichier `.json` généré hors-ligne.
* **Console d'ingestion SQL** : Découpage par paquets de **2 000 fichiers** et suivi en direct avec message de confirmation vert `✓ Import réussi !`.

---

## 🔐 4. Page de Connexion & Portail BDD (`GatePage`)

Le **Portail de Connexion** est la première page affichée au lancement de l'application ou en cas de perte de liaison avec le serveur PostgreSQL.

---

### 4.1 En-tête Institutionnel & Titre
* **Logotypes** : Affiche les logos officiels (Marine Nationale, CENTEX PATSIMAR).
* **Titre** : `Catalogue de Fichiers`.
* **Bouton `Mode Démo`** *(Haut à droite)* : Bascule directement dans le mode démonstration hors-ligne.

---

### 4.2 Carte Principale d'État & d'Avertissement

* **Bandeau d'état** (bouclier jaune `ShieldAlert`) : Affiche `Serveur de Base de Données Inaccessible`.
* **Bouton principal `RÉESSAYER LA CONNEXION`** (icône BDD) : Relance la vérification de la base PostgreSQL.
* **Bouton secondaire `Mode Démonstration`** (icône œil) : Accède à l'application avec des données d'exemple.

---

### 4.3 Configuration Réseau Avancée (Panneau Administration)

* **Bouton Dépliable `▼ Configuration réseau avancée (Administration)`** : Déplie le formulaire d'URL PostgreSQL.
* **Champ `CHAÎNE DE CONNEXION POSTGRESQL (OVERRIDE ADMIN)`** : Champ monospacé sécurisé pour modifier l'adresse de la BDD.
* **Bouton Œil / Œil barré** : Masque ou affiche la chaîne de connexion en clair.
* **Bouton `Tester cette URL BDD`** : Valide et enregistre la nouvelle adresse.
* **Encadrés de Feedback** : Message vert de succès avec redirection ou encadré rouge détaillant l'erreur réseau/SQL.

---

## 🔘 5. Barre d'En-tête Supérieure & les 4 Boutons du Haut (`Header` / `Layout`)

---

### 5.1 Bouton 1 : `Mode Démo` (icône d'œil)
* Permet d'activer ou de quitter le **Mode Démonstration** (Thème Rouge avec badge pulsant et bulles didactiques).

---

### 5.2 Bouton 2 : `Paramètres` (icône d'engrenage)
* Ouvre la modale **Paramètres du Catalogue** pour afficher ou masquer individuellement chaque onglet de navigation (*Recherche*, *Arborescence*, *Scan*, *Fichiers lourds*, *Nettoyage*, *Évolution*).

---

### 5.3 Bouton 3 : `Mode Clothilde` (icône d'étincelles ✨)
* Permet de basculer entre le *Mode Standard* et le *Mode Clothilde* (thème pastel rose avec animation d'explosion florale 🌸).

---

### 5.4 Bouton 4 : `Déconnexion`
* Ferme la session utilisateur active et redirige vers la page de connexion BDD.

---

### 5.5 Bouton Rétractable `Masquer l'en-tête` / `Afficher l'en-tête`
* Replie l'en-tête supérieur pour maximiser l'espace d'affichage vertical.

---

## ⚡ 6. L'Application de Scan Client (`scan_nas.exe` & `scan_nas.bat`)

L'outil **Scanner Local** est l'application cliente autonome exécutée directement sur le poste d'un administrateur ou sur un serveur NAS pour référencer un répertoire local ou un partage réseau.

---

### 6.1 Description Détaillée de l'Interface Graphique (`scan_nas.exe`)

L'application cliente autonome C# `.exe` présente une interface graphique moderne et structurée :

#### 1. En-tête de l'Application
* **Titre de la fenêtre** : `Catalogue NAS - Scanner Local`.
* **Bandeau supérieur** : `⚡ CATALOGUE DE FICHIERS`.

#### 2. Carte 1 : `PARAMÈTRES DU SCANNER`
* **Champ `URL du Serveur`** : Zone de texte permettant de saisir l'adresse IP ou l'URL du serveur API Tornado (ex: `http://localhost:5000` ou `http://192.168.1.50:5000`).
* **Champ `Espace de`** : Code identifiant l'Entité de Domaine de Sécurité / EDS (ex: `NAS-LOCAL` ou `PIQUE-NIQUE`).
* **Champ `Cellule`** : Libellé de la cellule opérationnelle propriétaire du répertoire (ex: `Cellule-Principale` ou `Cellule-Aéro`).

#### 3. Carte 2 : `PÉRIMÈTRE TRANSMISSION`
* **Champ `Dossier à` [scanner]** : Champ de saisie contenant le chemin absolu du dossier à explorer.
* **Bouton `Parcourir...` (Bouton bleu)** :
  * Clic pour ouvrir la fenêtre Pop-up native Windows "Parcourir les dossiers".
  * Permet de sélectionner visuellement n'importe quel dossier local ou disque réseau sans taper le chemin.
* **Options Radio de Mode de Transmission** :
  * **● `Envoi direct au Serveur API`** *(sélectionné par défaut)* : Transmet automatiquement les métadonnées au serveur PostgreSQL via l'API REST `/api/scan/external-upload`.
  * **◯ `Exporter un fichier JSON`** : Mode déconnecté / hors-ligne. Génère un fichier `scan_resultat_YYYYMMDD_HHMMSS.json` sur le Bureau pour un import manuel ultérieur dans l'interface Web.

#### 4. Bouton Principal d'Action : `🚀 DÉMARRER LE SCAN DU REPERTOIRE`
* **Rôle** : Bouton principal qui déclenche la lecture récursive du répertoire sélectionné.
* **Fonctionnement** :
  * Explore récursivement tous les sous-dossiers et fichiers.
  * Calcule l'empreinte unique MD5 de chaque document pour empêcher la duplication.
  * Transmet les données par paquets de **2 000 fichiers** au serveur API ou enregistre le JSON sur le Bureau.

#### 5. Console de Journalisation Temps Réel (Terminal Noir)
* **Zone de logs** : Console noire en bas de l'application affichant les messages d'état horodatés.
* **Exemple d'affichage** : `[09:49:30] Catalogue NAS Client initialisé avec succès.` puis l'avancement du nombre de fichiers analysés.

---

### 6.2 Mention Rapide du Script Windows Batch (`scan_nas.bat`)

Pour les environnements informatiques d'entreprise avec des politiques de sécurité GPO très strictes interdisant l'exécution de fichiers `.exe` tiers, le script `scan_nas.bat` offre une **alternative identique sans installation** :

* **Fonctionnalités équivalentes** :
  * Exécute un script PowerShell natif encapsulé.
  * Ouvre la même fenêtre Pop-up native Windows d'exploration de dossier pour sélectionner le répertoire.
  * Propose la sélection dynamique des EDS/Cellules et le même double choix de transmission : **Envoi direct au Serveur API** ou **Génération du fichier JSON d'export sur le Bureau**.
* **Avantage** : Fonctionne sans droits d'administrateur et ne nécessite aucun binaire compilé.

---

## 📊 Tableau Synthétique Global des Boutons & Actions

| Section | Bouton / Élément | Action / Effet Fonctionnel |
| :--- | :--- | :--- |
| **Scanner Local (.exe)**| `Parcourir...` | Ouvre la fenêtre Pop-up Windows pour choisir le dossier à scanner. |
| **Scanner Local (.exe)**| `● Envoi direct...` | Sélectionne la transmission directe via réseau à l'API du serveur. |
| **Scanner Local (.exe)**| `◯ Exporter JSON` | Sélectionne la génération du fichier `.json` d'export sur le Bureau. |
| **Scanner Local (.exe)**| `🚀 DÉMARRER LE SCAN` | Lance l'exploration récursive et la transmission des métadonnées. |
| **Scanner Local (.bat)**| `Script .bat` | Alternative script PowerShell sans droits admin pour scanner. |
| **Connexion** | `RÉESSAYER LA CONNEXION` | Relance le test de connexion PostgreSQL vers le serveur. |
| **Connexion** | `Mode Démonstration` | Bascule immédiatement en mode démo hors-ligne. |
| **Connexion** | `▼ Configuration réseau...` | Déplie le formulaire d'URL PostgreSQL pour l'administration. |
| **Connexion** | `Icône Œil (mot de passe)` | Masque ou affiche l'URL PostgreSQL en clair. |
| **Connexion** | `Tester cette URL BDD` | Valide et enregistre la nouvelle adresse de base de données. |
| **En-tête** | `Mode Démo` (Rouge/Œil) | Active/Désactive le thème démo avec explications didactiques. |
| **En-tête** | `Paramètres` (Engrenage) | Ouvre la modale de sélection et masquage des onglets de navigation. |
| **En-tête** | `Mode Clothilde` (Etincelles) | Bascule vers le thème rose personnalisé avec animation florale. |
| **En-tête** | `Déconnexion` | Ferme la session et redirige vers la page de connexion BDD. |
| **En-tête** | `Masquer l'en-tête` | Replie le bandeau supérieur pour agrandir la zone de travail. |
| **Recherche** | `Saisie texte` | Recherche multi-mots après 2 caractères ou sur Touche Entrée. |
| **Recherche** | `Chemin` / `Nom` | Cible la recherche sur le chemin complet ou le nom seul. |
| **Recherche** | `Intelligent` / `Strict` | Recherche tolérante aux accents/mots multiples vs chaîne exacte. |
| **Recherche** | `Filtres` | Ouvre/ferme le volet des filtres EDS, Cellules, Extensions, Dates. |
| **Recherche** | `Réinitialiser` | Remet tous les critères et filtres à zéro. |
| **Recherche** | `Fichiers vides seulement` | Filtre les fichiers corrompus ou vides de 0 octet. |
| **Recherche** | `Exporter CSV` | Génère et télécharge le fichier CSV des résultats. |
| **Recherche** | `Copier chemin` | Copie le chemin complet d'un fichier dans le presse-papier. |
| **Recherche** | `Localiser (Dossier)` | Ouvre l'Arborescence et sélectionne le fichier en surbrillance. |
| **Recherche** | `＋ (Tags)` | Ouvre la fenêtre d'édition des étiquettes du fichier. |
| **Arborescence**| `EDS : Dropdown` | Sélectionne le serveur NAS à explorer. |
| **Arborescence**| `Chevron >` | Déplie ou replie un sous-dossier dans l'arbre. |
| **Arborescence**| `Bouton X (Détails)` | Masque le volet de détails latéral. |
| **Arborescence**| `+ Gérer les tags` | Édite les tags du fichier sélectionné dans l'arborescence. |
| **Scan Web** | `Télécharger .exe` | Télécharge le scanner autonome C# (.exe). |
| **Scan Web** | `Télécharger .bat` | Télécharge le script batch PowerShell sans droits admin (.bat). |
| **Scan Web** | `Zone Glisser-Déposer` | Importe un fichier `.json` généré hors-ligne pour ingestion BDD. |

---

## 📞 Support & Information Complémentaire

Pour toute demande relative aux permissions réseau, à la configuration de la base PostgreSQL ou aux évolutions applicatives :

* **Entité Référente** : CENTEX PATSIMAR / Lab Data
* **Référent Fonctionnel** : Clothilde Raye
