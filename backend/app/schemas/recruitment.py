from pydantic import BaseModel, Field, model_validator
from typing import Optional, List
from datetime import datetime
from app.models import ApplicationStatus, InterviewType, InterviewResult


class InterviewScorecardItem(BaseModel):
    label: str
    score: int = Field(0, ge=0)
    max: int = Field(5, ge=1, le=10)

    @model_validator(mode="after")
    def clamp_score(self):
        cap = max(self.max, 1)
        if self.score > cap:
            self.score = cap
        return self


class InterviewScorecardPayload(BaseModel):
    items: List[InterviewScorecardItem] = Field(default_factory=list)
    global_note: Optional[str] = None


class ApplicationBase(BaseModel):
    candidate_id: int
    job_post_id: int
    cover_letter: Optional[str] = None
    notes: Optional[str] = None
    score: Optional[int] = None
    utm_source: Optional[str] = Field(None, max_length=255)
    utm_medium: Optional[str] = Field(None, max_length=255)
    utm_campaign: Optional[str] = Field(None, max_length=255)
    utm_content: Optional[str] = Field(None, max_length=255)
    utm_term: Optional[str] = Field(None, max_length=255)
    referrer_url: Optional[str] = None
    landing_page: Optional[str] = Field(None, max_length=512)


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
    scorecard: Optional[InterviewScorecardPayload] = None


class InterviewResponse(InterviewBase):
    id: int
    result: InterviewResult
    feedback: Optional[str] = None
    scorecard: Optional[InterviewScorecardPayload] = None
    scorecard_average_pct: Optional[float] = None
    created_at: datetime
    candidate_name: Optional[str] = None
    job_title: Optional[str] = None
    interviewer_name: Optional[str] = None

    class Config:
        from_attributes = True
