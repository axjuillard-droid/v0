# ── Image Runtime Python 3.11 Slim pour Serveur Entreprise ──
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=5000 \
    HOST=0.0.0.0 \
    NO_BROWSER=true \
    WORKERS=0

WORKDIR /app

# Dépendances système pour psycopg2 et requêtes réseau
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc curl \
    && rm -rf /var/lib/apt/lists/*

# Installation des dépendances Python
COPY app/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copie du code applicatif backend et des fichiers statiques pré-compilés
COPY db.py ./
COPY app/ ./app/

# Utilisateur non-root pour la sécurité conteneur (conformité SSI)
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/db/status || exit 1

CMD ["python", "app/start.py"]
