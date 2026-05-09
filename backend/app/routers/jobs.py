from fastapi import APIRouter, Depends, HTTPException
import json
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from app.database import get_db
from app.models import JobPost, Company, Application, JobStatus, JobPostTeamMember, JobRecruitmentRole
from app.schemas.job import (
    JobPostCreate,
    JobPostUpdate,
    JobPostResponse,
    InterviewGuidePayload,
    InterviewGuideItem,
)
from app.schemas.job_team import JobTeamMemberCreate, JobTeamMemberResponse
from app.auth.dependencies import get_current_user
from app.models import User
from app.services.activity import log_activity

router = APIRouter(prefix="/jobs", tags=["Offres d'emploi"])


def _parse_interview_guide(raw: Optional[str]) -> Optional[InterviewGuidePayload]:
    if not raw or not str(raw).strip():
        return None
    try:
        return InterviewGuidePayload.model_validate(json.loads(raw))
    except Exception:
        return None


def _job_response(job: JobPost, db: Session, application_count: Optional[int] = None) -> JobPostResponse:
    if application_count is None:
        application_count = db.query(Application).filter(Application.job_post_id == job.id).count()
    guide = _parse_interview_guide(getattr(job, "interview_guide_json", None))
    return JobPostResponse.model_validate(job).model_copy(
        update={"application_count": application_count, "interview_guide": guide}
    )


def _team_member_row(m: JobPostTeamMember) -> JobTeamMemberResponse:
    u = m.user
    return JobTeamMemberResponse(
        id=m.id,
        job_post_id=m.job_post_id,
        user_id=m.user_id,
        user_name=u.full_name if u else "",
        user_email=(u.email if u else "") or "",
        role=m.role,
        created_at=m.created_at,
    )


