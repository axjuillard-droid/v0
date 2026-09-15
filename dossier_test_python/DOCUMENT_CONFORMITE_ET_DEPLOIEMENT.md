# Document de Conformité & Exigences de Déploiement Entreprise
> **Application** : Catalogue NAS & Métadonnées  
> **Composant** : Backend Tornado, Frontend Web React, Client Natif .EXE, Base PostgreSQL Entreprise  
> **Auteur / Contact** : CENTEX PATSIMAR / Lab Data (Clothilde Raye)  
> **Date de révision** : 5 août 2026  

---

## 📋 1. Introduction & Objectif du Document

Ce document est un **guide de conformité et de pré-déploiement** complémentaire au `README.MD`.  
Il répertorie de manière exhaustive l'ensemble des **points d'attention techniques et risques d'échec** lors de la transition d'un environnement de développement local (ex: PC individuel avec Docker local) vers un **environnement de production réseau d'entreprise**.

### Contexte de Déploiement Cible :
1. **Backend Application (Tornado / Python)** : Hébergé sur un serveur d'application d'entreprise.
2. **Reverse Proxy (Nginx / Traefik / Apache / IIS / F5)** : Expose l'application sur un nom de domaine d'entreprise, gère les certificats TLS/HTTPS et l'accès multi-utilisateurs.
3. **Base de Données PostgreSQL distante** : Fournie et gérée par l'infrastructure entreprise (URL de connexion avec authentification).
4. **Postes Clients & Administrateurs NAS** : Utilisateurs distants se connectant via leur navigateur Web ou exécutant l'outil d'indexation local (`scan_nas.exe`).

---

## ⚠️ 2. Matrice de Synthèse des Points Bloquants

| N° | Domaines | Symptôme / Risque si non configuré | Impact | Solution & Action Préventive |
| :--- | :--- | :--- | :---: | :--- |
| **1** | **Reverse Proxy** | **HTTP 413 (Request Entity Too Large)** lors de l'import de gros fichiers JSON. | 🔴 Bloquant | Régler `client_max_body_size 50M;` dans Nginx / Proxy. |
| **2** | **Reverse Proxy** | **Erreurs 404 sur les API** en cas de déploiement sous un sous-dossier (ex: `/catalogue/`). | 🔴 Bloquant | Configurer les en-têtes `X-Forwarded-Prefix` & `X-Forwarded-Proto`. |
| **3** | **Reverse Proxy** | **HTTP 504 (Gateway Timeout)** pendant l'envoi de gros paquets JSON. | 🟡 Majeur | Porter `proxy_read_timeout` et `proxy_connect_timeout` à `300s`. |
| **4** | **PostgreSQL** | **Erreur `Permission Denied`** sur `CREATE EXTENSION pg_trgm` ou `relation "files" does not exist`. | 🔴 Bloquant | Les tables de base sont validées par `commit()` au préalable dans `db.py`. Demander au DBA d'installer `pg_trgm` pour la recherche avancée. |
| **5** | **PostgreSQL** | **Connexion refusée (`SSL connection required`)**. | 🔴 Bloquant | Ajouter `?sslmode=require` dans l'URL de connexion `DB_URL`. |
| **6** | **PostgreSQL** | **Rupture des connexions inactives (Firewall TCP Drop)**. | 🟡 Majeur | Configurer les paramètres TCP Keepalive (`keepalives_idle=60`). |
| **7** | **PostgreSQL** | **Épuisement du pool (`too many clients already`)** sous charge. | 🟡 Majeur | Régler `DB_THREAD_POOL_MAX` sous la limite `max_connections` de la DB. |
| **8** | **Client .EXE** | **Blocage par l'Antivirus / SmartScreen / GPO** sur le poste client. | 🟡 Majeur | Signer le `.exe` ou whitelister l'application auprès de la SSI. |
| **9** | **Réseau Entreprise** | **Blocage des connexions directes .EXE vers le Reverse Proxy (SSO/Proxy)**. | 🟢 Traité | Architecture **Offline-Only** : `scan_nas.exe` génère obligatoirement un fichier JSON local (sans connexion HTTP directe). |
| **10** | **Multi-OS** | **Incoherence de navigation dans l'arborescence (`/` vs `\`)**. | 🟢 Mineur | Bi-normalisation systématique des chemins réseau dans `app.py`/`db.py`. |
| **11** | **Reverse Proxy / SSL** | **`NS_ERROR_CORRUPTED_CONTENT` / 0 octet sur `index.js` et `index.css`**. | 🔴 Bloquant | Inclus dans Tornado `app.py` via `Cache-Control: ..., no-transform` et fallback 404 explicite sur assets. |

