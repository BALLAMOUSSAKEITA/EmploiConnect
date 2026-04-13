from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.database import get_db
from app.models import Application, Candidate, JobPost, Interview, User
from app.schemas.recruitment import (
    ApplicationCreate, ApplicationUpdate, ApplicationResponse,
    InterviewCreate, InterviewUpdate, InterviewResponse
)
from app.auth.dependencies import get_current_user

router = APIRouter(tags=["Recrutement"])


# ---- Applications ----

@router.get("/applications", response_model=List[ApplicationResponse])
def list_applications(
    skip: int = 0,
    limit: int = 50,
    job_id: Optional[int] = None,
    candidate_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Application).options(
        joinedload(Application.candidate),
        joinedload(Application.job_post).joinedload(JobPost.company)
    )
    if job_id:
        query = query.filter(Application.job_post_id == job_id)
    if candidate_id:
        query = query.filter(Application.candidate_id == candidate_id)
    if status:
        query = query.filter(Application.status == status)
    apps = query.order_by(Application.applied_at.desc()).offset(skip).limit(limit).all()
    result = []
    for a in apps:
        result.append({
            **a.__dict__,
            "candidate_name": f"{a.candidate.first_name} {a.candidate.last_name}" if a.candidate else None,
            "job_title": a.job_post.title if a.job_post else None,
            "company_name": a.job_post.company.name if a.job_post and a.job_post.company else None,
        })
    return result


@router.post("/applications", response_model=ApplicationResponse, status_code=201)
def create_application(
    data: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    candidate = db.query(Candidate).filter(Candidate.id == data.candidate_id).first()
    job = db.query(JobPost).options(joinedload(JobPost.company)).filter(JobPost.id == data.job_post_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidat introuvable")
    if not job:
        raise HTTPException(status_code=404, detail="Offre introuvable")
    existing = db.query(Application).filter(
        Application.candidate_id == data.candidate_id,
        Application.job_post_id == data.job_post_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ce candidat a déjà postulé à cette offre")
    app = Application(**data.model_dump())
    db.add(app)
    db.commit()
    db.refresh(app)
    return {
        **app.__dict__,
        "candidate_name": f"{candidate.first_name} {candidate.last_name}",
        "job_title": job.title,
        "company_name": job.company.name if job.company else None,
    }


@router.put("/applications/{app_id}", response_model=ApplicationResponse)
def update_application(
    app_id: int,
    data: ApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    app = db.query(Application).options(
        joinedload(Application.candidate),
        joinedload(Application.job_post).joinedload(JobPost.company)
    ).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Candidature introuvable")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(app, field, value)
    db.commit()
    db.refresh(app)
    return {
        **app.__dict__,
        "candidate_name": f"{app.candidate.first_name} {app.candidate.last_name}" if app.candidate else None,
        "job_title": app.job_post.title if app.job_post else None,
        "company_name": app.job_post.company.name if app.job_post and app.job_post.company else None,
    }


# ---- Interviews ----

@router.get("/interviews", response_model=List[InterviewResponse])
def list_interviews(
    skip: int = 0,
    limit: int = 50,
    application_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Interview).options(
        joinedload(Interview.application).joinedload(Application.candidate),
        joinedload(Interview.application).joinedload(Application.job_post),
        joinedload(Interview.interviewer)
    )
    if application_id:
        query = query.filter(Interview.application_id == application_id)
    interviews = query.order_by(Interview.scheduled_at.desc()).offset(skip).limit(limit).all()
    result = []
    for i in interviews:
        cand = i.application.candidate if i.application else None
        job = i.application.job_post if i.application else None
        result.append({
            **i.__dict__,
            "candidate_name": f"{cand.first_name} {cand.last_name}" if cand else None,
            "job_title": job.title if job else None,
            "interviewer_name": i.interviewer.full_name if i.interviewer else None,
        })
    return result


@router.post("/interviews", response_model=InterviewResponse, status_code=201)
def create_interview(
    data: InterviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    app = db.query(Application).options(
        joinedload(Application.candidate),
        joinedload(Application.job_post)
    ).filter(Application.id == data.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Candidature introuvable")
    interviewer = db.query(User).filter(User.id == data.interviewer_id).first()
    if not interviewer:
        raise HTTPException(status_code=404, detail="Interviewer introuvable")
    interview = Interview(**data.model_dump())
    db.add(interview)
    db.commit()
    db.refresh(interview)
    cand = app.candidate
    job = app.job_post
    return {
        **interview.__dict__,
        "candidate_name": f"{cand.first_name} {cand.last_name}" if cand else None,
        "job_title": job.title if job else None,
        "interviewer_name": interviewer.full_name,
    }


@router.put("/interviews/{interview_id}", response_model=InterviewResponse)
def update_interview(
    interview_id: int,
    data: InterviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    interview = db.query(Interview).options(
        joinedload(Interview.application).joinedload(Application.candidate),
        joinedload(Interview.application).joinedload(Application.job_post),
        joinedload(Interview.interviewer)
    ).filter(Interview.id == interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Entretien introuvable")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(interview, field, value)
    db.commit()
    db.refresh(interview)
    cand = interview.application.candidate if interview.application else None
    job = interview.application.job_post if interview.application else None
    return {
        **interview.__dict__,
        "candidate_name": f"{cand.first_name} {cand.last_name}" if cand else None,
        "job_title": job.title if job else None,
        "interviewer_name": interview.interviewer.full_name if interview.interviewer else None,
    }
