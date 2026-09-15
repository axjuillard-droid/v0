"""
db.py — Gestionnaire de connexion et schéma PostgreSQL
Catalogue NAS — Aéronavale Windows 10

Pas de config.yml : l'URL est fournie par l'UI à chaque session.
Tout le reste (sources NAS, configuration) est stocké dans PostgreSQL.
"""
import os
import logging
import psycopg2
from psycopg2.extras import execute_values
from pathlib import Path

from psycopg2.pool import ThreadedConnectionPool
from contextlib import contextmanager

journal = logging.getLogger("GESTIONNAIRE_BD")


def obtenir_racine_projet():
    import sys
    if getattr(sys, 'frozen', False):
        return Path(sys.executable).parent
    return Path(__file__).parent.absolute()


# ──────────────────────────────────────────────────────────
# URL active et Pool de Connexions PostgreSQL (Multi-utilisateurs)
# ──────────────────────────────────────────────────────────
URL_BD_ACTIVE = None
POOL_BD = None


def obtenir_url_bd():
    """
    Retourne l'URL PostgreSQL active.
    Ordre de priorité :
      1. URL_BD_ACTIVE (défini via l'UI ou l'application)
      2. Variable d'environnement DATABASE_URL
      3. Fichier .env local à la racine du projet
    """
    global URL_BD_ACTIVE
    if URL_BD_ACTIVE:
        return URL_BD_ACTIVE

    url_env = os.environ.get("DATABASE_URL")
    if url_env:
        return url_env

    # Fallback : lecture du fichier .env s'il existe à la racine du projet
    racine = obtenir_racine_projet()
    fichier_env = Path(racine) / ".env"
    if fichier_env.exists():
        try:
            with open(fichier_env, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("DATABASE_URL="):
                        return line.split("=", 1)[1].strip().strip('"').strip("'")
        except Exception:
            pass

    return None


def initialiser_pool_bd(minconn=2, maxconn=20):
    """Initialise ou réinitialise le pool de connexions PostgreSQL thread-safe."""
    global POOL_BD
    url = obtenir_url_bd()
    if not url:
        return None
    if POOL_BD is not None:
        try:
            POOL_BD.closeall()
        except Exception:
            pass
        POOL_BD = None

    try:
        max_c = int(os.environ.get("DB_POOL_MAX", maxconn))
        min_c = int(os.environ.get("DB_POOL_MIN", minconn))
        POOL_BD = ThreadedConnectionPool(min_c, max_c, dsn=url)
        journal.info(f"✓ Pool de connexions PostgreSQL initialisé avec succès ({min_c}-{max_c} connexions max).")
        return POOL_BD
    except Exception as e:
        journal.error(f"Impossible d'initialiser le pool de connexions PostgreSQL : {e}")
        POOL_BD = None
        raise


def meuler_pool():
    """Ferme proprement toutes les connexions du pool (au shutdown)."""
    global POOL_BD
    if POOL_BD:
        try:
            POOL_BD.closeall()
            journal.info("Pool de connexions PostgreSQL fermé.")
        except Exception as e:
            journal.warning(f"Erreur à la fermeture du pool : {e}")
        POOL_BD = None


def definir_url_bd(url: str):
    """Définit l'URL active et réinitialise le pool de connexions."""
    global URL_BD_ACTIVE
    URL_BD_ACTIVE = url
    try:
        initialiser_pool_bd()
    except Exception as e:
        journal.error(f"Erreur lors de la mise à jour de l'URL BD : {e}")


def obtenir_connexion_bd(chemin_config=None):
    """
    Retourne une connexion PostgreSQL depuis le pool (ou crée une connexion directe si pool inactif).
    Lève une exception si aucune URL n'est configurée.
    """
    global POOL_BD
    url = obtenir_url_bd()
    if not url:
        raise RuntimeError(
            "Aucune URL de base de données configurée. "
            "Utilisez la page 'Liaison de données' ou définissez DATABASE_URL."
        )

    if POOL_BD is None:
        try:
            initialiser_pool_bd()
        except Exception:
            pass

    if POOL_BD:
        try:
            connexion = POOL_BD.getconn()
            connexion.autocommit = False
            return connexion
        except Exception as e:
            journal.warning(f"Obtention connexion pool échouée ({e}), tentative connexion directe...")

    connexion = psycopg2.connect(url)
    connexion.autocommit = False
    return connexion


def liberer_connexion_bd(connexion, avec_erreur=False):
    """Restitue proprement une connexion au pool (ou la ferme si connexion hors pool)."""
    global POOL_BD
    if connexion is None:
        return
    if POOL_BD:
        try:
            POOL_BD.putconn(connexion, close=avec_erreur)
            return
        except Exception:
            pass
    try:
        connexion.close()
    except Exception:
        pass


@contextmanager
def obtenir_connexion_contexte():
    """
    Context manager Python pour obtenir et restituer automatiquement une connexion BDD au pool.
    Exemple :
        with obtenir_connexion_contexte() as connexion:
            with connexion.cursor() as curseur:
                curseur.execute("SELECT ...")
    """
    conn = obtenir_connexion_bd()
    try:
        yield conn
    except Exception:
        try:
            conn.rollback()
        except Exception:
            pass
        liberer_connexion_bd(conn, avec_erreur=True)
        raise
    else:
        liberer_connexion_bd(conn, avec_erreur=False)



# ──────────────────────────────────────────────────────────
def reinitialiser_tables_bd(connexion):
    """
    Supprime toutes les tables applicatives PostgreSQL (files, nas_sources, app_config)
    pour repartir d'une base totalement vierge.
    """
    with connexion.cursor() as curseur:
        curseur.execute("DROP TABLE IF EXISTS files CASCADE;")
        curseur.execute("DROP TABLE IF EXISTS nas_sources CASCADE;")
        curseur.execute("DROP TABLE IF EXISTS app_config CASCADE;")
        connexion.commit()
        journal.info("⚠️ Réinitialisation complète : Toutes les tables PostgreSQL ont été supprimées.")


def initialiser_bd(connexion):
    """
    Initialise (ou vérifie) toutes les tables du schéma.
    Idempotent : peut être appelé plusieurs fois sans effet secondaire.
    """
    with connexion.cursor() as curseur:

        # ── 1. Table principale : fichiers indexés ──────────────
        curseur.execute("""
        CREATE TABLE IF NOT EXISTS files (
            id               VARCHAR(32)  PRIMARY KEY,
            nom_fichier      VARCHAR(255) NOT NULL,
            chemin_complet   TEXT         NOT NULL,
            taille           BIGINT       NOT NULL,
            extension        VARCHAR(50),
            date_modification TIMESTAMP   NOT NULL,
            date_creation    TIMESTAMP,
            date_indexation  TIMESTAMP    NOT NULL,
            nas_origine      VARCHAR(100) NOT NULL,
            est_vide         BOOLEAN      NOT NULL,
            tags             TEXT[]       DEFAULT '{}'::TEXT[],
            last_seen        TIMESTAMP    NOT NULL
        );
        """)

        # Migration : Colonnes optionnelles et nettoyages
        curseur.execute("ALTER TABLE files DROP COLUMN IF EXISTS proprietaire;")
        curseur.execute("ALTER TABLE files ADD COLUMN IF NOT EXISTS nas VARCHAR(100) DEFAULT 'defaut';")
        curseur.execute("ALTER TABLE files ADD COLUMN IF NOT EXISTS date_creation TIMESTAMP;")
        curseur.execute("UPDATE files SET date_creation = date_modification WHERE date_creation IS NULL;")
        curseur.execute("ALTER TABLE files ADD COLUMN IF NOT EXISTS taille_lisible VARCHAR(20) DEFAULT NULL;")
        curseur.execute("ALTER TABLE files ADD COLUMN IF NOT EXISTS dossier_parent TEXT DEFAULT '';")
        curseur.execute("ALTER TABLE files ADD COLUMN IF NOT EXISTS outil_source VARCHAR(20) DEFAULT 'inconnu';")

        # ── 2. Table sources NAS ──────────────
        curseur.execute("""
        CREATE TABLE IF NOT EXISTS nas_sources (
            label       VARCHAR(100) NOT NULL,
            path        TEXT         NOT NULL,
            last_scan   TIMESTAMP,
            file_count  INTEGER      DEFAULT 0,
            created_at  TIMESTAMP    DEFAULT NOW(),
            updated_at  TIMESTAMP    DEFAULT NOW()
        );
        """)
        curseur.execute("ALTER TABLE nas_sources ADD COLUMN IF NOT EXISTS nas VARCHAR(100) DEFAULT 'defaut';")

        # ── 3. Table configuration applicative ──────────────
        curseur.execute("""
        CREATE TABLE IF NOT EXISTS app_config (
            key         VARCHAR(100) PRIMARY KEY,
            value       TEXT,
            updated_at  TIMESTAMP DEFAULT NOW()
        );
        """)

        # Commit de la création des tables obligatoires immédiatement
        connexion.commit()

        # ── 4. Index de recherche standard B-Tree & GIN ───────
        try:
            curseur.execute("DROP INDEX IF EXISTS idx_files_search;")
            curseur.execute("DROP INDEX IF EXISTS idx_files_nas_seen;")
            curseur.execute("CREATE INDEX IF NOT EXISTS idx_files_search  ON files (nom_fichier, extension, nas, nas_origine);")
            curseur.execute("CREATE INDEX IF NOT EXISTS idx_files_nas_seen ON files (nas, nas_origine, last_seen);")
            curseur.execute("CREATE INDEX IF NOT EXISTS idx_files_tags    ON files USING GIN (tags);")
            connexion.commit()
        except Exception as e:
            journal.warning(f"Index de recherche standard non créés : {e}")
            connexion.rollback()

        # ── 5. Clé primaire composite nas_sources ──────────────
        try:
            curseur.execute("""
                SELECT a.attname
                FROM pg_index i
                JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
                WHERE i.indrelid = 'nas_sources'::regclass AND i.indisprimary;
            """)
            colonnes_cp = [r[0] for r in curseur.fetchall()]
            if 'nas' not in colonnes_cp:
                curseur.execute("ALTER TABLE nas_sources DROP CONSTRAINT IF EXISTS nas_sources_pkey;")
                curseur.execute("ALTER TABLE nas_sources ADD PRIMARY KEY (nas, label);")
            connexion.commit()
        except Exception as e:
            journal.warning(f"Ajustement clé primaire nas_sources : {e}")
            connexion.rollback()

        # ── 6. Extension Trigramme / Unaccent (Nécessite droits SUPERUSER) ──
        try:
            curseur.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
            curseur.execute("CREATE EXTENSION IF NOT EXISTS unaccent;")
            connexion.commit()
        except Exception as e:
            journal.warning(f"Impossible d'activer les extensions pg_trgm ou unaccent (droits restreints) : {e}")
            connexion.rollback()

        # Création de la fonction helper immutable_unaccent requise par PostgreSQL pour les index GIN
        try:
            curseur.execute("""
                CREATE OR REPLACE FUNCTION immutable_unaccent(text)
                RETURNS text AS $$
                    SELECT public.unaccent('public.unaccent', $1)
                $$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;
            """)
            connexion.commit()
        except Exception as e:
            try:
                curseur.execute("""
                    CREATE OR REPLACE FUNCTION immutable_unaccent(text)
                    RETURNS text AS $$
                        SELECT public.unaccent($1)
                    $$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;
                """)
                connexion.commit()
            except Exception as ex:
                journal.warning(f"Impossible de créer la fonction helper immutable_unaccent : {ex}")
                connexion.rollback()

        # Index trigramme unaccent GIN pour chemin_complet
        try:
            curseur.execute("CREATE INDEX IF NOT EXISTS idx_files_chemin_unaccent_trgm ON files USING gin (immutable_unaccent(chemin_complet) gin_trgm_ops);")
            curseur.execute("DROP INDEX IF EXISTS idx_files_chemin;")
            connexion.commit()
        except Exception as e:
            journal.warning(f"Impossible de créer l'index trigramme GIN (unaccent) : {e}. Recherche classique utilisée.")
            connexion.rollback()
            try:
                curseur.execute("CREATE INDEX IF NOT EXISTS idx_files_chemin ON files (chemin_complet);")
                connexion.commit()
            except Exception as ex:
                connexion.rollback()

        # Index trigramme unaccent GIN pour nom_fichier
        try:
            curseur.execute("CREATE INDEX IF NOT EXISTS idx_files_nomfichier_unaccent_trgm ON files USING gin (immutable_unaccent(nom_fichier) gin_trgm_ops);")
            connexion.commit()
        except Exception as e:
            journal.warning(f"Impossible de créer l'index GIN sur nom_fichier : {e}.")
            connexion.rollback()

        # Index B-Tree pattern optimisé pour l'arborescence
        try:
            curseur.execute("CREATE INDEX IF NOT EXISTS idx_files_nas_chemin_pattern ON files (nas, chemin_complet text_pattern_ops);")
            connexion.commit()
        except Exception as e:
            journal.warning(f"Impossible de créer l'index pattern d'arborescence : {e}.")
            connexion.rollback()

        # Valeurs de config par défaut
        try:
            curseur.execute("""
            INSERT INTO app_config (key, value) VALUES
                ('scan_threads', '4'),
                ('cleanup_deleted', 'true'),
                ('calculate_hash', 'false')
            ON CONFLICT (key) DO NOTHING;
            """)
            connexion.commit()
        except Exception as e:
            connexion.rollback()

        # ── Synchronisation des sources orphelines ──
        try:
            curseur.execute("""
            INSERT INTO nas_sources (nas, label, path, last_scan, file_count, created_at, updated_at)
            SELECT DISTINCT nas, nas_origine, 'Import CSV', MIN(date_indexation), COUNT(*), MIN(date_indexation), NOW()
            FROM files
            WHERE (nas, nas_origine) NOT IN (SELECT nas, label FROM nas_sources)
            GROUP BY nas, nas_origine
            ON CONFLICT (nas, label) DO NOTHING;
            """)
            connexion.commit()
        except Exception as e:
            connexion.rollback()

        journal.info("Schéma PostgreSQL initialisé ou vérifié (files + nas_sources + app_config).")


# ──────────────────────────────────────────────────────────
# Fonctions d'assistance pour les sources NAS
# ──────────────────────────────────────────────────────────
def obtenir_toutes_sources(connexion) -> list[dict]:
    """Retourne toutes les sources NAS depuis la base."""
    with connexion.cursor() as curseur:
        curseur.execute("""
            SELECT nas, label, path, last_scan, file_count, created_at, updated_at
            FROM nas_sources ORDER BY nas, label
        """)
        return [
            {
                "nas": r[0],
                "label": r[1],
                "path": r[2],
                "last_scan": r[3].isoformat() if r[3] else None,
                "file_count": r[4],
                "created_at": r[5].isoformat() if r[5] else None,
                "updated_at": r[6].isoformat() if r[6] else None,
            }
            for r in curseur.fetchall()
        ]


def inserer_ou_mettre_a_jour_source(connexion, nas: str, etiquette: str, chemin: str):
    """Insère ou met à jour une source NAS."""
    with connexion.cursor() as curseur:
        curseur.execute("""
            INSERT INTO nas_sources (nas, label, path, updated_at)
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT (nas, label) DO UPDATE SET
                path = EXCLUDED.path,
                updated_at = NOW()
        """, (nas, etiquette, chemin))
        connexion.commit()


def mettre_a_jour_stats_source(connexion, nas: str, etiquette: str, nombre_fichiers: int):
    """Met à jour la date du dernier scan et le nombre de fichiers d'une source."""
    with connexion.cursor() as curseur:
        curseur.execute("""
            UPDATE nas_sources SET last_scan = NOW(), file_count = %s, updated_at = NOW()
            WHERE nas = %s AND label = %s
        """, (nombre_fichiers, nas, etiquette))
        connexion.commit()


def rafraichir_stats_source(connexion, nas: str, etiquette: str):
    """
    Recalcule le nombre de fichiers d'une source directement depuis la table files
    et met à jour nas_sources en conséquence.
    Si une cellule ou un EDS devient vide (0 fichier), il est automatiquement supprimé.
    """
    with connexion.cursor() as curseur:
        curseur.execute(
            "SELECT COUNT(*) FROM files WHERE nas = %s AND nas_origine = %s",
            (nas, etiquette)
        )
        compte_reel = curseur.fetchone()[0]

        if compte_reel == 0:
            curseur.execute("DELETE FROM nas_sources WHERE nas = %s AND label = %s", (nas, etiquette))
        else:
            curseur.execute("""
                UPDATE nas_sources
                SET file_count = %s, updated_at = NOW()
                WHERE nas = %s AND label = %s
            """, (compte_reel, nas, etiquette))

        # Nettoyage automatique de toutes les cellules / EDS vides ou orphelins sans aucun fichier
        curseur.execute("""
            DELETE FROM nas_sources
            WHERE (nas, label) NOT IN (SELECT DISTINCT nas, nas_origine FROM files);
        """)
        connexion.commit()
    return compte_reel


def supprimer_source(connexion, nas: str, etiquette: str):
    """Supprime une source NAS et tous ses fichiers associés."""
    with connexion.cursor() as curseur:
        curseur.execute("DELETE FROM files WHERE nas = %s AND nas_origine = %s", (nas, etiquette))
        curseur.execute("DELETE FROM nas_sources WHERE nas = %s AND label = %s", (nas, etiquette))
        connexion.commit()


def obtenir_config_app(connexion, cle: str, defaut=None) -> str | None:
    """Lit une valeur de configuration depuis app_config."""
    with connexion.cursor() as curseur:
        curseur.execute("SELECT value FROM app_config WHERE key = %s", (cle,))
        ligne = curseur.fetchone()
        return ligne[0] if ligne else defaut


def definir_config_app(connexion, cle: str, valeur: str):
    """Écrit ou met à jour une valeur de configuration."""
    with connexion.cursor() as curseur:
        curseur.execute("""
            INSERT INTO app_config (key, value, updated_at) VALUES (%s, %s, NOW())
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        """, (cle, valeur))
        connexion.commit()


# ──────────────────────────────────────────────────────────
# Détection de conflits de chemins
# ──────────────────────────────────────────────────────────
def verifier_conflit_chemin(connexion, nouveau_chemin: str, nouvelle_etiquette: str, chemins_exclus: list = None, nas: str = "defaut") -> dict | None:
    """
    Vérification des conflits désactivée à la demande de l'utilisateur :
    Autorise tous les scans sans message d'avertissement ni blocage.
    """
    return None


# ──────────────────────────────────────────────────────────
# Ingestion des Scans Externe & Réconciliation par Périmètre
# ──────────────────────────────────────────────────────────
def inserer_ou_mettre_a_jour_fichiers_externe(
    connexion,
    nas: str,
    label: str,
    scanned_root_path: str,
    outil_source: str,
    is_first_chunk: bool,
    is_last_chunk: bool,
    fichiers: list[dict],
    debut_scan_iso: str = None,
    seen_ids: list[str] = None
) -> dict:
    """
    Ingère un paquet de fichiers scannés par un outil client externe (.exe, .bat, json_import).
    Réalise l'UPSERT sur la table 'files', et effectue la purge réconciliée sur le périmètre
    exact de 'scanned_root_path' lors du dernier lot (is_last_chunk = True) en conservant les seen_ids.
    """
    from datetime import datetime

    nas = nas or "NAS-LOCAL"
    label = label or "Cellule-Principale"
    scanned_root_path = (scanned_root_path or "").strip()
    outil_source = outil_source or "externe"

    # Enregistrer / Mettre à jour la source dans nas_sources
    inserer_ou_mettre_a_jour_source(connexion, nas, label, scanned_root_path)

    # Préparation des tuples pour execute_values
    valeurs = []
    import hashlib
    for f in fichiers:
        chemin_complet = (f.get("chemin_complet") or "").replace('\\', '/').strip()
        while '//' in chemin_complet:
            chemin_complet = chemin_complet.replace('//', '/')

        dossier_parent = (f.get("dossier_parent") or "").replace('\\', '/').strip()
        while '//' in dossier_parent:
            dossier_parent = dossier_parent.replace('//', '/')

        taille = int(f.get("taille", 0))

        doc_id = f.get("id")

        # Formatage uniforme du timestamp ISO et objet datetime pour PostgreSQL
        ts_mod = f.get("date_modification")
        if isinstance(ts_mod, (int, float)):
            dt_mod_obj = datetime.fromtimestamp(ts_mod / 1000.0)
        elif isinstance(ts_mod, str) and ts_mod:
            try:
                dt_mod_obj = datetime.fromisoformat(ts_mod)
            except Exception:
                dt_mod_obj = datetime.now()
        elif isinstance(ts_mod, datetime):
            dt_mod_obj = ts_mod
        else:
            dt_mod_obj = datetime.now()

        date_mod_str = dt_mod_obj.strftime("%Y-%m-%dT%H:%M:%S")

        # Si l'ID MD5 n'est pas fourni par le client, recalcul basé sur le chemin complet normalisé
        if not doc_id:
            cle_brute = f"{chemin_complet.lower()}|{taille}|{date_mod_str}"
            doc_id = hashlib.md5(cle_brute.encode('utf-8', errors='replace')).hexdigest()

        ts_crea = f.get("date_creation")
        if isinstance(ts_crea, (int, float)):
            dt_crea_obj = datetime.fromtimestamp(ts_crea / 1000.0)
        elif isinstance(ts_crea, str) and ts_crea:
            try:
                dt_crea_obj = datetime.fromisoformat(ts_crea)
            except Exception:
                dt_crea_obj = dt_mod_obj
        elif isinstance(ts_crea, datetime):
            dt_crea_obj = ts_crea
        else:
            dt_crea_obj = dt_mod_obj

        valeurs.append((
            doc_id,
            f.get("nom_fichier", ""),
            chemin_complet,
            dossier_parent,
            taille,
            f.get("taille_lisible", ""),
            f.get("extension", ""),
            dt_mod_obj,
            dt_crea_obj,
            datetime.now(),  # date_indexation
            datetime.now(),  # last_seen
            nas,
            label,
            f.get("est_vide", False),
            outil_source
        ))

    requete_upsert = """
    INSERT INTO files (
        id, nom_fichier, chemin_complet, dossier_parent, taille, taille_lisible,
        extension, date_modification, date_creation, date_indexation, last_seen,
        nas, nas_origine, est_vide, outil_source
    ) VALUES %s
    ON CONFLICT (id) DO UPDATE SET
        nom_fichier = EXCLUDED.nom_fichier,
        chemin_complet = EXCLUDED.chemin_complet,
        dossier_parent = EXCLUDED.dossier_parent,
        taille = EXCLUDED.taille,
        taille_lisible = EXCLUDED.taille_lisible,
        extension = EXCLUDED.extension,
        date_modification = EXCLUDED.date_modification,
        nas = EXCLUDED.nas,
        nas_origine = EXCLUDED.nas_origine,
        last_seen = NOW(),
        est_vide = EXCLUDED.est_vide,
        outil_source = EXCLUDED.outil_source;
    """

    fichiers_supprimes = 0
    with connexion.cursor() as curseur:
        if valeurs:
            execute_values(curseur, requete_upsert, valeurs, page_size=2000)

        # Sur le dernier lot, effectuer la purge réconciliée ciblée sur scanned_root_path
        # en supprimant UNIQUEMENT les fichiers du chemin dont l'ID n'a pas été vu pendant ce scan
        if is_last_chunk and scanned_root_path and seen_ids:
            root_fwd = scanned_root_path.replace('\\', '/').rstrip('/')
            prefix_fwd = root_fwd + '/%'

            requete_purge = """
            DELETE FROM files
            WHERE (
                LOWER(chemin_complet) = LOWER(%s) OR
                LOWER(chemin_complet) LIKE LOWER(%s) OR
                LOWER(REPLACE(chemin_complet, '\\', '/')) LIKE LOWER(%s)
              )
              AND NOT (id = ANY(%s));
            """
            curseur.execute(requete_purge, (
                root_fwd,
                prefix_fwd,
                prefix_fwd,
                seen_ids
            ))
            fichiers_supprimes = curseur.rowcount

        connexion.commit()

    # Recalculer les statistiques de la source
    fichiers_actifs = rafraichir_stats_source(connexion, nas, label)

    return {
        "status": "success",
        "ingested": len(fichiers),
        "deleted": fichiers_supprimes,
        "total_active": fichiers_actifs,
        "is_last_chunk": is_last_chunk
    }

