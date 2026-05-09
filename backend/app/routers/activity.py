import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import User, ActivityLog, Application, Candidate, JobPost
from app.schemas.activity import ActivityLogResponse
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/activity", tags=["Activité"])


def _row_to_response(row: ActivityLog) -> ActivityLogResponse:
    meta = None
    if row.meta:
        try:
            meta = json.loads(row.meta)
        except json.JSONDecodeError:
            meta = row.meta
    return ActivityLogResponse(
        id=row.id,
        user_id=row.user_id,
        user_name=row.user.full_name if row.user else None,
        entity_type=row.entity_type,
        entity_id=row.entity_id,
        action=row.action,
        meta=meta,
        created_at=row.created_at,
    )


@router.get("/candidate/{candidate_id}", response_model=List[ActivityLogResponse])
def activity_for_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cand = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidat introuvable")
    app_ids = [r[0] for r in db.query(Application.id).filter(Application.candidate_id == candidate_id).all()]
    conds = [and_(ActivityLog.entity_type == "candidate", ActivityLog.entity_id == candidate_id)]
    if app_ids:
        conds.append(and_(ActivityLog.entity_type == "application", ActivityLog.entity_id.in_(app_ids)))
    q = (
        db.query(ActivityLog)
        .options(joinedload(ActivityLog.user))
        .filter(or_(*conds))
        .order_by(ActivityLog.created_at.desc())
        .limit(200)
    )
    return [_row_to_response(r) for r in q.all()]


@router.get("/job/{job_id}", response_model=List[ActivityLogResponse])
def activity_for_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = db.query(JobPost).filter(JobPost.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Offre introuvable")
    app_ids = [r[0] for r in db.query(Application.id).filter(Application.job_post_id == job_id).all()]
    conds = [and_(ActivityLog.entity_type == "job_post", ActivityLog.entity_id == job_id)]
    if app_ids:
        conds.append(and_(ActivityLog.entity_type == "application", ActivityLog.entity_id.in_(app_ids)))
    q = (
        db.query(ActivityLog)
        .options(joinedload(ActivityLog.user))
        .filter(or_(*conds))
        .order_by(ActivityLog.created_at.desc())
        .limit(200)
    )
    return [_row_to_response(r) for r in q.all()]