---

## 🔍 3. Analyse Détaillée & Recommandations Techniques

### 3.1. Infrastructure Reverse Proxy & Réseau

#### A. Taille Maximale des Requêtes HTTP (`client_max_body_size`)
- **Problème** : Les imports JSON de NAS envoient des métadonnées par paquets de 2 000 fichiers (soit environ 2 Mo à 5 Mo de JSON par paquet). La configuration par défaut de Nginx limite les requêtes entrantes à **1 Mo**. Si le proxy n'est pas ajusté, l'indexation par glisser-déposer échouera avec une erreur **HTTP 413**.
- **Exemples de configuration selon le Reverse Proxy utilisé** :

  * **Option 1 : Nginx**
    ```nginx
    server {
        listen 443 ssl;
        server_name catalogue-nas.entreprise.local;

        # Autoriser des paquets JSON d'indexation jusqu'à 50 Mo
        client_max_body_size 50M;

        location / {
            proxy_pass http://127.0.0.1:5000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
    ```

  * **Option 2 : Apache HTTPD**
    ```apache
    <VirtualHost *:443>
        ServerName catalogue-nas.entreprise.local

        # Autoriser des paquets JSON jusqu'à 50 Mo
        LimitRequestBody 52428800

        ProxyPreserveHost On
        ProxyPass / http://127.0.0.1:5000/
        ProxyPassReverse / http://127.0.0.1:5000/
    </VirtualHost>
    ```

  * **Option 3 : Microsoft IIS (Windows Server)**
    ```xml
    <system.webServer>
      <security>
        <requestFiltering>
          <!-- 50 Mo = 52428800 octets -->
          <requestLimits maxAllowedContentLength="52428800" />
        </requestFiltering>
      </security>
    </system.webServer>
    ```


#### B. Déploiement sous un sous-dossier d'URL (ex: `https://serveur.local/apps/catalogue/`)
- **Problème** : Si l'application n'est pas installée à la racine du domaine mais dans un sous-dossier réseau, des appels d'API mal orientés vers `/api/...` risquent de faire sauter le préfixe `/apps/catalogue/`.
- **Solution appliquée** :
  - **Frontend React** : `vite.config.ts` inclut `base: './'` et `client.ts` déduit dynamiquement la racine d'API via `window.location.pathname`.
- **Configuration Proxy recommandée** : Transmettre l'en-tête `X-Forwarded-Prefix` :
  ```nginx
  proxy_set_header X-Forwarded-Prefix /apps/catalogue;
  ```

#### C. Délais d'attente (Timeouts HTTP)
- **Problème** : L'injection SQL d'un très grand nombre de fichiers ou la purge d'un gros périmètre peut prendre 10 à 30 secondes. Un proxy avec un timeout par défaut de 30 secondes risque d'interrompre prématurément la requête (**HTTP 504 Gateway Timeout**).
- **Action requise** :
  ```nginx
  proxy_connect_timeout 300s;
  proxy_send_timeout    300s;
  proxy_read_timeout    300s;
  ```

