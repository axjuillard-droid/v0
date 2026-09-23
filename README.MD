# Documentation Technique et Fonctionnelle — Application Catalogue NAS & Métadonnées

> [!NOTE]
> **Point de Contact & Support** : CENTEX PATSIMAR / Lab Data  
> **Contact référent** : Clothilde Raye

---

## 1. Introduction & Contexte Métier

### 1.1 Contexte des Bases Silotées
Au sein de notre organisation, différentes cellules opérationnelles et techniques travaillent de manière autonome. Historiquement, cette organisation en cellules a entraîné un **silo de l'information** : chaque cellule conserve l'ensemble de ses documents et fichiers sur ses propres espaces de stockage (serveurs NAS, disques réseau local), sans visibilité transversale sur l'existence des données possédées par les autres cellules.

Ce fonctionnement en silos engendre plusieurs inconvénients :
- Duplication inutile de travaux et de documents d'une cellule à l'autre.
- Difficulté à identifier quelle cellule détient la compétence ou la donnée pertinente.
- Perte de temps considérable lors de la recherche de références techniques ou opérationnelles.

### 1.2 Objectif de l'Application
L'application **Catalogue NAS** a été conçue pour briser ces silos d'information tout en respectant l'autonomie et la sécurité de chaque cellule.

Elle permet à chaque utilisateur de se connecter via l'interface à une **base de données centralisée en réseau (PostgreSQL)** afin de :
1. **Publier / Alimenter** : L'indexation s'effectue via un flux en 2 étapes adapté aux réseaux d'entreprise avec reverse proxy :
   - **Étape 1 : Télécharger l'Outil de Scan Local (`scan_nas_pack.zip`)** : Télécharger le pack ZIP depuis l'onglet *Configuration*. Ce pack contient `scan_nas.exe` accompagné de son fichier `scan_nas.cfg` pré-rempli depuis la base de données avec la liste des EDS et des Cellules enregistrées. L'outil s'exécute localement sans aucune connexion réseau requise et génère un fichier `scan_resultat_YYYYMMDD_HHMMSS.json` (UTF-8 sans BOM) dans le dossier de l'exécutable.
   - **Étape 2 : Importer le Fichier de Scan JSON** : Glisser-déposer le fichier `.json` généré directement dans la zone d'import de l'onglet *Configuration* de l'interface Web — transmission sécurisée par paquets avec suivi de progression en direct vers la base PostgreSQL.

![Interface Web — Onglet Scan (Étape 1 & 2)](scan.png)

2. **Consulter / Rechercher** : Rechercher rapidement parmi l'ensemble des documents référencés par toutes les cellules connectées à la base.

### 1.3 Nature des Données Partagées
> [!IMPORTANT]
> **Sécurité & Légèreté** : **Aucun contenu de document n'est transféré ni stocké dans la base réseau.**

Seules les **métadonnées** techniques et descriptives sont collectées et partagées :
- Nom du fichier et extension
- Chemin d'accès complet et dossier parent matérialisé (`dossier_parent`)
- Taille du fichier (en octets et format lisible Ko/Mo/Go)
- Dates (modification, création, indexation)
- Entité de Domaine de Sécurité (EDS / `nas`) et Cellule d'origine (`label` / `nas_origine`)
- Étiquettes (tags) et indicateur de fichier vide (`est_vide`)
- Outil d'origine de l'indexation (`outil_source` : `exe`, `json_import`, `externe`)

Ce mécanisme garantit que la donnée brute reste confinée dans son espace d'origine, tout en offrant une **cartographie dynamique et inter-cellules du patrimoine documentaire**.

---

## 2. Composition Exacte des Tables de la Base de Données

La base de données PostgreSQL du Catalogue NAS repose sur **3 tables optimisées** :

### 📊 Table 1 : `files` (Fichiers & Métadonnées Indexés)
*C'est la table principale qui contient l'ensemble du catalogue de métadonnées.*

