import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, JobTemplate, JobPost, Company, JobStatus
from app.schemas.job import InterviewGuidePayload, InterviewGuideItem
from app.schemas.job_template import JobTemplateCreate, JobTemplateResponse, JobFromTemplateBody, JobTemplateFromJobBody
from app.schemas.job import JobPostResponse
from app.auth.dependencies import get_current_user
from app.routers.jobs import _job_response
from app.services.activity import log_activity

router = APIRouter(prefix="/job-templates", tags=["Modèles d'offre"])


def _guide_to_json(ig) -> Optional[str]:
    if ig is None:
        return None
    payload = InterviewGuidePayload.model_validate(ig)
    cleaned: list[InterviewGuideItem] = []
    for x in payload.items:
        q = (x.question or "").strip()
        if not q:
            continue
        cat = (x.category or "").strip() or None
        cleaned.append(InterviewGuideItem(category=cat, question=q))
    if not cleaned:
        return None
    return json.dumps({"items": [c.model_dump() for c in cleaned]}, ensure_ascii=False)


def _parse_guide(raw: Optional[str]) -> Optional[InterviewGuidePayload]:
    if not raw or not str(raw).strip():
        return None
    try:
        return InterviewGuidePayload.model_validate(json.loads(raw))
    except Exception:
        return None


def _template_response(t: JobTemplate) -> JobTemplateResponse:
    g = _parse_guide(getattr(t, "interview_guide_json", None))
    return JobTemplateResponse.model_validate(t).model_copy(update={"interview_guide": g})


@router.get("", response_model=List[JobTemplateResponse])
def list_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
):
    rows = db.query(JobTemplate).order_by(JobTemplate.created_at.desc()).offset(skip).limit(limit).all()
    return [_template_response(r) for r in rows]


@router.post("", response_model=JobTemplateResponse, status_code=201)
def create_template(
    data: JobTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dump = data.model_dump()
    ig = dump.pop("interview_guide", None)
    if data.company_id:
        if not db.query(Company).filter(Company.id == data.company_id).first():
            raise HTTPException(status_code=404, detail="Entreprise introuvable")
    row = JobTemplate(**dump, interview_guide_json=_guide_to_json(ig), created_by=current_user.id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _template_response(row)


@router.post("/from-job/{job_id}", response_model=JobTemplateResponse, status_code=201)
def create_template_from_job(
    job_id: int,
    body: JobTemplateFromJobBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = db.query(JobPost).filter(JobPost.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Offre introuvable")
    row = JobTemplate(
        name=body.name,
        title=job.title,
        description=job.description,
        requirements=job.requirements,
        responsibilities=job.responsibilities,
        location=job.location,
        city=job.city,
        job_type=job.job_type,
        salary_min=job.salary_min,
        salary_max=job.salary_max,
        salary_currency=job.salary_currency or "GNF",
        experience_years=job.experience_years,
        education_level=job.education_level,
        company_id=job.company_id,
        interview_guide_json=job.interview_guide_json,
        created_by=current_user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    log_activity(db, current_user.id, "job_post", job_id, "template_saved", {"template_id": row.id, "name": body.name})
    db.commit()
    return _template_response(row)


@router.post("/{template_id}/create-job", response_model=JobPostResponse, status_code=201)
def instantiate_job(
    template_id: int,
    body: JobFromTemplateBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tmpl = db.query(JobTemplate).filter(JobTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Modèle introuvable")
    if not db.query(Company).filter(Company.id == body.company_id).first():
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    title = body.title_override or tmpl.title
    job = JobPost(
        title=title,
        description=tmpl.description,
        requirements=tmpl.requirements,
        responsibilities=tmpl.responsibilities,
        location=tmpl.location,
        city=tmpl.city,
        job_type=tmpl.job_type,
        salary_min=tmpl.salary_min,
        salary_max=tmpl.salary_max,
        salary_currency=tmpl.salary_currency or "GNF",
        experience_years=tmpl.experience_years,
        education_level=tmpl.education_level,
        status=JobStatus.draft,
        company_id=body.company_id,
        created_by=current_user.id,
        interview_guide_json=tmpl.interview_guide_json,
    )
    db.add(job)
    db.flush()
    log_activity(db, current_user.id, "job_post", job.id, "created_from_template", {"template_id": template_id})
    db.commit()
    db.refresh(job)
    db.refresh(job, ["company"])
    return _job_response(job, db, 0)