#### D. Altération des Fichiers Statiques (.JS / .CSS) par les Proxies Réseau (`NS_ERROR_CORRUPTED_CONTENT`)
- **Problème** : Sur un réseau d'entreprise, les pare-feux et proxies de sécurité (Zscaler, BlueCoat, Palo Alto) inspectent le trafic HTTP non chiffré sur des ports non standard (port 5000). S'ils interceptent les flux `.js` / `.css` ou modifient la compression Gzip sans ajuster les en-têtes, le navigateur reçoit 0 octet et lève l'erreur `NS_ERROR_CORRUPTED_CONTENT`.
- **Solution intégrée dans Tornado (`app.py`)** :
  - Envoi de l'en-tête HTTP `Cache-Control: ..., no-transform` interdisant aux proxies d'altérer ou de re-compresser les assets statiques.
  - Renvoi d'un statut `HTTP 404` explicite sur les ressources statiques manquantes au lieu d'injecter du code `index.html`.

---

## 3.2. Base de Données PostgreSQL Entreprise (URL Distante)

#### A. Droits d'extension `pg_trgm` (Recherche Intelligente & Floue)
- **Problème** : Pour accélérer la recherche textuelle floue, l'application exécute au démarrage :
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  ```
  Sur une base de données PostgreSQL managée en entreprise, l'utilisateur fourni n'a généralement **pas les droits `SUPERUSER`**. L'initialisation risque de bloquer avec un message `permission denied to create extension "pg_trgm"`.
- **Action requise** :
  1. Transmettre au DBA (Administrateur de Base de Données) la demande suivante avant le déploiement :
     > *"Merci d'activer l'extension `pg_trgm` sur la base de données `catalogue_metadata` pour l'utilisateur applicatif."*
  2. Le code backend `db.py` est sécurisé par un bloc `try/except` afin que l'application démarre même si l'extension est déjà gérée par le DBA.

#### B. Connexion Sécurisée SSL/TLS (`sslmode`)
- **Problème** : En développement local, PostgreSQL accepte les connexions non chiffrées (`sslmode=disable`). En entreprise, le serveur PostgreSQL exige souvent une connexion chiffrée SSL (`sslmode=require` ou `sslmode=verify-full`).
- **Action requise** : Configurer la variable d'environnement `DB_URL` avec le mode SSL adéquat :
  ```env
  DB_URL=postgresql://utilisateur:motdepasse@db-prod.entreprise.local:5432/catalogue_metadata?sslmode=require
  ```

#### C. Maintien des Connexions Inactives (Pare-feu & TCP Keepalive)
- **Problème** : Les pare-feux réseau d'entreprise coupent silencieusement les sockets TCP inactifs après 10 à 15 minutes d'inactivité. Lors de la requête suivante, Python lève l'erreur `psycopg2.OperationalError: server closed the connection unexpectedly`.
- **Solution appliquée dans `db.py`** :
  Les paramètres `keepalives` sont intégrés dans le pool de connexions :
  ```python
  conn = psycopg2.connect(
      dsn,
      keepalives=1,
      keepalives_idle=60,      # Envoi d'un probe après 60s d'inactivité
      keepalives_interval=10,  # Réinterroger toutes les 10s
      keepalives_count=5       # Déclarer HS après 5 échecs
  )
  ```

#### D. Dimensionnement du Pool de Connexions SQL
- **Problème** : Si 50 personnes se connectent en même temps, le serveur ne doit pas dépasser le quota de connexions autorisées (`max_connections`) défini sur le serveur PostgreSQL distant.
- **Configuration recommandée** : Ajuster la variable d'environnement `DB_THREAD_POOL_MAX` (par défaut `16`) en fonction du quota alloué par votre DBA.

---

## 3.3. Client Distant (`scan_nas.exe`) & Ingestion JSON

#### A. Antivirus, Windows Defender & Politiques GPO
- **Problème** : Un fichier `.exe` fraîchement compilé peut être bloqué par l'antivirus du poste client ou par la protection Windows SmartScreen (absence de signature numérique payante).
- **Mesure recommandée** : Demander le whitelisting du binaire `scan_nas.exe` auprès du service SSI / Sécurité Informatique.

#### B. Compatibilité Réseau d'Entreprise (Reverse Proxy & SSO)
- **Contexte & Justification** : Dans un réseau d'entreprise protégé par un reverse proxy (ex: Coder, SSO, mire d'authentification NTLM/Kerberos), un exécutable autonome **ne peut pas** envoyer directement des paquets HTTP au serveur backend car le proxy intercepte et redirige la requête.
- **Solution d'architecture** : `scan_nas.exe` fonctionne exclusivement en **Mode Export JSON Hors-Ligne**. L'outil scanne le dossier local et génère un fichier `scan_resultat_YYYYMMDD_HHMMSS.json` **dans le dossier de l'exécutable** (encodé en UTF-8 sans BOM). L'utilisateur dépose ensuite ce fichier dans l'interface Web du Catalogue (Étape 2).

---

## 3.4. Multi-Utilisateurs & Isolation des Scans

#### A. Concurrence d'Indexation sur le même NAS
- **Principe de protection** : Si deux utilisateurs lancent simultanément un import JSON sur le même espace NAS (`NAS-SOCLE-01`), l'application verrouille l'opération pour ce NAS via `_verrou_scans`.
- **Comportement** : Le second utilisateur reçoit une alerte HTTP **409 Conflict** explicite (*"Ce NAS est déjà en cours d'indexation par la cellule X. Veuillez patienter..."*).
- **Scans simultanés sur des NAS différents** : Totalement supportés et exécutés en parallèle sans aucun conflit.

#### B. Normalisation des Chemins Windows UNC (`\\server\share`) et Posix (`/`)
- **Principe de robustesse** : Les NAS Windows utilisent des backslashes (`\`), tandis que les serveurs Linux utilisent des slashes (`/`).
- **Solution appliquée** : Le backend `app.py` et `db.py` effectue une **double normalisation systématique** dans les requêtes SQL `LIKE` et dans la recherche pour garantir que l'arborescence s'affiche parfaitement, quel que soit l'OS du serveur d'application.

---

## ⚙️ 4. Fichier de Configuration `.env` Prêt pour la Production

Voici le modèle de fichier `.env` à placer sur le serveur de production (dans le même dossier que `app/app.py`) :

```env
# ── CONFIGURATION BACKEND TORNADO ──────────────────────────────────────────────
PORT=5000
HOST=0.0.0.0