| Colonne | Type SQL | Description & Rôle |
| :--- | :--- | :--- |
| **`id`** | `VARCHAR(32)` | **Clé Primaire** — Empreinte MD5 unique basée sur la signature métadonnée (`MD5(nom_fichier.lower()\|taille\|date_modification_timestamp)`). Empêche les doublons indépendamment du dossier glissé. |
| **`nom_fichier`** | `VARCHAR(255)` | Nom du fichier (ex : `Rapport_2026.pdf`). |
| **`chemin_complet`** | `TEXT` | Chemin d'accès complet sur le réseau (ex : `C:\Projets\Aero\Rapport.pdf`). |
| **`dossier_parent`** | `TEXT` | Chemin du dossier conteneur direct. Permet l'affichage de l'arborescence en O(1) sans recalculs. |
| **`taille`** | `BIGINT` | Taille du fichier en octets. Utilisée pour le tri et la recherche des gros fichiers. |
| **`taille_lisible`** | `VARCHAR(20)` | Taille pré-calculée sous forme lisible (ex : `1.4 Go`, `350 Ko`). |
| **`extension`** | `VARCHAR(50)` | Extension du fichier en minuscules sans point (ex : `pdf`, `xlsx`, `zip`). |
| **`date_modification`** | `TIMESTAMP` | Horodatage de dernière modification du fichier sur le disque. |
| **`date_creation`** | `TIMESTAMP` | Horodatage de création initiale du fichier. |
| **`date_indexation`** | `TIMESTAMP` | Date et heure de première entrée dans la base. |
| **`last_seen`** | `TIMESTAMP` | Horodatage du dernier scan. Utilisé pour purger automatiquement les fichiers supprimés sur le disque. |
| **`nas`** | `VARCHAR(100)` | Code ou nom de l'Entité de Domaine de Sécurité / EDS (ex : `PIQUE-NIQUE`). |
| **`nas_origine`** | `VARCHAR(100)` | Libellé ou nom de la Cellule d'origine (ex : `Cellule-Aéro`). |
| **`est_vide`** | `BOOLEAN` | Indicateur VRAI/FAUX précisant si la taille du fichier est égale à 0 octet. |
| **`tags`** | `TEXT[]` | Tableau d'étiquettes personnalisées attribuées par les utilisateurs (ex : `['Confidentiel', 'ProjetA']`). |
| **`outil_source`** | `VARCHAR(20)` | Identifiant de l'outil ou canal à l'origine du scan (ex : `exe`, `json_import`, `externe`). |

---

### 📂 Table 2 : `nas_sources` (Répertoire des Cellules & Sources)
*Conserve la liste et l'état des espaces réseau / cellules enregistrés.*

| Colonne | Type SQL | Description & Rôle |
| :--- | :--- | :--- |
| **`nas`** | `VARCHAR(100)` | Part de la **Clé Primaire Composite** — Identifiant de l'EDS. |
| **`label`** | `VARCHAR(100)` | Part de la **Clé Primaire Composite** — Nom de la Cellule. |
| **`path`** | `TEXT` | Chemin d'accès racine de la source. |
| **`last_scan`** | `TIMESTAMP` | Date et heure du dernier scan effectué pour cette cellule. |
| **`file_count`** | `INTEGER` | Nombre total de fichiers actuellement référencés pour cette source. |
| **`created_at`** | `TIMESTAMP` | Date d'enregistrement initial de la source. |
| **`updated_at`** | `TIMESTAMP` | Date de dernière mise à jour des statistiques. |

---

### ⚙️ Table 3 : `app_config` (Paramètres Applicatifs)
*Stocke la configuration globale du backend.*

| Colonne | Type SQL | Description & Rôle |
| :--- | :--- | :--- |
| **`key`** | `VARCHAR(100)` | **Clé Primaire** — Nom du paramètre (ex : `scan_threads`, `cleanup_deleted`). |
| **`value`** | `TEXT` | Valeur associée (ex : `'4'`, `'true'`). |
| **`updated_at`** | `TIMESTAMP` | Date de dernière modification de la règle. |

> [!NOTE]
> **Index de Performance** : La base dispose d'index GIN trigramme (via `pg_trgm` + `unaccent`) sur `chemin_complet` et `nom_fichier` pour des recherches insensibles aux accents très rapides, ainsi que d'un index B-Tree composite sur `(nas, nas_origine, last_seen)` pour optimiser les purges et scans incrémentaux.

---

## 3. Architecture & Technologies

### 3.1 Langages de Programmation et Proportions

