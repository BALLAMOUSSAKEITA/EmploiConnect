"""Filtres réutilisables : cohérence entre liste candidats, export, stats, détection doublons."""
from sqlalchemy import or_

from app.models import Candidate, Company


def candidate_is_listed():
    """Actif explicitement ou NULL (legacy) — exclut seulement is_active = False."""
    return or_(Candidate.is_active.is_(True), Candidate.is_active.is_(None))


def company_is_listed():
    return or_(Company.is_active.is_(True), Company.is_active.is_(None))
