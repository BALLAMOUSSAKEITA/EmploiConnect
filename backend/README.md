# EmploiConnect - Backend FastAPI

## Démarrage rapide

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API disponible sur : http://localhost:8000
Documentation Swagger : http://localhost:8000/docs

## Base de données

- **En local** : par défaut `DATABASE_URL=sqlite:///./emploiconnect.db` (voir `.env`). Pas besoin de PostgreSQL installé.
- **Sur Railway** : définissez `DATABASE_URL` dans les variables du service (fournie par le plugin Postgres). N’utilisez pas `postgres.railway.internal` sur votre machine : cet hôte ne fonctionne que **entre** les services Railway.

Copiez `.env.example` vers `.env` pour démarrer.

## Compte admin par défaut
- Email: admin@emploiconnect.gn
- Mot de passe: Admin@2024
