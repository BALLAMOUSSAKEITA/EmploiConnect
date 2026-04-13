from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models import ApplicationStatus, InterviewType, InterviewResult


class ApplicationBase(BaseModel):
    candidate_id: int
    job_post_id: int
    cover_letter: Optional[str] = None
    notes: Optional[str] = None
    score: Optional[int] = None


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(BaseModel):
    status: Optional[ApplicationStatus] = None
    cover_letter: Optional[str] = None
    notes: Optional[str] = None
    score: Optional[int] = None


class ApplicationResponse(ApplicationBase):
    id: int
    status: ApplicationStatus
    applied_at: datetime
    updated_at: Optional[datetime] = None
    candidate_name: Optional[str] = None
    job_title: Optional[str] = None
    company_name: Optional[str] = None

    class Config:
        from_attributes = True


class InterviewBase(BaseModel):
    application_id: int
    interviewer_id: int
    interview_type: InterviewType = InterviewType.onsite
    scheduled_at: datetime
    duration_minutes: int = 60
    location: Optional[str] = None
    meeting_link: Optional[str] = None
    notes: Optional[str] = None


class InterviewCreate(InterviewBase):
    pass


class InterviewUpdate(BaseModel):
    interview_type: Optional[InterviewType] = None
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    location: Optional[str] = None
    meeting_link: Optional[str] = None
    notes: Optional[str] = None
    feedback: Optional[str] = None
    result: Optional[InterviewResult] = None


class InterviewResponse(InterviewBase):
    id: int
    result: InterviewResult
    feedback: Optional[str] = None
    created_at: datetime
    candidate_name: Optional[str] = None
    job_title: Optional[str] = None
    interviewer_name: Optional[str] = None

    class Config:
        from_attributes = True