@router.get("", response_model=List[JobPostResponse])
def list_jobs(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    status: Optional[str] = None,
    company_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(JobPost).options(joinedload(JobPost.company))
    if search:
        query = query.filter(JobPost.title.ilike(f"%{search}%"))
    if status:
        try:
            query = query.filter(JobPost.status == JobStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail="Statut d'offre invalide")
    if company_id:
        query = query.filter(JobPost.company_id == company_id)
    jobs = query.order_by(JobPost.created_at.desc()).offset(skip).limit(limit).all()
    return [_job_response(j, db) for j in jobs]


@router.post("", response_model=JobPostResponse, status_code=201)
def create_job(
    data: JobPostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    company = db.query(Company).filter(Company.id == data.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    job = JobPost(**data.model_dump(), created_by=current_user.id)
    db.add(job)
    db.commit()
    db.refresh(job)
    db.refresh(job, ["company"])
    return _job_response(job, db, 0)


@router.post("/{job_id}/duplicate", response_model=JobPostResponse, status_code=201)
def duplicate_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    src = db.query(JobPost).options(
        joinedload(JobPost.company),
        joinedload(JobPost.team_members),
    ).filter(JobPost.id == job_id).first()
    if not src:
        raise HTTPException(status_code=404, detail="Offre introuvable")
    copy = JobPost(
        title=f"{src.title} (copie)",
        description=src.description,
        requirements=src.requirements,
        responsibilities=src.responsibilities,
        location=src.location,
        city=src.city,
        job_type=src.job_type,
        salary_min=src.salary_min,
        salary_max=src.salary_max,
        salary_currency=src.salary_currency or "GNF",
        experience_years=src.experience_years,
        education_level=src.education_level,
        status=JobStatus.draft,
        deadline=None,
        interview_guide_json=src.interview_guide_json,
        company_id=src.company_id,
        created_by=current_user.id,
    )
    db.add(copy)
    db.flush()
    for tm in src.team_members or []:
        db.add(JobPostTeamMember(job_post_id=copy.id, user_id=tm.user_id, role=tm.role))
    log_activity(db, current_user.id, "job_post", copy.id, "duplicated_from", {"source_job_id": job_id})
    db.commit()
    db.refresh(copy)
    db.refresh(copy, ["company"])
    return _job_response(copy, db, 0)


@router.get("/{job_id}", response_model=JobPostResponse)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    job = db.query(JobPost).options(joinedload(JobPost.company)).filter(JobPost.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Offre introuvable")
    return _job_response(job, db)


@router.put("/{job_id}", response_model=JobPostResponse)
def update_job(
    job_id: int,
    data: JobPostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    job = db.query(JobPost).options(joinedload(JobPost.company)).filter(JobPost.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Offre introuvable")
    update_data = data.model_dump(exclude_unset=True)
    guide_changed = False
    nq_guide: Optional[int] = None
    if "interview_guide" in update_data:
        guide_changed = True
        ig = update_data.pop("interview_guide")
        if ig is None:
            job.interview_guide_json = None
            nq_guide = 0
        else:
            payload = InterviewGuidePayload.model_validate(ig)
            cleaned: list[InterviewGuideItem] = []
            for x in payload.items:
                q = (x.question or "").strip()
                if not q:
                    continue
                cat = (x.category or "").strip() or None
                cleaned.append(InterviewGuideItem(category=cat, question=q))
            if cleaned:
                job.interview_guide_json = json.dumps(
                    {"items": [c.model_dump() for c in cleaned]}, ensure_ascii=False
                )
            else:
                job.interview_guide_json = None
            nq_guide = len(cleaned)
    for field, value in update_data.items():
        setattr(job, field, value)
    if update_data:
        log_activity(
            db,
            current_user.id,
            "job_post",
            job_id,
            "updated",
            {k: str(v) for k, v in update_data.items()},
        )
    if guide_changed and nq_guide is not None:
        log_activity(
            db,
            current_user.id,
            "job_post",
            job_id,
            "interview_guide_updated",
            {"questions": nq_guide},
        )
    db.commit()
    db.refresh(job)
    return _job_response(job, db)


@router.delete("/{job_id}", status_code=204)
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    job = db.query(JobPost).filter(JobPost.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Offre introuvable")
    job.status = JobStatus.closed
    db.commit()


@router.get("/{job_id}/team", response_model=List[JobTeamMemberResponse])
def list_job_team(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not db.query(JobPost).filter(JobPost.id == job_id).first():
        raise HTTPException(status_code=404, detail="Offre introuvable")
    rows = (
        db.query(JobPostTeamMember)
        .options(joinedload(JobPostTeamMember.user))
        .filter(JobPostTeamMember.job_post_id == job_id)
        .order_by(JobPostTeamMember.role, JobPostTeamMember.id)
        .all()
    )
    return [_team_member_row(r) for r in rows]


@router.post("/{job_id}/team", response_model=JobTeamMemberResponse, status_code=201)
def add_job_team_member(
    job_id: int,
    data: JobTeamMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not db.query(JobPost).filter(JobPost.id == job_id).first():
        raise HTTPException(status_code=404, detail="Offre introuvable")
    assignee = db.query(User).filter(User.id == data.user_id, User.is_active == True).first()
    if not assignee:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    m = JobPostTeamMember(job_post_id=job_id, user_id=data.user_id, role=data.role)
    db.add(m)
    try:
        db.flush()
        log_activity(
            db,
            current_user.id,
            "job_post",
            job_id,
            "team_member_added",
            {"user_id": data.user_id, "role": data.role.value, "name": assignee.full_name},
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Ce collaborateur a déjà ce rôle sur cette offre")
    db.refresh(m)
    m = db.query(JobPostTeamMember).options(joinedload(JobPostTeamMember.user)).filter(JobPostTeamMember.id == m.id).first()
    return _team_member_row(m)


@router.delete("/{job_id}/team/{member_id}", status_code=204)
def remove_job_team_member(
    job_id: int,
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    m = (
        db.query(JobPostTeamMember)
        .filter(JobPostTeamMember.id == member_id, JobPostTeamMember.job_post_id == job_id)
        .first()
    )
    if not m:
        raise HTTPException(status_code=404, detail="Membre introuvable")
    meta = {"user_id": m.user_id, "role": m.role.value}
    db.delete(m)
    log_activity(db, current_user.id, "job_post", job_id, "team_member_removed", meta)
    db.commit()