# ── CONFIGURATION BASE DE DONNÉES POSTGRESQL ENTREPRISE ────────────────────────
# Remplacer par l'URL fournie par votre service informatique / DBA
DB_URL=postgresql://utilisateur_app:MotDePasseSecurise@db-prod.entreprise.local:5432/catalogue_metadata?sslmode=require

# Nombre maximal de connexions SQL simultanées autorisées dans le pool
DB_THREAD_POOL_MAX=16

# ── SÉCURITÉ ET RESSEAU ───────────────────────────────────────────────────────
# Taille maximale des paquets JSON d'indexation autorisés (en octets, ex: 50 Mo)
MAX_BODY_SIZE=52428800
```

---

## ✅ 5. Liste de Contrôle Finale avant la Mise en Production (Checklist)

- [ ] **Base de Données** : L'URL PostgreSQL est fonctionnelle et accessible depuis le serveur d'application.
- [ ] **Extension SQL** : L'extension `pg_trgm` est activée sur la base PostgreSQL.
- [ ] **Reverse Proxy** : `client_max_body_size` est réglé sur au moins `50M` dans Nginx / Reverse Proxy.
- [ ] **Timeouts Proxy** : `proxy_read_timeout` est réglé sur `300s`.
- [ ] **En-têtes Proxy** : `X-Forwarded-For` et `X-Forwarded-Proto` sont bien transmis par le proxy.
- [ ] **Variables d'environnement** : Le fichier `.env` de production est renseigné avec l'URL DB réseau.
- [ ] **Outils Clients** : Le fichier [scan_nas.exe](file:///c:/Users/axjui/Downloads/projet_stage/v0/dossier_test_python/tools/scan_nas.exe) est bien présent dans le dossier `tools/` pour le téléchargement via le pack ZIP pré-configuré (`scan_nas_pack.zip`).
