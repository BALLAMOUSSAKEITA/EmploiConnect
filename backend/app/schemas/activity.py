from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Any


class ActivityLogResponse(BaseModel):
    id: int
    user_id: int
    user_name: Optional[str] = None
    entity_type: str
    entity_id: int
    action: str
    meta: Optional[Any] = None
    created_at: datetime

    class Config:
        from_attributes = True
