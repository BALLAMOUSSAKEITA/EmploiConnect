from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
import os
import uuid
import json
import hashlib
from datetime import datetime, timezone

from app.database import get_db
from app.models import Candidate, CVFile, CandidateTalentList, TalentList
from app.schemas.candidate import CandidateCreate, CandidateUpdate, CandidateResponse, CVFileResponse
from app.schemas.talent_list import TalentListBrief
from app.schemas.bulk_cv import (
    BulkCvImportRow,
    BulkCvImportResponse,
    DuplicateCandidateBrief,
    DuplicateGroup,
    DuplicateCandidatesResponse,
)
from app.auth.dependencies import get_current_user
from app.models import User
from app.query_filters import candidate_is_listed
from app.services import duplicate_detection as duplicate_detection_svc
from app.services import cv_extract
from dotenv import load_dotenv

load_dotenv()
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")

MAX_BULK_FILES = 40
MAX_CV_BYTES = 12 * 1024 * 1024

router = APIRouter(prefix="/candidates", tags=["Candidats"])


def _persist_cv_file(
    db: Session,
    candidate_id: int,
    original_filename: str,
    contents: bytes,
    ext: str,
    sha256_hex: str,
) -> CVFile:
    file_uuid = str(uuid.uuid4())
    save_name = f"{file_uuid}{ext}"
    save_path = os.path.join(UPLOAD_DIR, "cvs", save_name)
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    with open(save_path, "wb") as f:
        f.write(contents)
    db.query(CVFile).filter(CVFile.candidate_id == candidate_id).update({"is_primary": False})
    cv = CVFile(
        candidate_id=candidate_id,
        file_name=original_filename or save_name,
        file_path=save_path,
        file_size=len(contents),
        is_primary=True,
        content_sha256=sha256_hex,
    )
    db.add(cv)
    return cv


def _normalize_tags(raw: List[str]) -> List[str]:
    out: List[str] = []
    seen_set: set[str] = set()
    for t in raw:
        s = (t or "").strip()
        if not s:
            continue
        key = s.lower()
        if key in seen_set:
            continue
        seen_set.add(key)
        out.append(s)
    return out


def _tags_to_json(tags: Optional[List[str]]) -> Optional[str]:
    if tags is None:
        return None
    t = _normalize_tags(tags)
    if not t:
        return None
    return json.dumps(t, ensure_ascii=False)


def _parse_tags(raw: Optional[str]) -> List[str]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            return [str(x).strip() for x in data if str(x).strip()]
    except json.JSONDecodeError:
        pass
    return []


def _candidate_to_response(c: Candidate) -> CandidateResponse:
    lists: List[TalentListBrief] = []
    for m in c.talent_list_memberships or []:
        if m.talent_list:
            lists.append(TalentListBrief(id=m.talent_list.id, name=m.talent_list.name))
    lists.sort(key=lambda x: x.name.lower())
    return CandidateResponse(
        id=c.id,
        first_name=c.first_name,
        last_name=c.last_name,
        email=c.email,
        phone=c.phone,
        address=c.address,
        city=c.city,
        nationality=c.nationality,
        date_of_birth=c.date_of_birth,
        gender=c.gender,
        skills=c.skills,
        languages=c.languages,
        experience_years=c.experience_years,
        education_level=c.education_level,
        current_position=c.current_position,
        current_company=c.current_company,
        linkedin_url=c.linkedin_url,
        notes=c.notes,
        is_active=c.is_active,
        created_at=c.created_at,
        updated_at=c.updated_at,
        cv_files=[CVFileResponse.model_validate(f) for f in c.cv_files],
        tags=_parse_tags(c.tags_json),
        recontact_at=c.recontact_at,
        recontact_note=c.recontact_note,
        talent_lists=lists,
    )


def _candidate_query(db: Session):
    return (
        db.query(Candidate)
        .options(
            joinedload(Candidate.cv_files),
            joinedload(Candidate.talent_list_memberships).joinedload(CandidateTalentList.talent_list),
        )
        .filter(candidate_is_listed())
    )


