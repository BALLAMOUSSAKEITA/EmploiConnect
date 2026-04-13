from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
import aiofiles
from app.database import get_db
from app.models import Candidate, CVFile
from app.schemas.candidate import CandidateCreate, CandidateUpdate, CandidateResponse
from app.auth.dependencies import get_current_user
from app.models import User
from dotenv import load_dotenv

load_dotenv()
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")

router = APIRouter(prefix="/candidates", tags=["Candidats"])


@router.get("/", response_model=List[CandidateResponse])
def list_candidates(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Candidate).filter(Candidate.is_active == True)
    if search:
        query = query.filter(
            (Candidate.first_name.ilike(f"%{search}%")) |
            (Candidate.last_name.ilike(f"%{search}%")) |
            (Candidate.email.ilike(f"%{search}%")) |
            (Candidate.skills.ilike(f"%{search}%"))
        )
    return query.order_by(Candidate.created_at.desc()).offset(skip).limit(limit).all()


@router.post("/", response_model=CandidateResponse, status_code=201)
def create_candidate(
    data: CandidateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = db.query(Candidate).filter(Candidate.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Un candidat avec cet email existe déjà")
    candidate = Candidate(**data.model_dump())
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate


@router.get("/{candidate_id}", response_model=CandidateResponse)
def get_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidat introuvable")
    return candidate


@router.put("/{candidate_id}", response_model=CandidateResponse)
def update_candidate(
    candidate_id: int,
    data: CandidateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidat introuvable")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(candidate, field, value)
    db.commit()
    db.refresh(candidate)
    return candidate


@router.delete("/{candidate_id}", status_code=204)
def delete_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidat introuvable")
    candidate.is_active = False
    db.commit()


@router.post("/{candidate_id}/cv", status_code=201)
async def upload_cv(
    candidate_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidat introuvable")

    allowed = [".pdf", ".doc", ".docx"]
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail="Format non supporté. Utilisez PDF, DOC ou DOCX")

    file_uuid = str(uuid.uuid4())
    save_name = f"{file_uuid}{ext}"
    save_path = os.path.join(UPLOAD_DIR, "cvs", save_name)

    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    contents = await file.read()
    with open(save_path, "wb") as f:
        f.write(contents)

    db.query(CVFile).filter(CVFile.candidate_id == candidate_id).update({"is_primary": False})

    cv = CVFile(
        candidate_id=candidate_id,
        file_name=file.filename,
        file_path=save_path,
        file_size=len(contents),
        is_primary=True
    )
    db.add(cv)
    db.commit()
    db.refresh(cv)
    return {"message": "CV uploadé avec succès", "cv_id": cv.id, "file_name": cv.file_name}
