from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models import JobStatus, JobType
from app.schemas.company import CompanyResponse


class InterviewGuideItem(BaseModel):
    category: Optional[str] = Field(None, max_length=200)
    question: str = Field("", max_length=2000)


class InterviewGuidePayload(BaseModel):
    items: List[InterviewGuideItem] = Field(default_factory=list)


class JobPostBase(BaseModel):
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
    status: JobStatus = JobStatus.open
    deadline: Optional[datetime] = None
    company_id: int


class JobPostCreate(JobPostBase):
    pass


class JobPostUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    responsibilities: Optional[str] = None
    location: Optional[str] = None
    city: Optional[str] = None
    job_type: Optional[JobType] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    status: Optional[JobStatus] = None
    deadline: Optional[datetime] = None
    experience_years: Optional[int] = None
    education_level: Optional[str] = None
    interview_guide: Optional[InterviewGuidePayload] = None


class JobPostResponse(JobPostBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    company: Optional[CompanyResponse] = None
    application_count: Optional[int] = 0
    interview_guide: Optional[InterviewGuidePayload] = None

    class Config:
        from_attributes = True
