# GestRH Guinée - Plateforme de Recrutement

Plateforme complète de gestion RH et recrutement de talents pour les entreprises en Guinée.

## Architecture

```
Gestion RH/
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
| Email | admin@gestrh.gn |
| Mot de passe | Admin@2024 |

## Fonctionnalités

- **Tableau de bord** — KPIs, dernières candidatures, actions rapides
- **Offres d'emploi** — CRUD complet, filtres par statut/entreprise, gestion des candidatures
- **Candidats** — Base de données complète, upload CV (PDF/DOC), fiches candidat
- **Entreprises** — Gestion des clients, secteur, contacts
- **Entretiens** — Planification (téléphone/vidéo/présentiel), suivi des résultats
- **Pipeline de recrutement** — Suivi candidature → présélection → entretien → offre → embauché

## Technologies

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styles | Tailwind CSS 4 |
| Backend | FastAPI, Python 3.10+ |
| Base de données | SQLite (dev) / PostgreSQL (prod) |
| Auth | JWT (python-jose) |
| ORM | SQLAlchemy 2.0 |
