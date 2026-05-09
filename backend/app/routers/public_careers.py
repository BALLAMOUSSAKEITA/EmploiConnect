import hashlib
import os
import re
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Application, Candidate, JobPost, JobStatus
from app.routers.candidates import _persist_cv_file
from app.schemas.public_careers import PublicApplyResponse, PublicCompanyBrief, PublicJobDetail, PublicJobSummary

router = APIRouter(prefix="/public", tags=["Carrière publique"])

MAX_PUBLIC_CV_BYTES = 8 * 1024 * 1024


def _trunc(s: Optional[str], n: int = 255) -> Optional[str]:
    if s is None:
        return None
    t = s.strip()
    if not t:
        return None
    return t[:n]


def _company_brief(c) -> PublicCompanyBrief:
    return PublicCompanyBrief.model_validate(c)


def _job_summary(j: JobPost) -> PublicJobSummary:
    return PublicJobSummary(
        id=j.id,
        title=j.title,
        city=j.city,
        location=j.location,
        job_type=j.job_type,
        salary_min=j.salary_min,
        salary_max=j.salary_max,
        salary_currency=j.salary_currency or "GNF",
        experience_years=j.experience_years,
        created_at=j.created_at,
        company=_company_brief(j.company),
    )


def _job_detail(j: JobPost) -> PublicJobDetail:
    return PublicJobDetail(
        id=j.id,
        title=j.title,
        description=j.description,
        requirements=j.requirements,
        responsibilities=j.responsibilities,
        location=j.location,
        city=j.city,
        job_type=j.job_type,
        salary_min=j.salary_min,
        salary_max=j.salary_max,
        salary_currency=j.salary_currency or "GNF",
        experience_years=j.experience_years,
        education_level=j.education_level,
        deadline=j.deadline,
        created_at=j.created_at,
        company=_company_brief(j.company),
    )


@router.get("/jobs", response_model=List[PublicJobSummary])
def public_list_jobs(
    search: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    q = db.query(JobPost).options(joinedload(JobPost.company)).filter(JobPost.status == JobStatus.open)
    if search and search.strip():
        q = q.filter(JobPost.title.ilike(f"%{search.strip()}%"))
    jobs = q.order_by(JobPost.created_at.desc()).limit(min(limit, 200)).all()
    return [_job_summary(j) for j in jobs]


@router.get("/jobs/{job_id}", response_model=PublicJobDetail)
def public_get_job(job_id: int, db: Session = Depends(get_db)):
    j = (
        db.query(JobPost)
        .options(joinedload(JobPost.company))
        .filter(JobPost.id == job_id, JobPost.status == JobStatus.open)
        .first()
    )
    if not j:
        raise HTTPException(status_code=404, detail="Offre introuvable ou non publiée")
    return _job_detail(j)


@router.post("/jobs/{job_id}/apply", response_model=PublicApplyResponse)
async def public_apply(
    job_id: int,
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: str = Form(...),
    phone: Optional[str] = Form(None),
    cover_letter: Optional[str] = Form(None),
    utm_source: Optional[str] = Form(None),
    utm_medium: Optional[str] = Form(None),
    utm_campaign: Optional[str] = Form(None),
    utm_content: Optional[str] = Form(None),
    utm_term: Optional[str] = Form(None),
    referrer_url: Optional[str] = Form(None),
    landing_page: Optional[str] = Form(None),
    cv: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    job = db.query(JobPost).filter(JobPost.id == job_id, JobPost.status == JobStatus.open).first()
    if not job:
        raise HTTPException(status_code=404, detail="Offre introuvable ou non publique")

    fn = (first_name or "").strip()
    ln = (last_name or "").strip()
    em = (email or "").strip().lower()
    if not fn or not ln or not em:
        raise HTTPException(status_code=400, detail="Prénom, nom et email sont requis")
    if not re.match(r"^[^@]+@[^@]+\.[^@]+$", em):
        raise HTTPException(status_code=400, detail="Email invalide")

    cand = db.query(Candidate).filter(Candidate.email == em).first()
    if cand and cand.is_active is False:
        raise HTTPException(
            status_code=400,
            detail="Ce profil n’est plus actif. Contactez le recruteur.",
        )

    if cand:
        dup = db.query(Application).filter(
            Application.candidate_id == cand.id,
            Application.job_post_id == job_id,
        ).first()
        if dup:
            raise HTTPException(status_code=400, detail="Vous avez déjà postulé à cette offre.")
        if (phone or "").strip() and not (cand.phone or "").strip():
            cand.phone = (phone or "").strip()
    else:
        cand = Candidate(
            first_name=fn,
            last_name=ln,
            email=em,
            phone=(phone or "").strip() or None,
            notes="Profil créé depuis la page carrière publique.",
            is_active=True,
        )
        db.add(cand)
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            cand = db.query(Candidate).filter(Candidate.email == em).first()
            if not cand:
                raise HTTPException(status_code=500, detail="Erreur lors de l’enregistrement du profil")
            dup = db.query(Application).filter(
                Application.candidate_id == cand.id,
                Application.job_post_id == job_id,
            ).first()
            if dup:
                raise HTTPException(status_code=400, detail="Vous avez déjà postulé à cette offre.")

    app_row = Application(
        candidate_id=cand.id,
        job_post_id=job_id,
        cover_letter=(cover_letter or "").strip() or None,
        notes=None,
        utm_source=_trunc(utm_source, 255),
        utm_medium=_trunc(utm_medium, 255),
        utm_campaign=_trunc(utm_campaign, 255),
        utm_content=_trunc(utm_content, 255),
        utm_term=_trunc(utm_term, 255),
        referrer_url=(referrer_url or "").strip()[:2000] or None,
        landing_page=_trunc(landing_page, 512),
    )
    db.add(app_row)
    db.flush()
    db.refresh(app_row)

    try:
        if cv and cv.filename:
            allowed = [".pdf", ".doc", ".docx"]
            ext = os.path.splitext(cv.filename)[1].lower()
            if ext not in allowed:
                raise HTTPException(status_code=400, detail="CV : PDF, DOC ou DOCX uniquement")
            contents = await cv.read()
            if len(contents) > MAX_PUBLIC_CV_BYTES:
                raise HTTPException(status_code=400, detail="CV trop volumineux (max 8 Mo)")
            sha = hashlib.sha256(contents).hexdigest()
            _persist_cv_file(db, cand.id, cv.filename, contents, ext, sha)
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erreur lors de l’enregistrement de la candidature")

    db.refresh(app_row)
    return PublicApplyResponse(
        message="Candidature enregistrée. Merci !",
        application_id=app_row.id,
        candidate_id=cand.id,
    )
