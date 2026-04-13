from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Company, JobPost
from app.schemas.company import CompanyCreate, CompanyUpdate, CompanyResponse
from app.auth.dependencies import get_current_user
from app.models import User

router = APIRouter(prefix="/companies", tags=["Entreprises"])


@router.get("/", response_model=List[CompanyResponse])
def list_companies(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Company).filter(Company.is_active == True)
    if search:
        query = query.filter(Company.name.ilike(f"%{search}%"))
    companies = query.offset(skip).limit(limit).all()
    result = []
    for c in companies:
        job_count = db.query(JobPost).filter(JobPost.company_id == c.id).count()
        c_dict = {**c.__dict__, "job_count": job_count}
        result.append(c_dict)
    return result


@router.post("/", response_model=CompanyResponse, status_code=201)
def create_company(
    data: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    company = Company(**data.model_dump())
    db.add(company)
    db.commit()
    db.refresh(company)
    return {**company.__dict__, "job_count": 0}


@router.get("/{company_id}", response_model=CompanyResponse)
def get_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    job_count = db.query(JobPost).filter(JobPost.company_id == company_id).count()
    return {**company.__dict__, "job_count": job_count}


@router.put("/{company_id}", response_model=CompanyResponse)
def update_company(
    company_id: int,
    data: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(company, field, value)
    db.commit()
    db.refresh(company)
    job_count = db.query(JobPost).filter(JobPost.company_id == company_id).count()
    return {**company.__dict__, "job_count": job_count}


@router.delete("/{company_id}", status_code=204)
def delete_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Entreprise introuvable")
    company.is_active = False
    db.commit()
