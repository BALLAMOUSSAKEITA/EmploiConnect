# EmploiConnect — Plateforme de Recrutement

Plateforme complète de recrutement de talents pour les entreprises en Guinée.

## Architecture

```
EmploiConnect/
├── backend/        ← FastAPI + SQLAlchemy + SQLite
└── frontend/       ← Next.js 16 + Tailwind CSS 4 + TypeScript
```

## Lancement rapide

### 1. Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API disponible sur : http://localhost:8000  
Documentation Swagger : http://localhost:8000/docs

### 2. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Interface disponible sur : http://localhost:3000

## Compte administrateur par défaut

| Champ | Valeur |
|-------|--------|
| Email | admin@emploiconnect.gn |
| Mot de passe | Admin@2024 |

## Fonctionnalités

- **Tableau de bord** — KPIs, pipeline de conversion, actions rapides
- **Offres d'emploi** — CRUD complet, vue grille/liste, filtres par statut
- **Candidats** — Base de données, upload CV (PDF/DOC), fiches détaillées
- **Entreprises** — Gestion des clients, secteur, contacts
- **Entretiens** — Planification (téléphone/vidéo/présentiel), suivi des résultats
- **Pipeline de recrutement** — Candidature → Présélection → Entretien → Offre → Embauché

## Technologies

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styles | Tailwind CSS 4 |
| Backend | FastAPI, Python 3.10+ |
| Base de données | SQLite (dev) / PostgreSQL (prod) |
| Auth | JWT (python-jose) |
| ORM | SQLAlchemy 2.0 |
