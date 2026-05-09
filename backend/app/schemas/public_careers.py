from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

from app.models import JobType


class PublicCompanyBrief(BaseModel):
    id: int
    name: str
    city: Optional[str] = None
    sector: Optional[str] = None
    logo_url: Optional[str] = None

    class Config:
        from_attributes = True


class PublicJobSummary(BaseModel):
    id: int
    title: str
    city: Optional[str] = None
    location: Optional[str] = None
    job_type: JobType
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: str = "GNF"
    experience_years: Optional[int] = None
    created_at: datetime
    company: PublicCompanyBrief

    class Config:
        from_attributes = True


class PublicJobDetail(BaseModel):
    id: int
    title: str
    description: str
    requirements: Optional[str] = None
    responsibilities: Optional[str] = None
    location: Optional[str] = None
    city: Optional[str] = None
    job_type: JobType
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: str = "GNF"
    experience_years: Optional[int] = None
    education_level: Optional[str] = None
    deadline: Optional[datetime] = None
    created_at: datetime
    company: PublicCompanyBrief

    class Config:
        from_attributes = True


class PublicApplyResponse(BaseModel):
    message: str
    application_id: int
    candidate_id: int
