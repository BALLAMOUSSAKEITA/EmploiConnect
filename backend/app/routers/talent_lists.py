from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.database import get_db
from app.models import User, TalentList, CandidateTalentList, Candidate
from app.schemas.talent_list import TalentListCreate, TalentListUpdate, TalentListResponse
from app.auth.dependencies import get_current_user
from app.query_filters import candidate_is_listed

router = APIRouter(prefix="/talent-lists", tags=["Vivier — listes"])


def _list_response(db: Session, row: TalentList) -> TalentListResponse:
    cnt = (
        db.query(func.count(CandidateTalentList.id))
        .filter(CandidateTalentList.talent_list_id == row.id)
        .scalar()
        or 0
    )
    return TalentListResponse(
        id=row.id,
        name=row.name,
        description=row.description,
        created_by=row.created_by,
        created_at=row.created_at,
        member_count=int(cnt),
    )


@router.get("", response_model=List[TalentListResponse])
def list_talent_lists(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = db.query(TalentList).order_by(TalentList.name.asc()).all()
    return [_list_response(db, r) for r in rows]


@router.post("", response_model=TalentListResponse, status_code=201)
def create_talent_list(
    data: TalentListCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = TalentList(
        name=data.name.strip(),
        description=(data.description or "").strip() or None,
        created_by=current_user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _list_response(db, row)


@router.put("/{list_id}", response_model=TalentListResponse)
def update_talent_list(
    list_id: int,
    data: TalentListUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.query(TalentList).filter(TalentList.id == list_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Liste introuvable")
    u = data.model_dump(exclude_unset=True)
    if "name" in u:
        row.name = u["name"].strip()
    if "description" in u:
        v = u["description"]
        if v is None:
            row.description = None
        else:
            row.description = str(v).strip() or None
    db.commit()
    db.refresh(row)
    return _list_response(db, row)


@router.delete("/{list_id}", status_code=204)
def delete_talent_list(
    list_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.query(TalentList).filter(TalentList.id == list_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Liste introuvable")
    db.delete(row)
    db.commit()


@router.post("/{list_id}/members/{candidate_id}", status_code=204)
def add_list_member(
    list_id: int,
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not db.query(TalentList).filter(TalentList.id == list_id).first():
        raise HTTPException(status_code=404, detail="Liste introuvable")
    cand = db.query(Candidate).filter(Candidate.id == candidate_id).filter(candidate_is_listed()).first()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidat introuvable")
    exists = (
        db.query(CandidateTalentList)
        .filter(
            CandidateTalentList.talent_list_id == list_id,
            CandidateTalentList.candidate_id == candidate_id,
        )
        .first()
    )
    if exists:
        return
    db.add(CandidateTalentList(talent_list_id=list_id, candidate_id=candidate_id))
    db.commit()


@router.delete("/{list_id}/members/{candidate_id}", status_code=204)
def remove_list_member(
    list_id: int,
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = (
        db.query(CandidateTalentList)
        .filter(
            CandidateTalentList.talent_list_id == list_id,
            CandidateTalentList.candidate_id == candidate_id,
        )
        .first()
    )
    if row:
        db.delete(row)
        db.commit()
