from pydantic import BaseModel
from typing import List, Optional


class BulkCvImportRow(BaseModel):
    file_name: str
    status: str
    candidate_id: Optional[int] = None
    message: Optional[str] = None
    email_detected: Optional[str] = None


class BulkCvImportResponse(BaseModel):
    results: List[BulkCvImportRow]
    created: int
    attached: int
    skipped: int
    errors: int


class DuplicateCandidateBrief(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    phone: Optional[str] = None


class DuplicateGroup(BaseModel):
    reason: str
    key: str
    candidates: List[DuplicateCandidateBrief]


class DuplicateCandidatesResponse(BaseModel):
    groups: List[DuplicateGroup]
