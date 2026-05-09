import json
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models import ActivityLog


def log_activity(
    db: Session,
    user_id: int,
    entity_type: str,
    entity_id: int,
    action: str,
    meta: Optional[dict[str, Any]] = None,
) -> None:
    row = ActivityLog(
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        meta=json.dumps(meta, default=str, ensure_ascii=False) if meta else None,
    )
    db.add(row)