@router.get("", response_model=List[CandidateResponse])
def list_candidates(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    list_id: Optional[int] = None,
    tag: Optional[str] = None,
    recontact_due: bool = False,
    has_recontact: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = _candidate_query(db)
    if search:
        query = query.filter(
            (Candidate.first_name.ilike(f"%{search}%"))
            | (Candidate.last_name.ilike(f"%{search}%"))
            | (Candidate.email.ilike(f"%{search}%"))
            | (Candidate.skills.ilike(f"%{search}%"))
        )
    if list_id is not None:
        query = query.join(CandidateTalentList).filter(CandidateTalentList.talent_list_id == list_id)
    if tag and tag.strip():
        t = tag.strip()
        query = query.filter(Candidate.tags_json.isnot(None)).filter(Candidate.tags_json.ilike(f'%"{t}"%'))
    if recontact_due:
        now = datetime.now(timezone.utc)
        query = query.filter(Candidate.recontact_at.isnot(None), Candidate.recontact_at <= now)
    if has_recontact is True:
        query = query.filter(Candidate.recontact_at.isnot(None))
    elif has_recontact is False:
        query = query.filter(Candidate.recontact_at.is_(None))
    rows = query.order_by(Candidate.created_at.desc()).offset(skip).limit(limit).all()
    return [_candidate_to_response(c) for c in rows]


@router.post("", response_model=CandidateResponse, status_code=201)
def create_candidate(
    data: CandidateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(Candidate).filter(Candidate.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Un candidat avec cet email existe déjà")
    dump = data.model_dump()
    tags = dump.pop("tags", None)
    candidate = Candidate(**dump)
    candidate.is_active = True
    if tags is not None:
        candidate.tags_json = _tags_to_json(tags)
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    c = (
        _candidate_query(db)
        .filter(Candidate.id == candidate.id)
        .first()
    )
    return _candidate_to_response(c)


@router.get("/duplicate-candidates", response_model=DuplicateCandidatesResponse)
def list_duplicate_candidate_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    raw = duplicate_detection_svc.find_duplicate_groups(db)
    groups: List[DuplicateGroup] = []
    for g in raw:
        groups.append(
            DuplicateGroup(
                reason=g["reason"],
                key=g["key"],
                candidates=[
                    DuplicateCandidateBrief(
                        id=c.id,
                        email=c.email,
                        first_name=c.first_name,
                        last_name=c.last_name,
                        phone=c.phone,
                    )
                    for c in g["candidates"]
                ],
            )
        )
    return DuplicateCandidatesResponse(groups=groups)


@router.post("/bulk-cv-import", response_model=BulkCvImportResponse)
async def bulk_cv_import(
    files: List[UploadFile] = File(...),
    on_duplicate: str = Form("attach_cv"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if on_duplicate not in ("skip", "attach_cv"):
        raise HTTPException(
            status_code=400,
            detail="on_duplicate doit être « skip » ou « attach_cv »",
        )
    if len(files) > MAX_BULK_FILES:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_BULK_FILES} fichiers autorisés")

    results: List[BulkCvImportRow] = []
    created = attached = skipped = errors = 0

    for uf in files:
        fn = uf.filename or "document.pdf"
        try:
            contents = await uf.read()
        except Exception:
            results.append(
                BulkCvImportRow(file_name=fn, status="error", message="Lecture du fichier impossible")
            )
            errors += 1
            continue

        if len(contents) > MAX_CV_BYTES:
            results.append(
                BulkCvImportRow(
                    file_name=fn,
                    status="error",
                    message=f"Fichier trop volumineux (max {MAX_CV_BYTES // (1024 * 1024)} Mo)",
                )
            )
            errors += 1
            continue

        ext = os.path.splitext(fn)[1].lower()
        if ext not in (".pdf", ".docx"):
            results.append(
                BulkCvImportRow(
                    file_name=fn,
                    status="error",
                    message="Import automatique : PDF ou DOCX uniquement",
                )
            )
            errors += 1
            continue

        try:
            text = cv_extract.extract_text_cv(contents, ext)
        except Exception as ex:
            results.append(
                BulkCvImportRow(
                    file_name=fn,
                    status="error",
                    message=str(ex) or "Impossible d’extraire le texte du CV",
                )
            )
            errors += 1
            continue

        email = cv_extract.pick_contact_email(text)
        if not email:
            results.append(
                BulkCvImportRow(
                    file_name=fn,
                    status="error",
                    message="Aucun email de contact détecté dans le CV",
                )
            )
            errors += 1
            continue

        sha = hashlib.sha256(contents).hexdigest()
        existing_cv = db.query(CVFile).filter(CVFile.content_sha256 == sha).first()
        if existing_cv:
            cand_same = (
                db.query(Candidate)
                .filter(Candidate.email == email)
                .filter(candidate_is_listed())
                .first()
            )
            if cand_same and existing_cv.candidate_id == cand_same.id:
                results.append(
                    BulkCvImportRow(
                        file_name=fn,
                        status="skipped_duplicate",
                        candidate_id=cand_same.id,
                        email_detected=email,
                        message="Ce CV est déjà enregistré pour ce candidat",
                    )
                )
                skipped += 1
                continue
            results.append(
                BulkCvImportRow(
                    file_name=fn,
                    status="duplicate_file",
                    candidate_id=existing_cv.candidate_id,
                    email_detected=email,
                    message=f"Fichier identique à un CV déjà rattaché au candidat n°{existing_cv.candidate_id}",
                )
            )
            skipped += 1
            continue

        cand = (
            db.query(Candidate)
            .filter(Candidate.email == email)
            .filter(candidate_is_listed())
            .first()
        )

        if cand:
            if on_duplicate == "skip":
                results.append(
                    BulkCvImportRow(
                        file_name=fn,
                        status="skipped_duplicate",
                        candidate_id=cand.id,
                        email_detected=email,
                        message="Email déjà présent (ignoré)",
                    )
                )
                skipped += 1
                continue
            try:
                _persist_cv_file(db, cand.id, fn, contents, ext, sha)
                db.commit()
                db.refresh(cand)
            except Exception as ex:
                db.rollback()
                results.append(
                    BulkCvImportRow(file_name=fn, status="error", message=str(ex) or "Erreur d’enregistrement")
                )
                errors += 1
                continue
            results.append(
                BulkCvImportRow(
                    file_name=fn,
                    status="attached",
                    candidate_id=cand.id,
                    email_detected=email,
                    message="CV ajouté au candidat existant",
                )
            )
            attached += 1
            continue

        first_name, last_name = cv_extract.guess_name_from_text(text, fn)
        if last_name == "À compléter" and first_name in ("Candidat", "Import"):
            first_name, last_name = cv_extract.name_from_email_local(email)

        new_c = Candidate(
            first_name=first_name,
            last_name=last_name,
            email=email,
            notes="Créé par import CV masse",
            tags_json=_tags_to_json(["import-masse"]),
            is_active=True,
        )
        db.add(new_c)
        try:
            db.commit()
            db.refresh(new_c)
        except IntegrityError:
            db.rollback()
            cand = (
                db.query(Candidate)
                .filter(Candidate.email == email)
                .filter(candidate_is_listed())
                .first()
            )
            if not cand:
                results.append(
                    BulkCvImportRow(
                        file_name=fn,
                        status="error",
                        email_detected=email,
                        message="Conflit lors de la création du candidat",
                    )
                )
                errors += 1
                continue
            if on_duplicate == "skip":
                results.append(
                    BulkCvImportRow(
                        file_name=fn,
                        status="skipped_duplicate",
                        candidate_id=cand.id,
                        email_detected=email,
                        message="Email déjà présent (conflit parallèle)",
                    )
                )
                skipped += 1
                continue
            try:
                _persist_cv_file(db, cand.id, fn, contents, ext, sha)
                db.commit()
            except Exception as ex:
                db.rollback()
                results.append(
                    BulkCvImportRow(file_name=fn, status="error", message=str(ex) or "Erreur d’enregistrement")
                )
                errors += 1
                continue
            results.append(
                BulkCvImportRow(
                    file_name=fn,
                    status="attached",
                    candidate_id=cand.id,
                    email_detected=email,
                    message="Candidat existant : CV ajouté",
                )
            )
            attached += 1
            continue

        try:
            _persist_cv_file(db, new_c.id, fn, contents, ext, sha)
            db.commit()
        except Exception as ex:
            db.rollback()
            results.append(
                BulkCvImportRow(file_name=fn, status="error", message=str(ex) or "Erreur d’enregistrement")
            )
            errors += 1
            continue

        results.append(
            BulkCvImportRow(
                file_name=fn,
                status="created",
                candidate_id=new_c.id,
                email_detected=email,
                message="Candidat créé et CV enregistré",
            )
        )
        created += 1

    return BulkCvImportResponse(
        results=results,
        created=created,
        attached=attached,
        skipped=skipped,
        errors=errors,
    )


@router.get("/{candidate_id}", response_model=CandidateResponse)
def get_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    candidate = (
        _candidate_query(db)
        .filter(Candidate.id == candidate_id)
        .first()
    )
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidat introuvable")
    return _candidate_to_response(candidate)


@router.put("/{candidate_id}", response_model=CandidateResponse)
def update_candidate(
    candidate_id: int,
    data: CandidateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidat introuvable")
    update_data = data.model_dump(exclude_unset=True)
    if "tags" in update_data:
        candidate.tags_json = _tags_to_json(update_data.pop("tags"))
    if "talent_list_ids" in update_data:
        ids = list(dict.fromkeys(update_data.pop("talent_list_ids") or []))
        db.query(CandidateTalentList).filter(CandidateTalentList.candidate_id == candidate.id).delete(
            synchronize_session=False
        )
        for lid in ids:
            if db.query(TalentList).filter(TalentList.id == lid).first():
                db.add(CandidateTalentList(candidate_id=candidate.id, talent_list_id=lid))
    for field, value in update_data.items():
        setattr(candidate, field, value)
    db.commit()
    c = (
        _candidate_query(db)
        .filter(Candidate.id == candidate_id)
        .first()
    )
    return _candidate_to_response(c)


@router.delete("/{candidate_id}", status_code=204)
def delete_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
    current_user: User = Depends(get_current_user),
):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidat introuvable")

    allowed = [".pdf", ".doc", ".docx"]
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail="Format non supporté. Utilisez PDF, DOC ou DOCX")

    contents = await file.read()
    sha = hashlib.sha256(contents).hexdigest()
    cv = _persist_cv_file(
        db,
        candidate_id,
        file.filename or f"cv{ext}",
        contents,
        ext,
        sha,
    )
    db.commit()
    db.refresh(cv)
    return {"message": "CV uploadé avec succès", "cv_id": cv.id, "file_name": cv.file_name}
