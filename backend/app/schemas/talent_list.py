from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class TalentListCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class TalentListUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None


class TalentListResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_by: int
    created_at: datetime
    member_count: int = 0

    class Config:
        from_attributes = True


class TalentListBrief(BaseModel):
    id: int
    name: str
