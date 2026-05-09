"""Regroupement simple de candidats potentiellement en doublon."""
from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from app.models import Candidate


def normalize_phone_key(phone: Optional[str]) -> Optional[str]:
    if not phone:
        return None
    digits = "".join(c for c in phone if c.isdigit())
    if len(digits) < 8:
        return None
    return digits


def normalize_full_name_key(first_name: Optional[str], last_name: Optional[str]) -> Optional[str]:
    f = (first_name or "").strip().lower()
    l = (last_name or "").strip().lower()
    if not f and not l:
        return None
    return f"{f}|{l}"


def find_duplicate_groups(db: Session):
    """Retourne des groupes { reason, key, candidates: [{id, email, ...}] }."""
    rows = db.query(Candidate).filter(Candidate.is_active == True).all()
    phone_buckets: dict[str, list[Candidate]] = {}
    name_buckets: dict[str, list[Candidate]] = {}
    for c in rows:
        pk = normalize_phone_key(c.phone)
        if pk:
            phone_buckets.setdefault(pk, []).append(c)
        nk = normalize_full_name_key(c.first_name, c.last_name)
        if nk and nk != "|":
            name_buckets.setdefault(nk, []).append(c)

    groups = []
    for key, cands in sorted(phone_buckets.items()):
        if len(cands) > 1:
            groups.append({"reason": "phone", "key": key, "candidates": cands})
    for key, cands in sorted(name_buckets.items()):
        if len(cands) > 1:
            emails = {x.email.lower() for x in cands}
            if len(emails) < 2:
                continue
            groups.append({"reason": "full_name", "key": key, "candidates": cands})
    return groups
