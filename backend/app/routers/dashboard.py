from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timedelta, timezone
from app.database import get_db
from app.models import User, Company, JobPost, Candidate, Application, Interview, JobStatus, ApplicationStatus, InterviewResult
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
    upcoming_interviews = db.query(Interview).filter(Interview.result == InterviewResult.pending).count()

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


@router.get("/reminders")
def get_reminders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    in72h = now + timedelta(hours=72)
    in7d = now + timedelta(days=7)
    week_ago = now - timedelta(days=7)

    interv = (
        db.query(Interview)
        .options(
            joinedload(Interview.application).joinedload(Application.candidate),
            joinedload(Interview.application).joinedload(Application.job_post),
        )
        .filter(
            Interview.result == InterviewResult.pending,
            Interview.scheduled_at >= now,
            Interview.scheduled_at <= in72h,
        )
        .order_by(Interview.scheduled_at)
        .limit(25)
        .all()
    )
    interviews_soon = []
    for i in interv:
        cand = i.application.candidate if i.application else None
        job = i.application.job_post if i.application else None
        interviews_soon.append({
            "id": i.id,
            "scheduled_at": i.scheduled_at.isoformat() if i.scheduled_at else None,
            "candidate_name": f"{cand.first_name} {cand.last_name}" if cand else None,
            "job_title": job.title if job else None,
            "application_id": i.application_id,
        })

    closing_jobs = (
        db.query(JobPost)
        .options(joinedload(JobPost.company))
        .filter(
            JobPost.status == JobStatus.open,
            JobPost.deadline.isnot(None),
            JobPost.deadline >= now,
            JobPost.deadline <= in7d,
        )
        .order_by(JobPost.deadline)
        .limit(25)
        .all()
    )
    jobs_closing_soon = [
        {
            "id": j.id,
            "title": j.title,
            "deadline": j.deadline.isoformat() if j.deadline else None,
            "company_name": j.company.name if j.company else None,
        }
        for j in closing_jobs
    ]

    stale_apps = (
        db.query(Application)
        .options(joinedload(Application.candidate), joinedload(Application.job_post))
        .filter(
            Application.status.in_([ApplicationStatus.applied, ApplicationStatus.screening]),
            Application.applied_at < week_ago,
        )
        .order_by(Application.applied_at)
        .limit(40)
        .all()
    )
    applications_stale = []
    for a in stale_apps:
        st = a.status.value if hasattr(a.status, "value") else str(a.status)
        cand = a.candidate
        jp = a.job_post
        applications_stale.append({
            "id": a.id,
            "candidate_name": f"{cand.first_name} {cand.last_name}" if cand else None,
            "job_title": jp.title if jp else None,
            "status": st,
            "applied_at": a.applied_at.isoformat() if a.applied_at else None,
            "candidate_id": a.candidate_id,
            "job_post_id": a.job_post_id,
        })

    return {
        "interviews_soon": interviews_soon,
        "jobs_closing_soon": jobs_closing_soon,
        "applications_stale": applications_stale,
    }