| Langage / Techno | Proportion estimée | Rôle dans l'application |
| :--- | :--- | :--- |
| **Python** | **~60 - 65%** | **Cœur Backend** : Serveur Web API REST (Tornado), connexion et requêtes SQL PostgreSQL (`psycopg2`), récepteur de métadonnées par lots (`GestionnaireScanExterne`), export CSV, pool de connexions thread-safe, génération du pack ZIP pré-rempli (`GestionnaireTelechargementOutils`). |
| **JavaScript / HTML / CSS** | **~35 - 40%** | **Interface Frontend (SPA)** : Application Web réactive bâtie avec React, TypeScript, TailwindCSS et Vite. Elle gère l'import de fichiers d'export JSON par paquets, le téléchargement de l'outil client, la recherche avancée, l'exploration d'arborescence, les graphiques et les outils de nettoyage. |
| **C# / .NET** | **~3 - 5%** | **Client Natif d'Indexation Local** : Exécutable `tools/scan_nas.exe` (projet `tools/ScanNasClient`) compilé en autonome. Gère le scan local, les menus déroulants alimentés par `scan_nas.cfg` et la génération du JSON d'export sans connexion réseau. |

---

### 3.2 Dépendances & Librairies

#### Dépendances Tierces :
- **`tornado` (>=6.0, <7.0)** : Framework Web serveur asynchrone non-bloquant, conforme SSI (SecNum/Aéronavale), en remplacement de Flask. Il gère l'exposition de l'API REST JSON, le routage SPA, le streaming CSV ainsi que la réception des scans haute capacité (buffer jusqu'à 500 Mo).
- **`psycopg2-binary` (>=2.9.0)** : Adaptateur PostgreSQL haute performance. Il gère la création/migration du schéma SQL (`files`, `nas_sources`, `app_config`), les requêtes d'insertion optimisées par paquets (`execute_values` avec `page_size=2000`), le pool de connexions thread-safe (`ThreadedConnectionPool`), ainsi que les extensions de recherche avancée (`pg_trgm`, `unaccent`).

#### Bibliothèques Standard Python :
- **`concurrent.futures` / `threading`** : Pool de threads SQL (`executor_sql`) délégant les requêtes bloquantes hors de l'Event Loop Tornado, et verrou `_verrou_scans` pour protéger les scans NAS concurrents.
- **`hashlib`** : Génération d'un identifiant MD5 unique (`doc_id`) pour chaque fichier, basé sur sa signature métadonnée (`nom_fichier|taille|timestamp_modification`).
- **`zipfile` / `io`** : Construction en mémoire du pack ZIP `scan_nas_pack.zip` contenant `scan_nas.exe` + `scan_nas.cfg` pré-rempli.
- **`csv`** : Génération des flux d'exportation CSV mémoire en mode streaming.
- **`webbrowser`** : Ouverture automatique du navigateur par défaut sur `http://localhost:5000` au démarrage de l'application.

---

## 4. Guide des Fichiers et Fonctions

### 📄 [app/start.py](file:///c:/Users/axjui/Downloads/projet_stage/v0/dossier_test_python/app/start.py)
*Point d'entrée pour le démarrage du backend et de l'interface.*
- **Variables globales :**
  - `RACINE_PROJET` : Chemin absolu vers la racine de l'application.
- **Fonctions clés :**
  - `ouvrir_navigateur()` : Déclenche l'ouverture du navigateur Web vers `http://localhost:5000` avec un délai d'amorçage de 1,5 s.
  - `principal()` : Détecte l'URL de BD initiale (`.env` ou `DATABASE_URL`), initialise le pool de connexions, vérifie le schéma et lance le serveur Tornado (mono-worker ou multi-workers selon `WORKERS`).

---

### 📄 [db.py](file:///c:/Users/axjui/Downloads/projet_stage/v0/dossier_test_python/db.py)
*Gestionnaire de persistance PostgreSQL, pool de connexions et schéma de la base de données.*
- **Variables globales :**
  - `journal` : Logger dédié (`GESTIONNAIRE_BD`) aux opérations de base de données.
  - `URL_BD_ACTIVE` : Chaîne de connexion PostgreSQL active conservée en mémoire vive.
  - `POOL_BD` : Instance du `ThreadedConnectionPool` psycopg2 (pool thread-safe, 2–20 connexions par défaut).
- **Fonctions clés :**
  - `obtenir_racine_projet()` : Détermine le chemin absolu du dossier racine du projet (prend en compte l'exécution Python standard ou le binaire PyInstaller).
  - `obtenir_url_bd()` : Retourne l'URL active (mémoire > variable d'environnement > fichier `.env`).
  - `definir_url_bd(url)` : Définit l'URL active et réinitialise le pool de connexions.
  - `initialiser_pool_bd(minconn, maxconn)` : Crée ou recrée le `ThreadedConnectionPool` (configurable via `DB_POOL_MIN` / `DB_POOL_MAX`).
  - `meuler_pool()` : Ferme proprement toutes les connexions du pool au shutdown.
  - `obtenir_connexion_bd()` : Retourne une connexion depuis le pool (ou ouvre une connexion directe en fallback).
  - `obtenir_connexion_contexte()` : Context manager Python — obtient et restitue automatiquement une connexion au pool (`with db.obtenir_connexion_contexte() as connexion`).
  - `liberer_connexion_bd(connexion, avec_erreur)` : Restitue proprement une connexion au pool.
  - `reinitialiser_tables_bd(connexion)` : Supprime les tables applicatives (`files`, `nas_sources`, `app_config`, `snapshots`) avec `DROP TABLE ... CASCADE` pour réinitialisation complète.
  - `initialiser_bd(connexion)` : Crée et migre de façon idempotente le schéma complet (`files`, `nas_sources`, `app_config`). **Garantie de compatibilité non-superuser** : commite d'abord les tables de base avant de tenter l'activation des extensions optionnelles (`pg_trgm`, `unaccent`), la fonction SQL helper `immutable_unaccent()` et les index GIN/trigrammes.
  - `obtenir_toutes_sources(connexion)` : Récupère l'inventaire complet des sources NAS déclarées.
  - `inserer_ou_mettre_a_jour_source(connexion, nas, etiquette, chemin)` : Enregistre ou met à jour l'emplacement d'une source NAS dans `nas_sources`.
  - `mettre_a_jour_stats_source(connexion, nas, etiquette, nombre_fichiers)` : Met à jour la date de dernier scan et le compteur de fichiers.
  - `rafraichir_stats_source(connexion, nas, etiquette)` : Recalcule le nombre réel de fichiers depuis `files` et corrige `nas_sources` (purgeant automatiquement les cellules orphelines sans aucun fichier).
  - `supprimer_source(connexion, nas, etiquette)` : Supprime une source NAS et purge tous ses fichiers associés.
  - `obtenir_config_app(connexion, cle, defaut)` / `definir_config_app(connexion, cle, valeur)` : Lecture et écriture de la table de configuration `app_config`.
  - `inserer_ou_mettre_a_jour_fichiers_externe(...)` : Ingestion optimisée par paquets (`execute_values`, `page_size=2000`) des scans JSON et purge réconciliée automatique des fichiers supprimés sur le périmètre au dernier paquet (`is_last_chunk = True`).

---

### 📄 [reset_db.py](file:///c:/Users/axjui/Downloads/projet_stage/v0/dossier_test_python/reset_db.py)
*Script utilitaire autonome pour la réinitialisation de la base de données.*
- Permet de réinitialiser complètement la base de données PostgreSQL en exécutant des requêtes SQL directes (`DROP TABLE IF EXISTS files, nas_sources, app_config CASCADE;`) puis en réinvoquant `initialiser_bd()` pour reconstruire un schéma vierge en une commande : `python reset_db.py`.

---

### 📄 [app/app.py](file:///c:/Users/axjui/Downloads/projet_stage/v0/dossier_test_python/app/app.py)
*Serveur Web Tornado, API REST et contrôleur d'application.*
- **Variables globales :**
  - `executor_sql` : `ThreadPoolExecutor` (16 workers par défaut, configurable via `DB_THREAD_POOL_MAX`) délégant les requêtes SQL bloquantes hors de l'Event Loop Tornado.
  - `journal` : Logger dédié (`BACKEND_TORNADO`).
  - `_verrou_scans` : `threading.Lock()` protégeant l'accès concurrent au dictionnaire des scans actifs.
  - `_scans_par_nas` : Dictionnaire `nas → {status, label, debut, fichiers, seen_ids}` — clé présente = scan en cours sur ce NAS, clé absente = NAS libre.
- **Classes & Fonctions clés :**
  - `GestionnaireAPIBase` : Classe parente fournissant `executer_db()` (exécution SQL asynchrone non-bloquante), `ecrire_json()`, `obtenir_corps_json()` et la gestion d'erreurs centralisée.
  - `GestionnaireStatutBD` / `GestionnaireConnexionBD` : Contrôle et configuration de la connexion PostgreSQL via l'UI (`/api/db/status` et `/api/db/config`).
  - `_appliquer_filtre_recherche(...)` : Helper SQL construisant les clauses `WHERE` dynamiques pour la recherche multi-mots, avec support `unaccent` et fallback `ILIKE` standard.
  - `GestionnaireRecherche` : Moteur de recherche avancé (`/api/search`) — filtrage multi-critères (mots, extension, dates, tags, NAS, source), pagination, tri et gestion d'accents.
  - `GestionnaireStatistiques` / `GestionnaireStatistiquesCache` : APIs d'alimentation des tableaux de bord (`/api/stats` et `/api/stats/cache`).
  - `GestionnaireSources` / `GestionnaireDetailsSources` : Listes et détails des sources NAS et cellules enregistrées (`/api/sources` et `/api/sources/details`).
  - `GestionnaireListeExtensions` : Retourne les extensions présentées en base avec leur nombre de fichiers (`/api/extensions`).
  - `GestionnaireFichiersLourds` : Classement des fichiers les plus volumineux avec filtrage NAS/source (`/api/heavy-files`).
  - `GestionnaireExportCSV` : Génération d'exports CSV en streaming jusqu'à 50 000 enregistrements (`/api/export/csv`).
  - `GestionnaireEvolution` / `GestionnaireDistributionAge` : APIs alimentant les graphiques d'évolution volumétrique et la distribution par âge des fichiers (`/api/stats/evolution` et `/api/stats/age-distribution`).
  - `GestionnaireMiseAJourTags` / `GestionnaireListeTags` : Consultation et édition d'étiquettes personnalisées sur les fiches fichiers (`/api/tags/update` et `/api/tags/list`).
  - `GestionnaireStatutScan` / `GestionnaireVerrouScan` : Endpoint de contrôle du statut et vérification du verrou d'indexation NAS (`/api/scan/status` et `/api/scan/lock-status`).
  - `GestionnaireScanNettoyage` : Module d'analyse et détection des fichiers parasites, doublons nom+taille, fichiers anciens ou très petits (`/api/cleanup/scan`).
  - `GestionnaireArborescence` : Exploration hiérarchique de l'arborescence de fichiers avec support des séparateurs réseau multi-plateformes (`/api/tree`).

![Explorateur EDS — Vue Arborescence avec panneau Détails](arborescence.png)

  - `GestionnaireScanExterne` : **Réception et ingestion REST des métadonnées scannées lors de l'import JSON** (`/api/scan/external-upload`). Gère le verrou NAS, la réception par paquets, l'écriture SQL `execute_values` et la purge réconciliée.
  - `GestionnaireTelechargementOutils` : Distribution du pack client (`/api/download/scanner-exe`). Interroge la base de données PostgreSQL pour lister les EDS et Cellules existants, construit le fichier `scan_nas.cfg` JSON pré-rempli et le sert assemblé avec `scan_nas.exe` dans un **ZIP en mémoire** (`scan_nas_pack.zip`).
  - `GestionnaireFichiersStatiquesSPA` : Routage des fichiers statiques compilés de l'UI React (`app/static/dist/`) et fallback SPA `index.html` avec protection d'entreprise (`no-transform`).
  - `creer_application()` : Initialise le routage applicatif Tornado, définit les limites de buffer HTTP (500 Mo) et monte l'application.

---

### 📄 [tools/scan_nas.exe](file:///c:/Users/axjui/Downloads/projet_stage/v0/dossier_test_python/tools/scan_nas.exe) (Projet C# [`tools/ScanNasClient`](file:///c:/Users/axjui/Downloads/projet_stage/v0/dossier_test_python/tools/ScanNasClient))
*Exécutable client natif Windows GUI en C# / .NET 8 (Windows Forms) — Mode Offline Uniquement.*
- **Sources :** [`tools/ScanNasClient/Program.cs`](file:///c:/Users/axjui/Downloads/projet_stage/v0/dossier_test_python/tools/ScanNasClient/Program.cs) & [`ScanNasClient.csproj`](file:///c:/Users/axjui/Downloads/projet_stage/v0/dossier_test_python/tools/ScanNasClient/ScanNasClient.csproj).
- **Structures & DTOs :**
  - `AppConfig` : Modèle de désérialisation du fichier `scan_nas.cfg` (`eds_list: List<string>`, `cellules_list: List<string>`). Permet au `.exe` de pré-charger les listes d'EDS et de Cellules existantes sans connexion réseau.
  - `FileMetadata` : Modèle de métadonnées (`id`, `nom_fichier`, `chemin_complet`, `dossier_parent`, `taille`, `taille_lisible`, `extension`, `date_modification`, `date_creation`, `est_vide`).
  - `ScanPayload` : Structure du paquet JSON d'export (`nas`, `label`, `scanned_root_path`, `outil_source="exe"`, `is_first_chunk`, `is_last_chunk`, `files`).
- **Composants UI Modern Dark Mode :**
  - `GraphicsUtils` : Calcul du tracé vectoriel `GraphicsPath` pour les coins arrondis.
  - `ModernTextBox` : Champ de texte personnalisé avec effet de surbrillance/luminescence (Indigo glow) au focus et événement `InnerTextBoxLeave`.
  - `RoundedCardPanel` : Panneau conteneur avec fond sombre et bordure fine.
  - `RoundedButton` : Bouton interactif avec gestion des états survol (hover) et désactivé.
- **Classe `MainForm` (Fenêtre Principale) & Mode Offline :**
  - `Program.Main()` : Point d'entrée. Recherche `scan_nas.cfg` dans le dossier du `.exe` puis dans le dossier courant, lit `eds_list` et `cellules_list` et les transmet au constructeur de `MainForm`.
  - `InitializeHeader()` : En-tête avec indicateur vert **"📄 Mode Export JSON"**.
  - `InitializeControls()` : Carte **PARAMÈTRES DU SCANNER** en **2 lignes** : Espace de stockage (EDS) et Cellule. Chaque champ dispose de son propre bouton `▼` indépendant (`btnDropdownEds`, `btnDropdownCellule`) alimenté par les listes du `.cfg` (ou saisie manuelle).
  - `_ActualiserBoutonScan()` : Active le bouton **DÉMARRER LE SCAN** uniquement si les 3 champs obligatoires sont remplis (dossier cible + EDS + Cellule).
  - `BtnBrowse_Click()` : Sélection du dossier cible (`FolderBrowserDialog`).
  - `StartScanAsync()` : Indexation locale récursive (`DirectoryInfo.EnumerateFiles`), calcul MD5 et formatage des métadonnées.
  - `ExportToJson()` : Génération du fichier `scan_resultat_YYYYMMDD_HHMMSS.json` **dans le dossier du `.exe`** (`AppContext.BaseDirectory`), encodé en **UTF-8 sans BOM** (`new UTF8Encoding(false)`) pour garantir une parfaite compatibilité avec le parsing JSON du navigateur Web.

![Exécutable scan_nas.exe — Interface Windows GUI (Mode Export JSON)](executable.png)

---

### 📄 [app/static/dist/](file:///c:/Users/axjui/Downloads/projet_stage/v0/dossier_test_python/app/static/dist/)
*Interface Utilisateur Web compilée (Build Statique SPA).*
- Contient le bundle HTML/JS/CSS statique de production servi directement par Tornado (`GestionnaireFichiersStatiquesSPA`).

---

## 5. Déploiement & Démarrage

### 5.1 Fichier de Configuration `.env`
Créez un fichier `.env` à la racine de l'application :
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/catalogue_metadata
PORT=5000
HOST=0.0.0.0
NO_BROWSER=true
WORKERS=1
DB_POOL_MIN=2
DB_POOL_MAX=20
DB_THREAD_POOL_MAX=16
```

### 5.2 Lancement (Conteneur Docker)
Lancer le conteneur serveur en une seule commande :
```bash
docker-compose up -d --build
```
L'interface est disponible sur `http://<IP_SERVEUR>:5000`.

### 5.3 Lancement (Windows Direct)
Double-cliquer sur `lancer_catalogue.bat` ou exécuter :
```bash
python app/start.py
```

### 5.4 Déploiement de l'Outil Client
Le fichier `scan_nas.exe` et son modèle `scan_nas.cfg` doivent être placés dans le dossier `tools/` à la racine de l'application. L'interface Web les assemble automatiquement dans un pack **`scan_nas_pack.zip`** pré-rempli téléchargeable depuis l'onglet **Configuration** (Étape 1).

```
app/
├── tools/
│   ├── scan_nas.exe     ← Exécutable autonome Windows (C# .NET)
│   └── scan_nas.cfg     ← Fichier de configuration modèle (JSON)
```

### 5.5 Fichier de Configuration Client `scan_nas.cfg`

Pour que `scan_nas.exe` propose automatiquement la liste des EDS et des Cellules déjà enregistrées **sans aucune saisie manuelle**, un fichier de configuration JSON `scan_nas.cfg` accompagne l'exécutable :

```json
{
  "eds_list": ["EDS-PATSIMAR", "EDS-AERONAUTIQUE", "EDS-LOGISTIQUE"],
  "cellules_list": ["Cellule-Aéro", "Cellule-Data", "Cellule-RH"]
}
```

> [!IMPORTANT]
> **Téléchargement en pack pré-configuré** : Lors du clic sur *"Télécharger le pack (.zip)"* dans l'interface Web (endpoint `/api/download/scanner-exe`), le serveur Tornado interroge PostgreSQL pour extraire tous les EDS et cellules existants et génère un fichier `scan_nas_pack.zip` contenant l'exe et le `.cfg` déjà pré-remplis.

---

## 6. Modularité & Options Modifiables via l'Interface (UI)

L'utilisateur dispose d'une autonomie complète pour personnaliser le fonctionnement de l'application via l'interface graphique :

1. **Téléchargement de l'Outil Client (Étape 1) :**
   - Téléchargement du **pack pré-configuré** `scan_nas_pack.zip` depuis l'onglet Configuration — contient `scan_nas.exe` + `scan_nas.cfg` avec les listes d'EDS et de cellules pré-remplies.
2. **Import de Fichiers d'Exportation JSON (Étape 2) :**
   - Glisser-déposer d'un fichier `scan_resultat_YYYYMMDD_HHMMSS.json` généré par l'outil local.
   - **Envoi en flux continu** : Découpage côté client par paquets de 2 000 fichiers avec journal de progression en direct, permettant d'indexer des répertoires de plus de 100 000 fichiers sans geler le navigateur.
   - **Protection anti-doublon de scan** : Le verrou NAS (`_scans_par_nas`) empêche deux scans simultanés sur le même EDS, depuis n'importe quelle session connectée.
3. **Connexion au Serveur PostgreSQL (Liaison de données) :**
   - Saisie ou modification de l'URL de la base de données réseau (`postgresql://utilisateur:motdepasse@hote:port/nom_bd`) pour basculer d'un environnement à un autre.
4. **Gestion des Sources NAS :**
   - Ajout, modification ou suppression de cellules et de sources NAS depuis l'interface.
5. **Gestion des Métadonnées & Tags :**
   - Ajout, édition et suppression d'étiquettes (tags) directement sur les fiches de fichiers.
6. **Export CSV :**
   - Exportation sur mesure des résultats de recherche sous format CSV (jusqu'à 50 000 enregistrements en streaming).

![Interface de Recherche Avancée — Filtres, résultats et export CSV](recherche.png)
7. **Réglages du Mode Nettoyage :**
   - Ajustement du filtre d'ancienneté (en nombre d'années) pour cibler les fichiers vides, doublons, parasites ou obsolètes.

---

## 7. Support, Gouvernance & Contacts

Pour toute question relative au déploiement, au support technique, à l'évolution des fonctionnalités ou à la gouvernance de la donnée au sein de l'organisation :

- **Entité Référente :** CENTEX PATSIMAR
- **Cellule d'Appui :** Lab Data
- **Point de Contact Privilégié :** Clothilde Raye
