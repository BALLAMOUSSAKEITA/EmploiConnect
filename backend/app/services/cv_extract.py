"""Extraction de texte et d'emails depuis CV (PDF / DOCX)."""
from __future__ import annotations

import re
from io import BytesIO
from typing import Optional

from email_validator import EmailNotValidError, validate_email

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")

NOISE_EMAIL_FRAGMENTS = (
    "noreply",
    "no-reply",
    "donotreply",
    "example.com",
    "sentry.io",
    "wixpress.com",
)


def extract_emails_raw(text: str) -> list[str]:
    if not text:
        return []
    found = [m.group(0) for m in EMAIL_RE.finditer(text)]
    # Première occurrence conservée pour chaque email normalisé
    seen: set[str] = set()
    out: list[str] = []
    for e in found:
        key = e.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(e)
    return out


def is_plausible_contact_email(email: str) -> bool:
    el = email.lower()
    if any(x in el for x in NOISE_EMAIL_FRAGMENTS):
        return False
    try:
        validate_email(email, check_deliverability=False)
        return True
    except EmailNotValidError:
        return False


def pick_contact_email(text: str) -> Optional[str]:
    emails = extract_emails_raw(text)
    for e in emails:
        if is_plausible_contact_email(e):
            return e.lower().strip()
    return None


def extract_text_pdf(data: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(BytesIO(data))
    parts: list[str] = []
    for page in reader.pages:
        t = page.extract_text() or ""
        parts.append(t)
    return "\n".join(parts)


def extract_text_docx(data: bytes) -> str:
    from docx import Document

    doc = Document(BytesIO(data))
    return "\n".join(p.text for p in doc.paragraphs if p.text)


def extract_text_cv(data: bytes, ext: str) -> str:
    ext = ext.lower()
    if ext == ".pdf":
        return extract_text_pdf(data)
    if ext == ".docx":
        return extract_text_docx(data)
    raise ValueError(f"Format non supporté pour l'extraction: {ext}")


def guess_name_from_filename(filename: str) -> tuple[str, str]:
    stem = filename.rsplit("/", 1)[-1]
    stem = re.sub(r"\.[^.]+$", "", stem)
    parts = [p for p in re.split(r"[_\-\s]+", stem) if p and len(p) > 0]
    noise = {"cv", "resume", "curriculum", "vitae", "fr", "en"}
    parts = [p for p in parts if p.lower() not in noise]
    if len(parts) >= 2:
        return parts[0].strip().title(), parts[-1].strip().title()
    if len(parts) == 1:
        return parts[0].strip().title(), "À compléter"
    return "Candidat", "À compléter"


def guess_name_from_text(text: str, filename: str) -> tuple[str, str]:
    lines = [ln.strip() for ln in (text or "").splitlines()[:30] if ln.strip()]
    for line in lines[:12]:
        if "@" in line:
            continue
        if re.match(r"^[\d\s./+–\-—]+$", line):
            continue
        if len(line) > 80:
            continue
        words = line.split()
        if 2 <= len(words) <= 6:
            if not re.match(r"^[A-Za-zÀ-ÖØ-öø-ÿ\-'.]+$", words[0]):
                continue
            return words[0].strip().title(), " ".join(w.strip().title() for w in words[1:])
    return guess_name_from_filename(filename)


def name_from_email_local(email: str) -> tuple[str, str]:
    local = email.split("@", 1)[0]
    parts = [p for p in re.split(r"[._\-]+", local) if p.isalpha() and len(p) > 1]
    if len(parts) >= 2:
        return parts[0].title(), parts[-1].title()
    if parts:
        return parts[0].title(), "À compléter"
    return "Candidat", "À compléter"
