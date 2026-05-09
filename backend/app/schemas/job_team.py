from pydantic import BaseModel
from datetime import datetime

from app.models import JobRecruitmentRole


class JobTeamMemberCreate(BaseModel):
    user_id: int
    role: JobRecruitmentRole


class JobTeamMemberResponse(BaseModel):
    id: int
    job_post_id: int
    user_id: int
    user_name: str
    user_email: str
    role: JobRecruitmentRole
    created_at: datetime

    class Config:
        from_attributes = True
