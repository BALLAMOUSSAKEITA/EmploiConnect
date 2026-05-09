from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class ApplicationCommentCreate(BaseModel):
    body: str
    mentioned_user_ids: Optional[List[int]] = None


class ApplicationCommentResponse(BaseModel):
    id: int
    application_id: int
    user_id: int
    user_name: Optional[str] = None
    body: str
    mentioned_user_ids: Optional[List[int]] = None
    created_at: datetime

    class Config:
        from_attributes = True
