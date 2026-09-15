"""
Catalogue NAS — Backend Tornado (Version PostgreSQL)
Refactorisé pour déploiement Windows 10 — Aéronavale
Conformité SSI : Utilisation de Tornado (autorisé) au lieu de Flask.
"""
import os
import io
import csv
import json
import hashlib
import logging
import asyncio
from datetime import datetime, timedelta
from pathlib import Path
import sys
import threading
import argparse
from concurrent.futures import ThreadPoolExecutor

import tornado.web
import tornado.ioloop
import tornado.escape
import psycopg2
from psycopg2.extras import execute_values

# Répertoire racine du projet (parent du dossier app/)
RACINE_PROJET_BRUT = Path(__file__).parent.parent
sys.path.append(str(RACINE_PROJET_BRUT))

# Importer le gestionnaire de base de données PostgreSQL
from db import obtenir_racine_projet, obtenir_connexion_bd, initialiser_bd, obtenir_url_bd
import db
RACINE_PROJET = obtenir_racine_projet()

# Configurer le logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
journal = logging.getLogger("BACKEND_TORNADO")

# Pool de threads d'arrière-plan pour déléguer les requêtes SQL sans bloquer l'Event Loop Tornado
executor_sql = ThreadPoolExecutor(max_workers=int(os.environ.get("DB_THREAD_POOL_MAX", 16)))


# ──────────────────────────────────────────────
# Utilitaires de sécurité
# ──────────────────────────────────────────────
def _verifier_jeton_api():
    """Réseau fermé de confiance : retour automatique de True."""
    return True

def _chemin_autorise(chemin_str: str) -> bool:
    """Réseau fermé de confiance : retour automatique de True."""
    return True


