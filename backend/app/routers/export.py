import csv
import io
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import User, Application, Candidate, JobPost
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/export", tags=["Export"])


def _utf8_csv(rows: list[list]) -> str:
    buf = io.StringIO()
    writer = csv.writer(buf, delimiter=";", lineterminator="\n")
    for row in rows:
        writer.writerow(row)
    return "\ufeff" + buf.getvalue()


@router.get("/applications.csv")
def export_applications_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(5000, le=20000),
):
    apps = (
        db.query(Application)
        .options(
            joinedload(Application.candidate),
            joinedload(Application.job_post).joinedload(JobPost.company),
        )
        .order_by(Application.applied_at.desc())
        .limit(limit)
        .all()
    )
    header = [
        "id",
        "candidat",
        "email_candidat",
        "offre",
        "entreprise",
        "statut",
        "date_candidature",
    ]
    body: list[list] = [header]
    for a in apps:
        c = a.candidate
        j = a.job_post
        co = j.company if j else None
        st = a.status.value if hasattr(a.status, "value") else str(a.status)
        body.append(
            [
                a.id,
                f"{c.first_name} {c.last_name}" if c else "",
                c.email if c else "",
                j.title if j else "",
                co.name if co else "",
                st,
                a.applied_at.isoformat() if a.applied_at else "",
            ]
        )
    data = _utf8_csv(body)
    return StreamingResponse(
        iter([data.encode("utf-8")]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="candidatures.csv"'},
    )


@router.get("/candidates.csv")
def export_candidates_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    search: Optional[str] = None,
    limit: int = Query(5000, le=20000),
):
    q = db.query(Candidate).filter(Candidate.is_active == True)
    if search:
        q = q.filter(
            (Candidate.first_name.ilike(f"%{search}%"))
            | (Candidate.last_name.ilike(f"%{search}%"))
            | (Candidate.email.ilike(f"%{search}%"))
        )
    cands = q.order_by(Candidate.created_at.desc()).limit(limit).all()
    header = [
        "id",
        "prenom",
        "nom",
        "email",
        "telephone",
        "ville",
        "poste_actuel",
        "entreprise_actuelle",
        "competences",
        "date_creation",
    ]
    body: list[list] = [header]
    for c in cands:
        body.append(
            [
                c.id,
                c.first_name,
                c.last_name,
                c.email,
                c.phone or "",
                c.city or "",
                c.current_position or "",
                c.current_company or "",
                (c.skills or "").replace("\n", " ")[:500],
                c.created_at.isoformat() if c.created_at else "",
            ]
        )
    data = _utf8_csv(body)
    return StreamingResponse(
        iter([data.encode("utf-8")]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="candidats.csv"'},
    )
