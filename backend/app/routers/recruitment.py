import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.database import get_db
from app.models import Application, Candidate, JobPost, Interview, User, ApplicationStatus, ApplicationComment
from app.schemas.recruitment import (
    ApplicationCreate, ApplicationUpdate, ApplicationResponse,
    InterviewCreate, InterviewUpdate, InterviewResponse,
    InterviewScorecardPayload,
)
from app.schemas.comment import ApplicationCommentCreate, ApplicationCommentResponse
from app.auth.dependencies import get_current_user
from app.services.activity import log_activity

router = APIRouter(tags=["Recrutement"])


def _parse_interview_scorecard(raw: Optional[str]) -> tuple[Optional[InterviewScorecardPayload], Optional[float]]:
    if not raw or not str(raw).strip():
        return None, None
    try:
        payload = InterviewScorecardPayload.model_validate(json.loads(raw))
    except Exception:
        return None, None
    if not payload.items:
        return payload, None
    ratios = []
    for it in payload.items:
        cap = max(it.max, 1)
        ratios.append(min(it.score, cap) / cap)
    avg_pct = round(100.0 * sum(ratios) / len(ratios), 1)
    return payload, avg_pct


def _application_response(a: Application, candidate_name=None, job_title=None, company_name=None) -> ApplicationResponse:
    return ApplicationResponse.model_validate(a).model_copy(update={
        "candidate_name": candidate_name,
        "job_title": job_title,
        "company_name": company_name,
    })


def _interview_response(i: Interview, candidate_name=None, job_title=None, interviewer_name=None) -> InterviewResponse:
    sc_payload, sc_avg = _parse_interview_scorecard(getattr(i, "scorecard_json", None))
    return InterviewResponse.model_validate(i).model_copy(
        update={
            "candidate_name": candidate_name,
            "job_title": job_title,
            "interviewer_name": interviewer_name,
            "scorecard": sc_payload,
            "scorecard_average_pct": sc_avg,
        }
    )


# ---- Applications ----

@router.get("/applications", response_model=List[ApplicationResponse])
def list_applications(
    skip: int = 0,
    limit: int = 500,
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
        try:
            query = query.filter(Application.status == ApplicationStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail="Statut de candidature invalide")
    apps = query.order_by(Application.applied_at.desc()).offset(skip).limit(limit).all()
    result = []
    for a in apps:
        result.append(_application_response(
            a,
            candidate_name=f"{a.candidate.first_name} {a.candidate.last_name}" if a.candidate else None,
            job_title=a.job_post.title if a.job_post else None,
            company_name=a.job_post.company.name if a.job_post and a.job_post.company else None,
        ))
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
    db.flush()
    log_activity(
        db,
        current_user.id,
        "application",
        app.id,
        "created",
        {"candidate_id": data.candidate_id, "job_post_id": data.job_post_id},
    )
    db.commit()
    db.refresh(app)
    return _application_response(
        app,
        candidate_name=f"{candidate.first_name} {candidate.last_name}",
        job_title=job.title,
        company_name=job.company.name if job.company else None,
    )


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
    updates = data.model_dump(exclude_unset=True)
    old_status = app.status
    for field, value in updates.items():
        setattr(app, field, value)
    if "status" in updates and old_status != app.status:
        log_activity(
            db,
            current_user.id,
            "application",
            app_id,
            "status_changed",
            {
                "old": old_status.value if hasattr(old_status, "value") else str(old_status),
                "new": app.status.value if hasattr(app.status, "value") else str(app.status),
            },
        )
    db.commit()
    db.refresh(app)
    return _application_response(
        app,
        candidate_name=f"{app.candidate.first_name} {app.candidate.last_name}" if app.candidate else None,
        job_title=app.job_post.title if app.job_post else None,
        company_name=app.job_post.company.name if app.job_post and app.job_post.company else None,
    )


def _comment_response(c: ApplicationComment) -> ApplicationCommentResponse:
    mids = None
    if c.mentioned_user_ids:
        try:
            mids = json.loads(c.mentioned_user_ids)
        except json.JSONDecodeError:
            mids = None
    return ApplicationCommentResponse(
        id=c.id,
        application_id=c.application_id,
        user_id=c.user_id,
        user_name=c.user.full_name if c.user else None,
        body=c.body,
        mentioned_user_ids=mids,
        created_at=c.created_at,
    )


@router.get("/applications/{app_id}/comments", response_model=List[ApplicationCommentResponse])
def list_application_comments(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Candidature introuvable")
    rows = (
        db.query(ApplicationComment)
        .options(joinedload(ApplicationComment.user))
        .filter(ApplicationComment.application_id == app_id)
        .order_by(ApplicationComment.created_at.asc())
        .all()
    )
    return [_comment_response(c) for c in rows]


@router.post("/applications/{app_id}/comments", response_model=ApplicationCommentResponse, status_code=201)
def create_application_comment(
    app_id: int,
    body: ApplicationCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Candidature introuvable")
    mids = json.dumps(body.mentioned_user_ids) if body.mentioned_user_ids else None
    c = ApplicationComment(
        application_id=app_id,
        user_id=current_user.id,
        body=body.body.strip(),
        mentioned_user_ids=mids,
    )
    db.add(c)
    db.flush()
    log_activity(
        db,
        current_user.id,
        "application",
        app_id,
        "comment_added",
        {"preview": body.body.strip()[:160]},
    )
    db.commit()
    db.refresh(c)
    c = db.query(ApplicationComment).options(joinedload(ApplicationComment.user)).filter(ApplicationComment.id == c.id).first()
    return _comment_response(c)


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
        result.append(_interview_response(
            i,
            candidate_name=f"{cand.first_name} {cand.last_name}" if cand else None,
            job_title=job.title if job else None,
            interviewer_name=i.interviewer.full_name if i.interviewer else None,
        ))
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
    return _interview_response(
        interview,
        candidate_name=f"{cand.first_name} {cand.last_name}" if cand else None,
        job_title=job.title if job else None,
        interviewer_name=interviewer.full_name,
    )


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
    update_data = data.model_dump(exclude_unset=True)
    if "scorecard" in update_data:
        sc = update_data.pop("scorecard")
        if sc is not None:
            interview.scorecard_json = json.dumps(sc)
        else:
            interview.scorecard_json = None
    for field, value in update_data.items():
        setattr(interview, field, value)
    db.commit()
    db.refresh(interview)
    cand = interview.application.candidate if interview.application else None
    job = interview.application.job_post if interview.application else None
    return _interview_response(
        interview,
        candidate_name=f"{cand.first_name} {cand.last_name}" if cand else None,
        job_title=job.title if job else None,
        interviewer_name=interview.interviewer.full_name if interview.interviewer else None,
    )
