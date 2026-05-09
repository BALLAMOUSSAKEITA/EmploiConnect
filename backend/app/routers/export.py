import csv
import io
import re
from datetime import datetime, timedelta, timezone
from calendar import monthrange
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import User, Application, Candidate, JobPost, Interview, TalentList, CandidateTalentList
from app.auth.dependencies import get_current_user
from app.query_filters import candidate_is_listed

router = APIRouter(prefix="/export", tags=["Export"])


def _utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _ics_text(val: str) -> str:
    if not val:
        return ""
    return (
        val.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\n", "\\n")
        .replace("\r", "")
    )


def _ics_dt(dt: datetime) -> str:
    return _utc(dt).strftime("%Y%m%dT%H%M%SZ") if dt else ""


def _build_interview_ics_events(interviews: list[Interview]) -> str:
    lines: list[str] = []
    now = datetime.now(timezone.utc)
    stamp = now.strftime("%Y%m%dT%H%M%SZ")
    for it in interviews:
        start = _utc(it.scheduled_at)
        if not start:
            continue
        dur = it.duration_minutes or 60
        end_d = start + timedelta(minutes=dur)
        cand = it.application.candidate if it.application else None
        job = it.application.job_post if it.application else None
        cand_name = f"{cand.first_name} {cand.last_name}".strip() if cand else "Candidat"
        job_title = job.title if job else "Offre"
        typ = it.interview_type.value if hasattr(it.interview_type, "value") else str(it.interview_type)
        interviewr = it.interviewer.full_name if it.interviewer else ""
        summary = _ics_text(f"Entretien — {cand_name} — {job_title}")
        desc_parts = [
            f"Type: {typ}",
            f"Candidat: {cand_name}",
            f"Offre: {job_title}",
        ]
        if interviewr:
            desc_parts.append(f"Intervieweur: {interviewr}")
        if it.notes:
            desc_parts.append(f"Notes: {it.notes[:500]}")
        if it.meeting_link:
            desc_parts.append(f"Lien: {it.meeting_link}")
        description = _ics_text("\\n".join(desc_parts))
        loc = ""
        if it.location:
            loc = _ics_text(it.location)
        elif it.meeting_link:
            loc = _ics_text(it.meeting_link)
        lines.append("BEGIN:VEVENT")
        lines.append(f"UID:ec-interview-{it.id}@emploiconnect.local")
        lines.append(f"DTSTAMP:{stamp}")
        lines.append(f"DTSTART:{_ics_dt(start)}")
        lines.append(f"DTEND:{_ics_dt(end_d)}")
        lines.append(f"SUMMARY:{summary}")
        if description:
            lines.append(f"DESCRIPTION:{description}")
        if loc:
            lines.append(f"LOCATION:{loc}")
        if it.meeting_link:
            lines.append(f"URL:{_ics_text(it.meeting_link)}")
        lines.append("END:VEVENT")
    return "\r\n".join(lines)


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
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_content",
        "utm_term",
        "landing_page",
        "referrer_url",
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
                getattr(a, "utm_source", None) or "",
                getattr(a, "utm_medium", None) or "",
                getattr(a, "utm_campaign", None) or "",
                getattr(a, "utm_content", None) or "",
                getattr(a, "utm_term", None) or "",
                getattr(a, "landing_page", None) or "",
                (getattr(a, "referrer_url", None) or "").replace("\n", " ")[:500],
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
    list_id: Optional[int] = None,
    tag: Optional[str] = None,
    recontact_due: bool = False,
    limit: int = Query(5000, le=20000),
):
    q = db.query(Candidate).filter(candidate_is_listed())
    if search:
        q = q.filter(
            (Candidate.first_name.ilike(f"%{search}%"))
            | (Candidate.last_name.ilike(f"%{search}%"))
            | (Candidate.email.ilike(f"%{search}%"))
        )
    if list_id is not None:
        q = q.join(CandidateTalentList).filter(CandidateTalentList.talent_list_id == list_id)
    if tag and tag.strip():
        t = tag.strip()
        q = q.filter(Candidate.tags_json.isnot(None)).filter(Candidate.tags_json.ilike(f'%"{t}"%'))
    if recontact_due:
        now = datetime.now(timezone.utc)
        q = q.filter(Candidate.recontact_at.isnot(None), Candidate.recontact_at <= now)
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
        "tags_vivier",
        "rappel_recontact",
        "note_recontact",
        "listes_vivier",
        "date_creation",
    ]
    body: list[list] = [header]
    for c in cands:
        tags_txt = (c.tags_json or "").replace("\n", " ")[:500]
        lists_rows = (
            db.query(TalentList.name)
            .join(CandidateTalentList, CandidateTalentList.talent_list_id == TalentList.id)
            .filter(CandidateTalentList.candidate_id == c.id)
            .order_by(TalentList.name.asc())
            .all()
        )
        lists_txt = "; ".join(r[0] for r in lists_rows)
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
                tags_txt,
                c.recontact_at.isoformat() if c.recontact_at else "",
                (c.recontact_note or "").replace("\n", " ")[:500],
                lists_txt,
                c.created_at.isoformat() if c.created_at else "",
            ]
        )
    data = _utf8_csv(body)
    return StreamingResponse(
        iter([data.encode("utf-8")]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="candidats.csv"'},
    )


@router.get("/interviews.ics")
def export_interviews_ics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    interview_id: Optional[int] = None,
    month: Optional[str] = None,
    limit: int = Query(500, le=2000),
):
    """
    Calendrier iCalendar (.ics). Filtres : `interview_id` (un entretien), ou `month=YYYY-MM`, sinon les `limit` plus récents.
    """
    q = db.query(Interview).options(
        joinedload(Interview.application).joinedload(Application.candidate),
        joinedload(Interview.application).joinedload(Application.job_post),
        joinedload(Interview.interviewer),
    )

    if interview_id is not None:
        q = q.filter(Interview.id == interview_id)
        row = q.first()
        if not row:
            raise HTTPException(status_code=404, detail="Entretien introuvable")
        rows = [row]
        filename = f"entretien-{interview_id}.ics"
        calname = f"Entretien {interview_id}"
    elif month:
        if not re.match(r"^\d{4}-\d{2}$", month):
            raise HTTPException(status_code=400, detail="month attendu au format YYYY-MM")
        y, m = int(month[:4]), int(month[5:7])
        if m < 1 or m > 12:
            raise HTTPException(status_code=400, detail="Mois invalide")
        start = datetime(y, m, 1, tzinfo=timezone.utc)
        last = monthrange(y, m)[1]
        end = datetime(y, m, last, 23, 59, 59, tzinfo=timezone.utc)
        rows = (
            q.filter(Interview.scheduled_at >= start, Interview.scheduled_at <= end)
            .order_by(Interview.scheduled_at.asc())
            .all()
        )
        filename = f"entretiens-{month}.ics"
        calname = f"Entretiens {month}"
    else:
        rows = q.order_by(Interview.scheduled_at.desc()).limit(limit).all()
        rows = list(reversed(rows))
        filename = "entretiens.ics"
        calname = "EmploiConnect — Entretiens"

    header = "\r\n".join(
        [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//EmploiConnect//ENTRETIENS//FR",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            f"X-WR-CALNAME:{_ics_text(calname)}",
        ]
    )
    events_block = _build_interview_ics_events(rows)
    text = header + ("\r\n" + events_block if events_block else "") + "\r\nEND:VCALENDAR"
    return StreamingResponse(
        iter([text.encode("utf-8")]),
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
