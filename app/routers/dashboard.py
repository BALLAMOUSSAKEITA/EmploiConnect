from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Company, JobPost, Candidate, Application, Interview, JobStatus, ApplicationStatus
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total_jobs = db.query(JobPost).count()
    open_jobs = db.query(JobPost).filter(JobPost.status == JobStatus.open).count()
    total_candidates = db.query(Candidate).filter(Candidate.is_active == True).count()
    total_companies = db.query(Company).filter(Company.is_active == True).count()
    total_applications = db.query(Application).count()
    hired = db.query(Application).filter(Application.status == ApplicationStatus.hired).count()
    upcoming_interviews = db.query(Interview).filter(Interview.result == "En attente").count()

    recent_applications = db.query(Application).order_by(Application.applied_at.desc()).limit(5).all()
    recent_data = []
    for a in recent_applications:
        cand = db.query(Candidate).filter(Candidate.id == a.candidate_id).first()
        job = db.query(JobPost).filter(JobPost.id == a.job_post_id).first()
        company = db.query(Company).filter(Company.id == job.company_id).first() if job else None
        recent_data.append({
            "id": a.id,
            "candidate_name": f"{cand.first_name} {cand.last_name}" if cand else "Inconnu",
            "job_title": job.title if job else "Inconnu",
            "company_name": company.name if company else "Inconnu",
            "status": a.status,
            "applied_at": a.applied_at,
        })

    return {
        "total_jobs": total_jobs,
        "open_jobs": open_jobs,
        "total_candidates": total_candidates,
        "total_companies": total_companies,
        "total_applications": total_applications,
        "hired_count": hired,
        "upcoming_interviews": upcoming_interviews,
        "recent_applications": recent_data,
    }
