from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.database import get_db
from app.models import JobPost, Company, Application, JobStatus
from app.schemas.job import JobPostCreate, JobPostUpdate, JobPostResponse
from app.auth.dependencies import get_current_user
from app.models import User

router = APIRouter(prefix="/jobs", tags=["Offres d'emploi"])


@router.get("/", response_model=List[JobPostResponse])
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
        query = query.filter(JobPost.status == status)
    if company_id:
        query = query.filter(JobPost.company_id == company_id)
    jobs = query.order_by(JobPost.created_at.desc()).offset(skip).limit(limit).all()
    result = []
    for j in jobs:
        count = db.query(Application).filter(Application.job_post_id == j.id).count()
        result.append({**j.__dict__, "application_count": count})
    return result


@router.post("/", response_model=JobPostResponse, status_code=201)
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
    return {**job.__dict__, "application_count": 0}


@router.get("/{job_id}", response_model=JobPostResponse)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    job = db.query(JobPost).options(joinedload(JobPost.company)).filter(JobPost.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Offre introuvable")
    count = db.query(Application).filter(Application.job_post_id == job_id).count()
    return {**job.__dict__, "application_count": count}


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
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(job, field, value)
    db.commit()
    db.refresh(job)
    count = db.query(Application).filter(Application.job_post_id == job_id).count()
    return {**job.__dict__, "application_count": count}


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