# ──────────────────────────────────────────────
# Gestionnaire de base pour les API JSON (Asynchrone non-bloquant)
# ──────────────────────────────────────────────
class GestionnaireAPIBase(tornado.web.RequestHandler):
    async def executer_db(self, fonction, *args, **kwargs):
        """Exécute une fonction SQL bloquante dans le ThreadPoolExecutor d'arrière-plan."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(executor_sql, lambda: fonction(*args, **kwargs))

    def ecrire_json(self, donnees, code_statut=200):
        self.set_header("Content-Type", "application/json")
        self.set_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.set_header("Pragma", "no-cache")
        self.set_header("Expires", "0")
        self.set_status(code_statut)
        self.write(json.dumps(donnees, default=str))

    def obtenir_corps_json(self):
        try:
            return json.loads(self.request.body.decode('utf-8'))
        except Exception:
            return {}


# ──────────────────────────────────────────────
# API – Connexion Base de Données (Page de verrouillage)
# ──────────────────────────────────────────────
class GestionnaireStatutBD(GestionnaireAPIBase):
    def get(self):
        url = obtenir_url_bd()
        if not url:
            self.ecrire_json({"connected": False, "message": "Aucune URL de base de données configurée"})
            return

        try:
            with db.obtenir_connexion_contexte() as connexion:
                with connexion.cursor() as curseur:
                    curseur.execute("SELECT 1")

            # Obscurcir l'URL pour la sécurité
            try:
                from urllib.parse import urlparse
                parse = urlparse(url)
                url_masquee = f"{parse.scheme}://{parse.username}:******@{parse.hostname}:{parse.port}{parse.path}"
            except Exception:
                url_masquee = "postgresql://******"

            self.ecrire_json({"connected": True, "url": url_masquee})
        except Exception as e:
            journal.warning(f"[DB STATUS CHECK FAILED] Impossible de se connecter à la base : {e}")
            self.ecrire_json({"connected": False, "error": str(e), "message": "Impossible de se connecter à la base de données"})


class GestionnaireConnexionBD(GestionnaireAPIBase):
    def post(self):
        donnees = self.obtenir_corps_json()
        url = donnees.get("url")
        if not url:
            journal.warning("[DB CONNECT] Requête 400 : Aucune URL de base de données fournie dans le corps JSON.")
            self.ecrire_json({"error": "URL de base de données requise"}, 400)
            return

        # Obscurcir l'URL pour les logs
        try:
            from urllib.parse import urlparse
            parse = urlparse(url)
            url_masquee = f"{parse.scheme}://{parse.username}:******@{parse.hostname}:{parse.port}{parse.path}"
        except Exception:
            url_masquee = "postgresql://******"

        journal.info(f"[DB CONNECT] Tentative de connexion à la base de données : {url_masquee}")

        try:
            connexion = psycopg2.connect(url)
            connexion.autocommit = False
            initialiser_bd(connexion)
            connexion.close()

            db.definir_url_bd(url)
            journal.info(f"[DB CONNECT] Connexion PostgreSQL réussie : {url_masquee}")
            self.ecrire_json({"ok": True, "message": "Liaison de données établie avec succès"})
        except Exception as e:
            journal.error(f"[DB CONNECT ERROR] Échec de connexion PostgreSQL ({url_masquee}) : {e}")
            self.ecrire_json({"error": f"Échec de connexion : {str(e)}"}, 400)


# ──────────────────────────────────────────────
# API – Recherche
# ──────────────────────────────────────────────
def _appliquer_filtre_recherche(req: str, mode_recherche: str, clauses_where: list, parametres_requete: list, champ_recherche: str = 'chemin_complet', utiliser_unaccent: bool = True):
    """
    Applique le filtrage de recherche.
    - champ_recherche : 'chemin_complet' (défaut) ou 'nom_fichier'
    - mode_recherche  : 'intelligent' (mots séparés) ou 'stricte' (chaîne exacte)
    - utiliser_unaccent : si False (fallback), utilise ILIKE standard sans la fonction SQL unaccent()
    """
    if not req:
        return

    # Validation du champ de recherche (sécurité : pas d'injection SQL)
    champ = 'chemin_complet' if champ_recherche != 'nom_fichier' else 'nom_fichier'
    fn_match = f"immutable_unaccent({champ}) ILIKE immutable_unaccent(%s)" if utiliser_unaccent else f"{champ} ILIKE %s"

    if mode_recherche == "stricte":
        clauses_where.append(fn_match)
        parametres_requete.append(f"%{req}%")
    else:
        # Mode intelligent : chaque mot de la requête doit être présent
        mots = [m.strip() for m in req.split() if m.strip()]
        if mots:
            for mot in mots:
                clauses_where.append(fn_match)
                parametres_requete.append(f"%{mot}%")


class GestionnaireRecherche(GestionnaireAPIBase):
    async def get(self):
        q               = self.get_query_argument("q", "").strip()
        search_mode     = self.get_query_argument("search_mode", "intelligent").strip()
        search_field    = self.get_query_argument("search_field", "chemin_complet").strip()
        liste_nas       = self.get_query_arguments("nas[]") + self.get_query_arguments("nas")
        liste_sources   = self.get_query_arguments("source[]") + self.get_query_arguments("source")
        liste_exts      = self.get_query_arguments("ext[]") + self.get_query_arguments("ext")
        vide            = self.get_query_argument("empty", "") == "true"
        trier_par       = self.get_query_argument("sort", "date_modification")
        ordre           = self.get_query_argument("order", "desc")
        depuis          = max(0, int(self.get_query_argument("from", 0)))
        taille_page     = min(100, max(1, int(self.get_query_argument("size", 20))))
        mode_date       = self.get_query_argument("date_mode", "")
        debut_date      = self.get_query_argument("date_start", "")
        fin_date        = self.get_query_argument("date_end", "")

        tags_bruts = self.get_query_arguments("tags")
        tags = []
        for t in tags_bruts:
            tags.extend([x.strip() for x in t.split(",") if x.strip()])

        carte_tri = {
            "date_modification": "date_modification",
            "taille": "taille",
            "nom_fichier.keyword": "nom_fichier",
            "nom_fichier": "nom_fichier",
            "extension": "extension",
            "nas_origine": "nas_origine"
        }
        champ_tri = carte_tri.get(trier_par, "date_modification")
        ordre_tri = "DESC" if ordre.lower() == "desc" else "ASC"

        def _construire_requete(avec_unaccent=True):
            clauses = []
            params = []
            _appliquer_filtre_recherche(q, search_mode, clauses, params, search_field, utiliser_unaccent=avec_unaccent)
            if liste_nas:
                clauses.append("nas = ANY(%s)")
                params.append(liste_nas)
            if liste_sources:
                clauses.append("nas_origine = ANY(%s)")
                params.append(liste_sources)
            if liste_exts:
                exts_normalisees = [e.lower().lstrip(".") for e in liste_exts if e]
                if exts_normalisees:
                    clauses.append("extension = ANY(%s)")
                    params.append(exts_normalisees)
            if vide:
                clauses.append("est_vide = TRUE")
            if tags:
                clauses.append("tags && %s")
                params.append(tags)
            if mode_date and (debut_date or fin_date):
                if mode_date == "after" and debut_date:
                    clauses.append("date_modification >= %s")
                    params.append(debut_date)
                elif mode_date == "before" and fin_date:
                    clauses.append("date_modification <= %s")
                    params.append(fin_date)
                elif mode_date == "between":
                    if debut_date:
                        clauses.append("date_modification >= %s")
                        params.append(debut_date)
                    if fin_date:
                        clauses.append("date_modification <= %s")
                        params.append(fin_date)
            w_sql = " AND ".join(clauses) if clauses else "TRUE"
            return w_sql, params

        def _effectuer_recherche():
            with db.obtenir_connexion_contexte() as connexion:
                where_sql, parametres_requete = _construire_requete(avec_unaccent=True)
                with connexion.cursor() as curseur:
                    try:
                        curseur.execute(f"SELECT COUNT(*) FROM files WHERE {where_sql}", parametres_requete)
                    except Exception:
                        connexion.rollback()
                        where_sql, parametres_requete = _construire_requete(avec_unaccent=False)
                        curseur.execute(f"SELECT COUNT(*) FROM files WHERE {where_sql}", parametres_requete)

                    total = curseur.fetchone()[0]

                    requete_enregistrements = f"""
                        SELECT id, nom_fichier, chemin_complet, taille, taille_lisible, extension, date_modification, nas_origine, est_vide, date_indexation, tags, nas
                        FROM files
                        WHERE {where_sql}
                        ORDER BY {champ_tri} {ordre_tri}
                        LIMIT %s OFFSET %s
                    """
                    curseur.execute(requete_enregistrements, parametres_requete + [taille_page, depuis])

                    resultats = []
                    for ligne in curseur.fetchall():
                        resultats.append({
                            "id": ligne[0],
                            "nom_fichier": ligne[1],
                            "chemin_complet": ligne[2],
                            "taille": ligne[3],
                            "taille_lisible": ligne[4],
                            "extension": ligne[5],
                            "date_modification": ligne[6].isoformat() if ligne[6] else None,
                            "nas_origine": ligne[7],
                            "est_vide": ligne[8],
                            "date_indexation": ligne[9].isoformat() if ligne[9] else None,
                            "tags": ligne[10] or [],
                            "nas": ligne[11]
                        })

                    return {
                        "total": total,
                        "results": resultats,
                        "from": depuis,
                        "size": taille_page
                    }

        try:
            donnees_recherche = await self.executer_db(_effectuer_recherche)
            self.ecrire_json(donnees_recherche)
        except Exception as e:
            self.ecrire_json({"error": str(e)}, 500)
        except Exception as e:
            self.ecrire_json({"error": str(e)}, 500)


# ──────────────────────────────────────────────
# API – Statistiques globales
# ──────────────────────────────────────────────
class GestionnaireStatistiques(GestionnaireAPIBase):
    async def get(self):
        def _recuperer_stats():
            with db.obtenir_connexion_contexte() as connexion:
                with connexion.cursor() as curseur:
                    curseur.execute("SELECT COUNT(*), COALESCE(SUM(taille), 0) FROM files")
                    fichiers_totaux, taille_totale = curseur.fetchone()

                    curseur.execute("SELECT COUNT(*) FROM files WHERE est_vide = TRUE")
                    fichiers_vides = curseur.fetchone()[0]

                    curseur.execute("""
                        SELECT extension, COUNT(*), COALESCE(SUM(taille), 0)
                        FROM files
                        GROUP BY extension
                        ORDER BY COUNT(*) DESC
                        LIMIT 10
                    """)
                    extensions = [
                        {"key": r[0] if r[0] else "sans_extension", "count": r[1], "size": int(r[2])}
                        for r in curseur.fetchall()
                    ]

                    curseur.execute("""
                        SELECT COALESCE(nas || ' / ' || nas_origine, nas_origine), COUNT(*), COALESCE(SUM(taille), 0)
                        FROM files
                        GROUP BY nas, nas_origine
                        ORDER BY COUNT(*) DESC
                        LIMIT 20
                    """)
                    sources_nas = [
                        {"key": r[0], "count": r[1], "size": int(r[2])}
                        for r in curseur.fetchall()
                    ]

                    curseur.execute("""
                        SELECT nom_fichier, date_modification, nas, nas_origine
                        FROM files
                        ORDER BY date_modification DESC
                        LIMIT 1
                    """)
                    derniere_ligne = curseur.fetchone()
                    dernier_fichier = None
                    if derniere_ligne:
                        dernier_fichier = {
                            "nom_fichier": derniere_ligne[0],
                            "date_modification": derniere_ligne[1].isoformat(),
                            "nas": derniere_ligne[2],
                            "nas_origine": derniere_ligne[3]
                        }

                return {
                    "total_files": fichiers_totaux,
                    "total_size": int(taille_totale),
                    "empty_files": fichiers_vides,
                    "top_extensions": extensions,
                    "by_nas": sources_nas,
                    "latest_file": dernier_fichier
                }

        try:
            stats = await self.executer_db(_recuperer_stats)
            self.ecrire_json(stats)
        except Exception as e:
            self.ecrire_json({"error": str(e)}, 500)


# ──────────────────────────────────────────────
# API – Cache (Scan Incrémental)
# ──────────────────────────────────────────────
class GestionnaireStatistiquesCache(GestionnaireAPIBase):
    def get(self):
        try:
            with db.obtenir_connexion_contexte() as connexion:
                with connexion.cursor() as curseur:
                    curseur.execute("SELECT COUNT(*) FROM files")
                    total_en_cache = curseur.fetchone()[0]

                    curseur.execute("SELECT MAX(last_seen) FROM files")
                    dt_derniere_exec = curseur.fetchone()[0]
                    derniere_exec = dt_derniere_exec.isoformat() if dt_derniere_exec else None

                    curseur.execute("SELECT nas_origine, COUNT(*), MAX(last_seen) FROM files GROUP BY nas_origine")
                    sources = {}
                    for ligne in curseur.fetchall():
                        sources[ligne[0]] = {
                            "cached": ligne[1],
                            "last_seen": ligne[2].isoformat() if ligne[2] else None
                        }

            self.ecrire_json({
                "total_cached": total_en_cache,
                "db_size_bytes": 0,
                "last_run": derniere_exec,
                "sources": sources
            })
        except Exception as e:
            self.ecrire_json({"error": str(e)}, 500)


# ──────────────────────────────────────────────
# API – Sources disponibles
# ──────────────────────────────────────────────
class GestionnaireSources(GestionnaireAPIBase):
    def get(self):
        try:
            with db.obtenir_connexion_contexte() as connexion:
                liste_sources = db.obtenir_toutes_sources(connexion)
            liste_nas = sorted(list(set(src["nas"] for src in liste_sources if src["nas"])))
            liste_etiquettes = sorted(list(set(src["label"] for src in liste_sources if src["label"])))
            self.ecrire_json({
                "sources": liste_etiquettes,
                "nas_list": liste_nas,
                "label_list": liste_etiquettes
            })
        except Exception as e:
            self.ecrire_json({"error": str(e)}, 500)


class GestionnaireDetailsSources(GestionnaireAPIBase):
    def get(self):
        try:
            with db.obtenir_connexion_contexte() as connexion:
                liste_sources = db.obtenir_toutes_sources(connexion)
            self.ecrire_json({"sources": liste_sources})
        except Exception as e:
            self.ecrire_json({"error": str(e)}, 500)


# ──────────────────────────────────────────────
# API – Fichiers les plus volumineux
# ──────────────────────────────────────────────
class GestionnaireFichiersLourds(GestionnaireAPIBase):
    def get(self):
        n = min(50, max(1, int(self.get_query_argument("n", 10))))
        liste_nas = self.get_query_arguments("nas[]") + self.get_query_arguments("nas")
        sources = self.get_query_arguments("source[]") + self.get_query_arguments("source")

        clauses_filtre = []
        parametres_requete = []
        if liste_nas:
            clauses_filtre.append("nas = ANY(%s)")
            parametres_requete.append(liste_nas)
        if sources:
            clauses_filtre.append("nas_origine = ANY(%s)")
            parametres_requete.append(sources)

        where_sql = " AND ".join(clauses_filtre) if clauses_filtre else "TRUE"

        requete = f"""
            SELECT id, nom_fichier, chemin_complet, taille, extension, nas_origine, date_modification, tags, nas
            FROM files
            WHERE {where_sql}
            ORDER BY taille DESC
            LIMIT %s
        """

        try:
            with db.obtenir_connexion_contexte() as connexion:
                with connexion.cursor() as curseur:
                    curseur.execute(requete, parametres_requete + [n])
                    resultats = []
                    for ligne in curseur.fetchall():
                        resultats.append({
                            "id": ligne[0],
                            "nom_fichier": ligne[1],
                            "chemin_complet": ligne[2],
                            "taille": ligne[3],
                            "extension": ligne[4],
                            "nas_origine": ligne[5],
                            "date_modification": ligne[6].isoformat() if ligne[6] else None,
                            "tags": ligne[7] or [],
                            "nas": ligne[8]
                        })
            self.ecrire_json({"results": resultats})
        except Exception as e:
            self.ecrire_json({"error": str(e)}, 500)


# ──────────────────────────────────────────────
# API – Export CSV
# ──────────────────────────────────────────────
def _taille_humaine(octets):
    """Convertit des octets en taille lisible."""
    try:
        octets = float(octets)
    except (TypeError, ValueError):
        return ""
    if octets >= 1e12: return f"{octets/1e12:.2f} To"
    if octets >= 1e9:  return f"{octets/1e9:.2f} Go"
    if octets >= 1e6:  return f"{octets/1e6:.1f} Mo"
    if octets >= 1e3:  return f"{octets/1e3:.0f} Ko"
    return f"{octets:.0f} o"


class GestionnaireExportCSV(tornado.web.RequestHandler):
    def get(self):
        q               = self.get_query_argument("q", "").strip()
        search_mode     = self.get_query_argument("search_mode", "intelligent").strip()
        liste_nas       = self.get_query_arguments("nas[]") + self.get_query_arguments("nas")
        sources         = self.get_query_arguments("source[]") + self.get_query_arguments("source")
        exts            = self.get_query_arguments("ext[]") + self.get_query_arguments("ext")
        empty           = self.get_query_argument("empty", "") == "true"
        sort_by         = self.get_query_argument("sort", "date_modification")
        order           = self.get_query_argument("order", "desc")
        date_mode       = self.get_query_argument("date_mode", "")
        date_start      = self.get_query_argument("date_start", "")
        date_end        = self.get_query_argument("date_end", "")

        tags_bruts = self.get_query_arguments("tags")
        tags = []
        for t in tags_bruts:
            tags.extend([x.strip() for x in t.split(",") if x.strip()])

        clauses_where = []
        parametres_requete = []

        _appliquer_filtre_recherche(q, search_mode, clauses_where, parametres_requete)
        if liste_nas:
            clauses_where.append("nas = ANY(%s)")
            parametres_requete.append(liste_nas)
        if sources:
            clauses_where.append("nas_origine = ANY(%s)")
            parametres_requete.append(sources)
        if exts:
            exts_normalisees = [e.lower().lstrip(".") for e in exts if e]
            if exts_normalisees:
                clauses_where.append("extension = ANY(%s)")
                parametres_requete.append(exts_normalisees)
        if empty:
            clauses_where.append("est_vide = TRUE")
        if tags:
            clauses_where.append("tags && %s")
            parametres_requete.append(tags)

        if date_mode and (date_start or date_end):
            if date_mode == "after" and date_start:
                clauses_where.append("date_modification >= %s")
                parametres_requete.append(date_start)
            elif date_mode == "before" and date_end:
                clauses_where.append("date_modification <= %s")
                parametres_requete.append(date_end)
            elif date_mode == "between":
                if date_start:
                    clauses_where.append("date_modification >= %s")
                    parametres_requete.append(date_start)
                if date_end:
                    clauses_where.append("date_modification <= %s")
                    parametres_requete.append(date_end)

        carte_tri = {
            "date_modification": "date_modification",
            "taille": "taille",
            "nom_fichier.keyword": "nom_fichier",
            "nom_fichier": "nom_fichier",
            "extension": "extension",
            "nas_origine": "nas_origine"
        }
        champ_tri = carte_tri.get(sort_by, "date_modification")
        ordre_tri = "DESC" if order.lower() == "desc" else "ASC"

        where_sql = " AND ".join(clauses_where) if clauses_where else "TRUE"

        requete = f"""
            SELECT nom_fichier, chemin_complet, taille, extension, date_modification, date_indexation, nas_origine, tags, est_vide, nas
            FROM files
            WHERE {where_sql}
            ORDER BY {champ_tri} {ordre_tri}
            LIMIT 50000
        """

        try:
            self.set_header("Content-Type", "text/csv")
            nom_fichier_export = f"export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            self.set_header("Content-Disposition", f'attachment; filename="{nom_fichier_export}"')

            sortie = io.StringIO()
            ecrivain = csv.writer(sortie)

            en_tetes = [
                "nom_fichier", "chemin_complet", "taille_octets", "taille_lisible",
                "extension", "date_modification", "date_indexation",
                "nas", "nas_origine", "tags", "est_vide"
            ]
            ecrivain.writerow(en_tetes)
            self.write(sortie.getvalue())
            self.flush()

            connexion = obtenir_connexion_bd()
            with connexion.cursor(name="curseur_flux_csv") as curseur:
                curseur.execute(requete, parametres_requete)
                while True:
                    lignes = curseur.fetchmany(1000)
                    if not lignes:
                        break
                    sortie = io.StringIO()
                    ecrivain = csv.writer(sortie)
                    for r in lignes:
                        tags_valeur = ", ".join(r[7] or [])
                        ligne = [
                            r[0], r[1], r[2], _taille_humaine(r[2]),
                            r[3],
                            r[4].isoformat() if r[4] else "",
                            r[5].isoformat() if r[5] else "",
                            r[9], # nas
                            r[6], # nas_origine
                            tags_valeur, r[8]
                        ]
                        ecrivain.writerow(ligne)
                    self.write(sortie.getvalue())
                    self.flush()
            connexion.close()
        except Exception as e:
            journal.error(f"Erreur d'export CSV : {e}")


class GestionnaireDistributionAge(GestionnaireAPIBase):
    def get(self):
        grouper_par = self.get_query_argument("group_by", "")
        liste_nas = self.get_query_arguments("nas[]") + self.get_query_arguments("nas")
        sources = self.get_query_arguments("source[]") + self.get_query_arguments("source")

        colonne_groupe = None
        if grouper_par == "extension":
            colonne_groupe = "extension"
        elif grouper_par == "nas":
            colonne_groupe = "nas"
        elif grouper_par == "label":
            colonne_groupe = "nas_origine"

        clauses_where = []
        parametres_requete = []
        if liste_nas:
            clauses_where.append("nas = ANY(%s)")
            parametres_requete.append(liste_nas)
        if sources:
            clauses_where.append("nas_origine = ANY(%s)")
            parametres_requete.append(sources)

        where_sql = " AND ".join(clauses_where) if clauses_where else "TRUE"

        try:
            modifications = []
            creations = []

            with db.obtenir_connexion_contexte() as connexion:
                with connexion.cursor() as curseur:
                    if colonne_groupe:
                        curseur.execute(f"""
                            SELECT TO_CHAR(date_modification, 'YYYY-MM') AS mois_str, COALESCE({colonne_groupe}, 'inconnu') AS grp, COUNT(*), COALESCE(SUM(taille), 0)
                            FROM files
                            WHERE {where_sql}
                            GROUP BY mois_str, grp
                            ORDER BY mois_str
                        """, parametres_requete)
                        for ligne in curseur.fetchall():
                            modifications.append({
                                "date": ligne[0],
                                "group": ligne[1],
                                "count": ligne[2],
                                "size": int(ligne[3])
                            })

                        curseur.execute(f"""
                            SELECT TO_CHAR(COALESCE(date_creation, date_modification), 'YYYY-MM') AS mois_str, COALESCE({colonne_groupe}, 'inconnu') AS grp, COUNT(*), COALESCE(SUM(taille), 0)
                            FROM files
                            WHERE {where_sql}
                            GROUP BY mois_str, grp
                            ORDER BY mois_str
                        """, parametres_requete)
                        for ligne in curseur.fetchall():
                            creations.append({
                                "date": ligne[0],
                                "group": ligne[1],
                                "count": ligne[2],
                                "size": int(ligne[3])
                            })
                    else:
                        curseur.execute(f"""
                            SELECT TO_CHAR(date_modification, 'YYYY-MM') AS mois_str, COUNT(*), COALESCE(SUM(taille), 0)
                            FROM files
                            WHERE {where_sql}
                            GROUP BY mois_str
                            ORDER BY mois_str
                        """, parametres_requete)
                        for ligne in curseur.fetchall():
                            modifications.append({
                                "date": ligne[0],
                                "count": ligne[1],
                                "size": int(ligne[2])
                            })

                        curseur.execute(f"""
                            SELECT TO_CHAR(COALESCE(date_creation, date_modification), 'YYYY-MM') AS mois_str, COUNT(*), COALESCE(SUM(taille), 0)
                            FROM files
                            WHERE {where_sql}
                            GROUP BY mois_str
                            ORDER BY mois_str
                        """, parametres_requete)
                        for ligne in curseur.fetchall():
                            creations.append({
                                "date": ligne[0],
                                "count": ligne[1],
                                "size": int(ligne[2])
                            })

            self.ecrire_json({
                "modifications": modifications,
                "creations": creations
            })
        except Exception as e:
            self.ecrire_json({"error": str(e)}, 500)


# ──────────────────────────────────────────────
# API – Tags
# ──────────────────────────────────────────────
class GestionnaireMiseAJourTags(GestionnaireAPIBase):
    def post(self):
        donnees = self.obtenir_corps_json()
        file_id = donnees.get("file_id")
        tags    = donnees.get("tags", [])
        if not file_id:
            self.ecrire_json({"error": "file_id requis"}, 400)
            return

        try:
            with db.obtenir_connexion_contexte() as connexion:
                with connexion.cursor() as curseur:
                    curseur.execute("UPDATE files SET tags = %s WHERE id = %s", (tags, file_id))
                    connexion.commit()
            self.ecrire_json({"ok": True, "file_id": file_id, "tags": tags})
        except Exception as e:
            self.ecrire_json({"error": str(e)}, 500)


class GestionnaireListeTags(GestionnaireAPIBase):
    def get(self):
        try:
            with db.obtenir_connexion_contexte() as connexion:
                with connexion.cursor() as curseur:
                    curseur.execute("SELECT DISTINCT unnest(tags) as tag FROM files ORDER BY tag")
                    tags = [ligne[0] for ligne in curseur.fetchall()]
            self.ecrire_json({"tags": tags})
        except Exception as e:
            self.ecrire_json({"error": str(e)}, 500)


# ──────────────────────────────────────────────
# API – Liste des extensions indexées
# ──────────────────────────────────────────────
class GestionnaireListeExtensions(GestionnaireAPIBase):
    def get(self):
        """
        Retourne la liste des extensions présentes en base avec leur nombre de fichiers.
        Utilise l'index (nom_fichier, extension, nas, nas_origine) — requête très rapide.
        """
        try:
            with db.obtenir_connexion_contexte() as connexion:
                with connexion.cursor() as curseur:
                    curseur.execute("""
                        SELECT extension, COUNT(*) as cnt
                        FROM files
                        WHERE extension IS NOT NULL AND extension != ''
                        GROUP BY extension
                        ORDER BY cnt DESC
                        LIMIT 100
                    """)
                    extensions = [{"ext": ligne[0], "count": ligne[1]} for ligne in curseur.fetchall()]
            self.ecrire_json({"extensions": extensions})
        except Exception as e:
            self.ecrire_json({"error": str(e)}, 500)


# ──────────────────────────────────────────────
# API – Statut de Scan & Verrou par NAS
# ──────────────────────────────────────────────
# Verrou global protégeant l'accès au dictionnaire scans_par_nas
_verrou_scans = threading.Lock()

# Dictionnaire : nas (str) → { "status", "label", "debut", "fichiers" }
# Clé présente   = scan en cours sur ce NAS
# Clé absente    = NAS libre
_scans_par_nas: dict = {}


class GestionnaireStatutScan(GestionnaireAPIBase):
    """GET /api/scan/status?nas=<nas>
    Retourne le statut global ou celui d'un NAS précis.
    """
    def get(self):
        nas = self.get_query_argument("nas", "").strip()
        with _verrou_scans:
            if nas:
                info = _scans_par_nas.get(nas)
                if info:
                    self.ecrire_json({
                        "status": "running",
                        "nas": nas,
                        "label": info.get("label"),
                        "debut": info.get("debut"),
                        "fichiers": info.get("fichiers", 0),
                        "message": f"Scan en cours sur '{nas}' (cellule : {info.get('label')})."
                    })
                else:
                    self.ecrire_json({"status": "idle", "nas": nas})
            else:
                # Retourne tous les NAS actuellement en cours de scan
                self.ecrire_json({
                    "status": "running" if _scans_par_nas else "idle",
                    "scans_actifs": [
                        {"nas": k, "label": v.get("label"), "debut": v.get("debut"),
                         "fichiers": v.get("fichiers", 0)}
                        for k, v in _scans_par_nas.items()
                    ]
                })


class GestionnaireVerrouScan(GestionnaireAPIBase):
    """GET /api/scan/lock-status?nas=<nas>
    Endpoint léger appelé par le frontend avant de démarrer un scan.
    Retourne {"locked": bool, "info": {...}} sans modifier l'état.
    """
    def get(self):
        nas = self.get_query_argument("nas", "").strip()
        if not nas:
            self.ecrire_json({"error": "Paramètre 'nas' requis."}, 400)
            return
        with _verrou_scans:
            info = _scans_par_nas.get(nas)
            if info:
                self.ecrire_json({
                    "locked": True,
                    "nas": nas,
                    "label": info.get("label"),
                    "debut": info.get("debut"),
                    "fichiers": info.get("fichiers", 0),
                    "message": (
                        f"Ce NAS est déjà en cours d'indexation "
                        f"(cellule : {info.get('label')}, "
                        f"démarrée le {info.get('debut')})."
                    )
                })
            else:
                self.ecrire_json({"locked": False, "nas": nas})


# ──────────────────────────────────────────────
# API – Mode Nettoyage
# ──────────────────────────────────────────────
class GestionnaireScanNettoyage(GestionnaireAPIBase):
    def post(self):
        try:
            donnees = self.obtenir_corps_json()
            annees = int(donnees.get("years", 2))
            nas = donnees.get("nas", [])
            etiquettes = donnees.get("labels", [])
            if not isinstance(nas, list):
                nas = []
            if not isinstance(etiquettes, list):
                etiquettes = []
        except Exception:
            annees = 2
            nas = []
            etiquettes = []

        date_limite = datetime.now() - timedelta(days=annees * 365)

        clauses_filtre = []
        parametres_requete = []
        if nas:
            clauses_filtre.append("nas = ANY(%s)")
            parametres_requete.append(nas)
        if etiquettes:
            clauses_filtre.append("nas_origine = ANY(%s)")
            parametres_requete.append(etiquettes)

        clause_nas = " AND " + " AND ".join(clauses_filtre) if clauses_filtre else ""

        try:
            with db.obtenir_connexion_contexte() as connexion:
                with connexion.cursor() as curseur:
                    # 1. Fichiers vides
                    requete_vides = f"""
                        SELECT chemin_complet, taille, extension, date_modification, nas_origine
                        FROM files
                        WHERE taille = 0 {clause_nas}
                        ORDER BY date_modification DESC
                        LIMIT 1000
                    """
                    curseur.execute(requete_vides, parametres_requete)
                    fichiers_vides = []
                    for ligne in curseur.fetchall():
                        fichiers_vides.append({
                            "chemin": ligne[0],
                            "taille": ligne[1],
                            "extension": ligne[2],
                            "date_modification": ligne[3].isoformat() if ligne[3] else None,
                            "nas_origine": ligne[4]
                        })

                    # 2. Doublons (Regroupement taille + nom de fichier)
                    requete_doublons = f"""
                        WITH dups AS (
                            SELECT nom_fichier, taille
                            FROM files
                            WHERE taille > 0 {clause_nas}
                            GROUP BY nom_fichier, taille
                            HAVING COUNT(*) > 1
                            ORDER BY taille DESC
                            LIMIT 100
                        )
                        SELECT f.chemin_complet, f.taille, f.extension, f.date_modification, f.nas_origine, f.nom_fichier
                        FROM files f
                        JOIN dups d ON f.nom_fichier = d.nom_fichier AND f.taille = d.taille
                        WHERE 1=1 {clause_nas.replace("nas_origine", "f.nas_origine").replace("nas = ", "f.nas = ")}
                        ORDER BY f.taille DESC, f.nom_fichier, f.chemin_complet
                    """
                    curseur.execute(requete_doublons, parametres_requete + parametres_requete)
                    
                    groupes_doublons = {}
                    total_fichiers_doublons = 0
                    taille_totale_doublons = 0
                    for ligne in curseur.fetchall():
                        chemin, taille, ext, mtime, nom_nas, nom = ligne
                        cle = f"{nom} ({_taille_humaine(taille)})"
                        if cle not in groupes_doublons:
                            groupes_doublons[cle] = {
                                "key": cle,
                                "count": 0,
                                "files": []
                            }
                        groupes_doublons[cle]["count"] += 1
                        groupes_doublons[cle]["files"].append({
                            "chemin": chemin,
                            "taille": taille,
                            "extension": ext,
                            "date_modification": mtime.isoformat() if mtime else None,
                            "nas_origine": nom_nas
                        })
                        total_fichiers_doublons += 1

                    # Espace récupérable
                    for g in groupes_doublons.values():
                        if g["count"] > 1:
                            taille_groupe = g["files"][0]["taille"]
                            taille_totale_doublons += taille_groupe * (g["count"] - 1)

                    # 3. Extensions parasites
                    exts_parasites = ('tmp', 'temp', 'bak', 'log', 'old', 'db', 'ds_store')
                    requete_parasites = f"""
                        SELECT chemin_complet, taille, extension, date_modification, nas_origine
                        FROM files
                        WHERE LOWER(extension) IN %s {clause_nas}
                        ORDER BY taille DESC
                        LIMIT 1000
                    """
                    curseur.execute(requete_parasites, (exts_parasites,) + tuple(parametres_requete))
                    fichiers_parasites = []
                    taille_parasites = 0
                    for ligne in curseur.fetchall():
                        fichiers_parasites.append({
                            "chemin": ligne[0],
                            "taille": ligne[1],
                            "extension": ligne[2],
                            "date_modification": ligne[3].isoformat() if ligne[3] else None,
                            "nas_origine": ligne[4]
                        })
                        taille_parasites += ligne[1]

                    # 4. Fichiers anciens
                    requete_anciens = f"""
                        SELECT chemin_complet, taille, extension, date_modification, nas_origine
                        FROM files
                        WHERE date_modification < %s {clause_nas}
                        ORDER BY date_modification ASC
                        LIMIT 1000
                    """
                    curseur.execute(requete_anciens, [date_limite] + parametres_requete)
                    fichiers_anciens = []
                    taille_anciens = 0
                    for ligne in curseur.fetchall():
                        fichiers_anciens.append({
                            "chemin": ligne[0],
                            "taille": ligne[1],
                            "extension": ligne[2],
                            "date_modification": ligne[3].isoformat() if ligne[3] else None,
                            "nas_origine": ligne[4]
                        })
                        taille_anciens += ligne[1]

                    # 5. Très petits fichiers
                    requete_petits = f"""
                        SELECT chemin_complet, taille, extension, date_modification, nas_origine
                        FROM files
                        WHERE taille > 0 AND taille <= 100 {clause_nas}
                        ORDER BY taille ASC
                        LIMIT 1000
                    """
                    curseur.execute(requete_petits, parametres_requete)
                    fichiers_petits = []
                    taille_petits = 0
                    for ligne in curseur.fetchall():
                        fichiers_petits.append({
                            "chemin": ligne[0],
                            "taille": ligne[1],
                            "extension": ligne[2],
                            "date_modification": ligne[3].isoformat() if ligne[3] else None,
                            "nas_origine": ligne[4]
                        })
                        taille_petits += ligne[1]

            candidats_totaux = len(fichiers_vides) + total_fichiers_doublons + len(fichiers_parasites) + len(fichiers_anciens) + len(fichiers_petits)

            donnees_reponse = {
                "summary": {
                    "total_candidates": candidats_totaux
                },
                "categories": {
                    "fichiers_vides": {
                        "count": len(fichiers_vides),
                        "total_size_bytes": 0,
                        "files": fichiers_vides
                    },
                    "doublons": {
                        "count": total_fichiers_doublons,
                        "total_size_bytes": taille_totale_doublons,
                        "groups": list(groupes_doublons.values())
                    },
                    "extensions_parasites": {
                        "count": len(fichiers_parasites),
                        "total_size_bytes": taille_parasites,
                        "files": fichiers_parasites
                    },
                    "non_modifies_anciens": {
                        "count": len(fichiers_anciens),
                        "total_size_bytes": taille_anciens,
                        "files": fichiers_anciens
                    },
                    "tres_petits": {
                        "count": len(fichiers_petits),
                        "total_size_bytes": taille_petits,
                        "files": fichiers_petits
                    }
                }
            }
            self.ecrire_json(donnees_reponse)

        except Exception as e:
            self.ecrire_json({"error": f"Erreur d'analyse de nettoyage : {str(e)}"}, 500)


# ──────────────────────────────────────────────
# API – Arborescence
# ──────────────────────────────────────────────
class GestionnaireArborescence(GestionnaireAPIBase):
    async def get(self):
        nas = self.get_query_argument("nas", "defaut")
        source = self.get_query_argument("source", self.get_query_argument("label", "")).strip()
        chemin_brut = self.get_query_argument("path", "").strip()

        def _obtenir_arborescence():
            with db.obtenir_connexion_contexte() as connexion:
                with connexion.cursor() as curseur:

                    # Clause SQL de filtrage par NAS et optionnellement par Source (Cellule)
                    clause_nas = "nas = %s"
                    params_nas = [nas]
                    if source:
                        clause_nas += " AND nas_origine = %s"
                        params_nas.append(source)

                    # 1. CAS RACINE (path est vide) : Trouver les éléments de premier niveau (lecteurs / dossiers racines / fichiers)
                    if not chemin_brut:
                        curseur.execute(f"""
                            SELECT 
                                split_part(replace(chemin_complet, '/', '\\'), '\\', 1) AS nom_racine,
                                position('\\' in replace(chemin_complet, '/', '\\')) AS a_sous_dossiers,
                                nas_origine
                            FROM files 
                            WHERE {clause_nas}
                            GROUP BY 1, 2, 3
                        """, params_nas)
                        
                        racines = curseur.fetchall()
                        enfants = []
                        
                        for nom_rac, a_sep, nas_orig in racines:
                            if not nom_rac:
                                continue
                            path_racine = nom_rac + '\\' if nom_rac.endswith(':') else nom_rac
                            
                            if a_sep > 0:
                                enfants.append({
                                    "name": nom_rac,
                                    "path": path_racine,
                                    "type": "folder",
                                    "nas": nas,
                                    "nas_origine": nas_orig or source or "Toutes"
                                })
                            else:
                                curseur.execute(f"""
                                    SELECT id, nom_fichier, chemin_complet, taille, extension, date_modification, tags, est_vide, date_indexation, nas_origine
                                    FROM files WHERE {clause_nas} AND (nom_fichier = %s OR chemin_complet = %s)
                                """, params_nas + [nom_rac, nom_rac])
                                ligne = curseur.fetchone()
                                if ligne:
                                    enfants.append({
                                        "id": ligne[0],
                                        "name": ligne[1],
                                        "path": ligne[2],
                                        "type": "file",
                                        "size": ligne[3],
                                        "extension": ligne[4],
                                        "date_modification": ligne[5].isoformat() if ligne[5] else None,
                                        "tags": ligne[6] or [],
                                        "est_vide": ligne[7],
                                        "date_indexation": ligne[8].isoformat() if ligne[8] else None,
                                        "nas_origine": ligne[9],
                                        "nas": nas
                                    })
                                else:
                                    enfants.append({
                                        "name": nom_rac,
                                        "path": path_racine,
                                        "type": "folder",
                                        "nas": nas,
                                        "nas_origine": nas_orig or source or "Toutes"
                                    })

                        vu = set()
                        enfants_dedup = []
                        for ef in enfants:
                            if ef["path"] not in vu:
                                vu.add(ef["path"])
                                enfants_dedup.append(ef)

                        return {"path": "", "parent": None, "children": enfants_dedup}

                    # 2. CAS SOUS-DOSSIER (path spécifié)
                    # Normalisation cross-platform : le serveur tourne sur Linux (Docker),
                    # donc os.sep = '/'. On prépare les chemins dans les deux formats.
                    chemin_norm_back = chemin_brut.replace('/', '\\')
                    chemin_norm_fwd  = chemin_brut.replace('\\', '/')
                    # Sans séparateur final
                    chemin_sans_sep_back = chemin_norm_back.rstrip('\\')
                    chemin_sans_sep_fwd  = chemin_norm_fwd.rstrip('/')
                    # Avec séparateur final
                    chemin_avec_sep_back = chemin_sans_sep_back + '\\'
                    chemin_avec_sep_fwd  = chemin_sans_sep_fwd  + '/'

                    # A. Fichiers ENFANTS DIRECTS — on compare dossier_parent avec les 4 variantes
                    # pour être insensible au séparateur quel que soit l'OS du serveur.
                    requete_fichiers = f"""
                        SELECT id, nom_fichier, chemin_complet, taille, extension, date_modification, tags, est_vide, date_indexation, nas_origine
                        FROM files
                        WHERE {clause_nas}
                          AND (
                            dossier_parent = %s OR dossier_parent = %s OR
                            dossier_parent = %s OR dossier_parent = %s OR
                            replace(dossier_parent, '/', '\\') = %s OR
                            replace(dossier_parent, '\\', '/') = %s
                          )
                        ORDER BY nom_fichier ASC
                    """
                    curseur.execute(requete_fichiers, params_nas + [
                        chemin_sans_sep_back, chemin_avec_sep_back,
                        chemin_sans_sep_fwd,  chemin_avec_sep_fwd,
                        chemin_sans_sep_back,  chemin_sans_sep_fwd
                    ])
                    
                    fichiers = []
                    chemins_fichiers_directs = set()
                    for ligne in curseur.fetchall():
                        fichiers.append({
                            "id": ligne[0],
                            "name": ligne[1],
                            "path": ligne[2],
                            "type": "file",
                            "size": ligne[3],
                            "extension": ligne[4],
                            "date_modification": ligne[5].isoformat() if ligne[5] else None,
                            "tags": ligne[6] or [],
                            "est_vide": ligne[7],
                            "date_indexation": ligne[8].isoformat() if ligne[8] else None,
                            "nas_origine": ligne[9],
                            "nas": nas
                        })
                        # Normaliser avec les deux formes pour la déduplication avec les sous-dossiers
                        p = ligne[2].replace('\\', '/')
                        chemins_fichiers_directs.add(p)
                        chemins_fichiers_directs.add(p.replace('/', '\\'))

                    # B. Sous-dossiers ENFANTS DIRECTS
                    # On normalise les chemins en slash-forward pour harmoniser Windows/Linux.
                    # IMPORTANT : +1 car PostgreSQL substring(str FROM n) est 1-indexé.
                    # len() compte le slash final comme dernier caractère (position N),
                    # on veut commencer APRÈS ce slash → position N+1.
                    # Le backslash est passé en paramètre (%s) pour un échappement sûr via psycopg2.
                    len_prefix_fwd = len(chemin_avec_sep_fwd) + 1
                    requete_sous_dossiers = f"""
                        SELECT 
                            split_part(
                                substring(replace(chemin_complet, %s, '/') FROM %s),
                                '/', 1
                            ) AS nom_sous_dossier,
                            MIN(nas_origine) AS nas_origine
                        FROM files
                        WHERE {clause_nas}
                          AND (
                            replace(chemin_complet, %s, '/') LIKE %s OR
                            replace(chemin_complet, '/', %s) LIKE %s
                          )
                        GROUP BY 1
                    """
                    curseur.execute(
                        requete_sous_dossiers,
                        ['\\', len_prefix_fwd]
                        + params_nas
                        + ['\\', chemin_avec_sep_fwd + '%', '\\', chemin_avec_sep_back + '%']
                    )
                    
                    sous_dossiers = []
                    vu_sd = set()
                    for ligne in curseur.fetchall():
                        nom_sd = ligne[0]
                        nas_orig = ligne[1]
                        if not nom_sd:
                            continue
                        # Construire le chemin du sous-dossier avec slash forward (plus universel)
                        chemin_sd = chemin_sans_sep_fwd + '/' + nom_sd
                        norm_key = chemin_sd.lower()
                        if norm_key in vu_sd or chemin_sd in chemins_fichiers_directs or chemin_sd.replace('/', '\\') in chemins_fichiers_directs:
                            continue
                        vu_sd.add(norm_key)
                        sous_dossiers.append({
                            "name": nom_sd,
                            "path": chemin_sd,
                            "type": "folder",
                            "nas": nas,
                            "nas_origine": nas_orig or source or "Toutes"
                        })

                    sous_dossiers.sort(key=lambda x: x["name"].lower())
                    enfants_tous = sous_dossiers + fichiers

                    dossier_parent_nav = chemin_sans_sep_fwd.rsplit('/', 1)[0] if '/' in chemin_sans_sep_fwd else (
                        chemin_sans_sep_back.rsplit('\\', 1)[0] if '\\' in chemin_sans_sep_back else None
                    )
                    if not dossier_parent_nav:
                        dossier_parent_nav = None

                    return {
                        "path": chemin_brut,
                        "parent": dossier_parent_nav,
                        "children": enfants_tous
                    }

        try:
            res = await self.executer_db(_obtenir_arborescence)
            self.ecrire_json(res)
        except Exception as e:
            journal.error(f"Erreur arborescence : {e}")
            self.ecrire_json({"error": str(e)}, 500)








# ──────────────────────────────────────────────
# API – Import et Scan de Métadonnées (Client Natif .exe & Export JSON)
# ──────────────────────────────────────────────
class GestionnaireScanExterne(GestionnaireAPIBase):
    async def post(self):
        donnees = self.obtenir_corps_json()
        nas = donnees.get("nas", "defaut").strip()
        etiquette = donnees.get("label", "").strip()
        fichiers = donnees.get("files", [])
        is_last_chunk = donnees.get("is_last_chunk", True)
        is_first_chunk = donnees.get("is_first_chunk", False)
        scanned_root_path = donnees.get("scanned_root_path", "").strip()

        if not etiquette or not nas:
            self.ecrire_json({"error": "Le nom de l'EDS et le nom de la Cellule sont requis."}, 400)
            return

        if not fichiers:
            self.ecrire_json({"error": "Aucun fichier reçu dans la sélection."}, 400)
            return

        # ── Verrou par NAS (premier lot uniquement) ──────────────────────────
        if is_first_chunk:
            with _verrou_scans:
                if nas in _scans_par_nas:
                    info = _scans_par_nas[nas]
                    msg = (
                        f"Ce NAS est déjà en cours d'indexation par une autre session "
                        f"(cellule : {info.get('label')}, démarrée le {info.get('debut')}). "
                        f"Veuillez patienter la fin du scan en cours avant de relancer."
                    )
                    journal.warning(f"[VERROU NAS] Tentative de scan concurrent refusée sur '{nas}' (cellule: {etiquette})")
                    self.ecrire_json({"error": msg, "locked": True}, 409)
                    return
                # NAS libre → on l'enregistre
                _scans_par_nas[nas] = {
                    "label": etiquette,
                    "debut": datetime.now().isoformat(timespec="seconds"),
                    "fichiers": 0,
                    "seen_ids": set()
                }
                journal.info(f"[VERROU NAS] Verrou acquis sur '{nas}' (cellule: {etiquette})")

        debut_scan_iso = None
        liste_seen_ids = None
        with _verrou_scans:
            if nas in _scans_par_nas:
                debut_scan_iso = _scans_par_nas[nas].get("debut")
                if "seen_ids" not in _scans_par_nas[nas]:
                    _scans_par_nas[nas]["seen_ids"] = set()

                for f in fichiers:
                    doc_id = f.get("id")
                    if doc_id:
                        _scans_par_nas[nas]["seen_ids"].add(doc_id)

                liste_seen_ids = list(_scans_par_nas[nas]["seen_ids"])

        def _traiter_import_batch():
            with db.obtenir_connexion_contexte() as connexion:
                return db.inserer_ou_mettre_a_jour_fichiers_externe(
                    connexion=connexion,
                    nas=nas,
                    label=etiquette,
                    scanned_root_path=scanned_root_path,
                    outil_source=donnees.get("outil_source", "externe"),
                    is_first_chunk=is_first_chunk,
                    is_last_chunk=is_last_chunk,
                    fichiers=fichiers,
                    debut_scan_iso=debut_scan_iso,
                    seen_ids=liste_seen_ids
                )

        try:
            resultat_batch = await self.executer_db(_traiter_import_batch)
            nb_fichiers = resultat_batch.get("ingested", len(fichiers))
            nb_supprimes = resultat_batch.get("deleted", 0)

            with _verrou_scans:
                if nas in _scans_par_nas:
                    _scans_par_nas[nas]["fichiers"] = (
                        _scans_par_nas[nas].get("fichiers", 0) + nb_fichiers
                    )

            journal.info(
                f"✓ Scan batch écrit : {nb_fichiers} fichiers indexés, {nb_supprimes} purges "
                f"pour [{nas} / {etiquette}] (Dernier lot: {is_last_chunk})"
            )
            msg = f"✓ {nb_fichiers} fichiers indexés avec succès dans PostgreSQL."
            if is_last_chunk and nb_supprimes > 0:
                msg += f" {nb_supprimes} fichiers supprimés/déplacés purgés."

            self.ecrire_json({
                "ok": True,
                "message": msg,
                "scanned_files": nb_fichiers,
                "deleted_files": nb_supprimes
            })
        except Exception as e:
            journal.error(f"Erreur lors de l'import du scan : {e}")
            self.ecrire_json({"error": f"Échec de l'indexation : {str(e)}"}, 500)
        finally:
            error_on_first_chunk = is_first_chunk and not is_last_chunk
            import sys as _sys
            exc = _sys.exc_info()[1]
            should_release = is_last_chunk or (error_on_first_chunk and exc is not None)
            if should_release:
                with _verrou_scans:
                    if nas in _scans_par_nas:
                        del _scans_par_nas[nas]
                        journal.info(f"[VERROU NAS] Verrou libéré pour '{nas}'")


# ----------------------------------------------
# API - Téléchargement de l'Outil de Scan (.exe uniquement)
# Note : scan_nas.bat supprimé - seul le mode export JSON est supporté en entreprise.
# ----------------------------------------------
class GestionnaireTelechargementOutils(tornado.web.RequestHandler):
    def get(self, tool_type):
        import zipfile
        import io as _io

        dossier_tools = Path(RACINE_PROJET) / "tools"
        if not dossier_tools.exists():
            dossier_tools = (Path(__file__).parent.parent / "tools").resolve()

        if tool_type == "scanner-exe":
            fichier_exe = dossier_tools / "scan_nas.exe"
            if not fichier_exe.exists():
                self.set_status(404)
                self.write("scan_nas.exe introuvable sur le serveur.")
                return

            # --- Recuperation des listes EDS & Cellules depuis la BDD ---
            # Ces listes pre-remplissent les dropdowns du .exe sans connexion reseau.
            eds_list = []
            cellules_list = []
            try:
                with db.obtenir_connexion_contexte() as connexion:
                    with connexion.cursor() as curseur:
                        curseur.execute("""
                            SELECT DISTINCT nas
                            FROM nas_sources
                            WHERE nas IS NOT NULL AND nas != ''
                              AND nas NOT LIKE 'postgresql://%%'
                            ORDER BY nas ASC
                        """)
                        eds_list = [ligne[0] for ligne in curseur.fetchall()]

                        curseur.execute("""
                            SELECT DISTINCT label
                            FROM nas_sources
                            WHERE label IS NOT NULL AND label != ''
                            ORDER BY label ASC
                        """)
                        cellules_list = [ligne[0] for ligne in curseur.fetchall()]
            except Exception as e:
                journal.warning(f"[DOWNLOAD] Impossible de charger les EDS/Cellules pour le .cfg : {e}")

            # Construction du fichier de configuration avec les listes pre-remplies
            contenu_cfg = json.dumps(
                {"eds_list": eds_list, "cellules_list": cellules_list},
                ensure_ascii=False,
                indent=2
            )

            # Construction du ZIP en memoire
            tampon_zip = _io.BytesIO()
            with zipfile.ZipFile(tampon_zip, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
                zf.writestr("scan_nas.cfg", contenu_cfg)
                with open(fichier_exe, "rb") as f_exe:
                    zf.writestr(
                        zipfile.ZipInfo("scan_nas.exe"),
                        f_exe.read(),
                        compress_type=zipfile.ZIP_STORED
                    )
            contenu_zip = tampon_zip.getvalue()

            self.set_header("Content-Type", "application/zip")
            self.set_header("Content-Disposition", 'attachment; filename="scan_nas_pack.zip"')
            self.set_header("Content-Length", str(len(contenu_zip)))
            self.write(contenu_zip)
            journal.info(
                f"[DOWNLOAD] Pack scan_nas_pack.zip servi avec "
                f"{len(eds_list)} EDS et {len(cellules_list)} cellule(s) pre-remplies."
            )
            return

        else:
            self.set_status(404)
            self.write("Outil non trouve")
            return



# ──────────────────────────────────────────────
# Gestion des fichiers statiques d'application Web (Routage SPA)
# ──────────────────────────────────────────────
class GestionnaireFichiersStatiquesSPA(tornado.web.StaticFileHandler):
    def initialize(self, path, default_filename=None):
        super().initialize(path, default_filename)
        
    def validate_absolute_path(self, root, absolute_path):
        if not os.path.exists(absolute_path) or os.path.isdir(absolute_path):
            # Pour les ressources statiques (js, css, images...), renvoyer 404 explicite au lieu du fallback index.html
            ext = os.path.splitext(absolute_path)[1].lower()
            if ext in ['.js', '.css', '.svg', '.png', '.jpg', '.jpeg', '.ico', '.woff', '.woff2', '.map', '.json']:
                raise tornado.web.HTTPError(404)
            return os.path.join(root, "index.html")
        return super().validate_absolute_path(root, absolute_path)

    def set_extra_headers(self, path):
        # 'no-transform' empêche les proxies d'entreprise et antivirus de modifier/altérer la compression des fichiers statiques
        self.set_header("Cache-Control", "no-cache, no-store, must-revalidate, no-transform")
        self.set_header("Pragma", "no-cache")
        self.set_header("Expires", "0")
        if path.endswith(".js"):
            self.set_header("Content-Type", "application/javascript; charset=utf-8")
        elif path.endswith(".css"):
            self.set_header("Content-Type", "text/css; charset=utf-8")


# ──────────────────────────────────────────────
# Initialisation de l'application Tornado
# ──────────────────────────────────────────────
def creer_application():
    repertoire_dist = os.path.join(os.path.dirname(__file__), 'static', 'dist')
    
    if not os.path.exists(repertoire_dist):
        os.makedirs(repertoire_dist, exist_ok=True)
        substitut = os.path.join(repertoire_dist, "index.html")
        if not os.path.exists(substitut):
            with open(substitut, "w") as f:
                f.write("<html><body><h1>Catalogue NAS - Frontend non compile</h1></body></html>")

    gestionnaires_routes = [
        (r"/api/db/status", GestionnaireStatutBD),
        (r"/api/db/connect", GestionnaireConnexionBD),
        (r"/api/search", GestionnaireRecherche),
        (r"/api/stats", GestionnaireStatistiques),
        (r"/api/cache/stats", GestionnaireStatistiquesCache),
        (r"/api/sources", GestionnaireSources),
        (r"/api/sources/details", GestionnaireDetailsSources),
        (r"/api/extensions", GestionnaireListeExtensions),
        (r"/api/heaviest", GestionnaireFichiersLourds),
        (r"/api/export/csv", GestionnaireExportCSV),
        (r"/api/stats/age-distribution", GestionnaireDistributionAge),
        (r"/api/tags", GestionnaireMiseAJourTags),
        (r"/api/tags/list", GestionnaireListeTags),
        (r"/api/scan/external-upload", GestionnaireScanExterne),
        (r"/api/scan/status", GestionnaireStatutScan),
        (r"/api/scan/lock-status", GestionnaireVerrouScan),
        (r"/api/cleanup/scan", GestionnaireScanNettoyage),
        (r"/api/tree", GestionnaireArborescence),
        (r"/api/download/(.*)", GestionnaireTelechargementOutils),
        # Fichiers statiques et routage SPA
        (r"/(.*)", GestionnaireFichiersStatiquesSPA, {"path": repertoire_dist, "default_filename": "index.html"}),
    ]
    return tornado.web.Application(gestionnaires_routes, debug=False)


if __name__ == "__main__":
    import tornado.httpserver
    port = int(os.environ.get("PORT", 5000))
    adresse_hote = os.environ.get("HOST", "0.0.0.0")
    application = creer_application()
    serveur = tornado.httpserver.HTTPServer(
        application,
        max_buffer_size=500 * 1024 * 1024,
        max_body_size=500 * 1024 * 1024
    )
    serveur.listen(port, address=adresse_hote)
    journal.info(f"Démarrage du Catalogue NAS sur le port {port} ({adresse_hote}) (Tornado)...")
    tornado.ioloop.IOLoop.current().start()
