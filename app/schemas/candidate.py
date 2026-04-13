from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


class CVFileResponse(BaseModel):
    id: int
    file_name: str
    file_path: str
    file_size: Optional[int] = None
    is_primary: bool
    uploaded_at: datetime

    class Config:
        from_attributes = True


class CandidateBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    nationality: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    skills: Optional[str] = None
    languages: Optional[str] = None
    experience_years: Optional[int] = None
    education_level: Optional[str] = None
    current_position: Optional[str] = None
    current_company: Optional[str] = None
    linkedin_url: Optional[str] = None
    notes: Optional[str] = None


class CandidateCreate(CandidateBase):
    pass


class CandidateUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    nationality: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    skills: Optional[str] = None
    languages: Optional[str] = None
    experience_years: Optional[int] = None
    education_level: Optional[str] = None
    current_position: Optional[str] = None
    current_company: Optional[str] = None
    linkedin_url: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class CandidateResponse(CandidateBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    cv_files: List[CVFileResponse] = []

    class Config:
        from_attributes = True
