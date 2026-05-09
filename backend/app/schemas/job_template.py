from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models import JobType


class JobTemplateCreate(BaseModel):
    name: str
    title: str
    description: str
    requirements: Optional[str] = None
    responsibilities: Optional[str] = None
    location: Optional[str] = None
    city: Optional[str] = None
    job_type: JobType = JobType.cdi
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: str = "GNF"
    experience_years: Optional[int] = None
    education_level: Optional[str] = None
    company_id: Optional[int] = None


class JobTemplateResponse(BaseModel):
    id: int
    name: str
    title: str
    description: str
    requirements: Optional[str] = None
    responsibilities: Optional[str] = None
    location: Optional[str] = None
    city: Optional[str] = None
    job_type: JobType
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: str
    experience_years: Optional[int] = None
    education_level: Optional[str] = None
    company_id: Optional[int] = None
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True


class JobFromTemplateBody(BaseModel):
    company_id: int
    title_override: Optional[str] = None


class JobTemplateFromJobBody(BaseModel):
    name: str
