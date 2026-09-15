import os
import sys
import time
import webbrowser
import threading
from pathlib import Path

# Ajouter le répertoire parent au PATH de recherche Python
if getattr(sys, 'frozen', False):
    RACINE_PROJET = Path(sys.executable).parent
else:
    RACINE_PROJET = Path(__file__).parent.parent
sys.path.insert(0, str(RACINE_PROJET))

import tornado.ioloop
import tornado.httpserver
import tornado.netutil
import tornado.process
try:
    from app.app import creer_application
except ImportError:
    from app import creer_application
import db


def ouvrir_navigateur():
    time.sleep(1.5)
    print("Ouverture du navigateur vers http://localhost:5000 ...")
    try:
        webbrowser.open("http://localhost:5000")
    except Exception:
        pass


def principal():
    # Connexion auto si DATABASE_URL est définie dans l'environnement ou .env
    url_bd = db.obtenir_url_bd()
    if url_bd:
        db.definir_url_bd(url_bd)
        try:
            with db.obtenir_connexion_contexte() as connexion:
                db.initialiser_bd(connexion)
            print(f"[OK] Connexion PostgreSQL établie à {url_bd.split('@')[-1]}, pool activé et schéma vérifié.")
        except Exception as e:
            print(f"[WARNING] Connexion PostgreSQL impossible au démarrage ({url_bd}) : {e}")
    else:
        print("[INFO] Aucune URL de base de données configurée. Renseignez DATABASE_URL ou le fichier .env.")

    # Ne pas ouvrir le navigateur si on est en conteneur ou mode sans navigateur
    sans_navigateur = os.environ.get("NO_BROWSER", "false").lower() in ("true", "1", "yes")
    if not sans_navigateur and not os.environ.get("DATABASE_URL"):
        thread_nav = threading.Thread(target=ouvrir_navigateur)
        thread_nav.daemon = True
        thread_nav.start()

    port = int(os.environ.get("PORT", 5000))
    adresse_hote = os.environ.get("HOST", "0.0.0.0")
    nb_workers = int(os.environ.get("WORKERS", "1"))  # 0 = fork automatique sur tous les cœurs CPU

    application = creer_application()
    serveur = tornado.httpserver.HTTPServer(
        application,
        max_buffer_size=500 * 1024 * 1024,
        max_body_size=500 * 1024 * 1024
    )

    if nb_workers != 1:
        sockets = tornado.netutil.bind_sockets(port, address=adresse_hote)
        tornado.process.fork_processes(nb_workers)
        serveur.add_sockets(sockets)
        print(f"[SERVEUR MULTI-WORKERS] Worker Tornado démarré sur port {port}.")
    else:
        serveur.listen(port, address=adresse_hote)
        print(f"Démarrage du Catalogue NAS sur http://{adresse_hote}:{port} (Tornado)...")

    tornado.ioloop.IOLoop.current().start()


if __name__ == "__main__":
    principal()
