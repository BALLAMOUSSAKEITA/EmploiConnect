from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv(encoding="utf-8")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./emploiconnect.db") or "sqlite:///./emploiconnect.db"
DATABASE_URL = DATABASE_URL.strip().lstrip("\ufeff")

# Railway génère parfois des URLs avec le préfixe "postgres://" (déprécié),
# SQLAlchemy 2.0 exige "postgresql://"
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def ensure_candidates_vivier_columns() -> None:
    """
    Colonnes ajoutées après les premiers déploiements (create_all n'altère pas les tables existantes).
    Idempotent : vérifie les colonnes présentes avant ALTER.
    """
    try:
        insp = inspect(engine)
    except Exception:
        return
    if not insp.has_table("candidates"):
        return
    existing = {c["name"] for c in insp.get_columns("candidates")}
    dialect = engine.dialect.name
    stmts: list[str] = []
    if "tags_json" not in existing:
        stmts.append("ALTER TABLE candidates ADD COLUMN tags_json TEXT")
    if "recontact_at" not in existing:
        if dialect == "postgresql":
            stmts.append(
                "ALTER TABLE candidates ADD COLUMN recontact_at TIMESTAMP WITH TIME ZONE"
            )
        else:
            stmts.append("ALTER TABLE candidates ADD COLUMN recontact_at DATETIME")
    if "recontact_note" not in existing:
        stmts.append("ALTER TABLE candidates ADD COLUMN recontact_note TEXT")
    if not stmts:
        return
    with engine.begin() as conn:
        for sql in stmts:
            conn.execute(text(sql))


def ensure_cv_files_bootstrap_columns() -> None:
    """Colonnes ajoutées pour détection doublons / CV principal (create_all ne modifie pas les tables existantes)."""
    try:
        insp = inspect(engine)
    except Exception:
        return
    if not insp.has_table("cv_files"):
        return
    existing = {c["name"] for c in insp.get_columns("cv_files")}
    dialect = engine.dialect.name
    stmts: list[str] = []
    added_sha = False
    if "content_sha256" not in existing:
        stmts.append("ALTER TABLE cv_files ADD COLUMN content_sha256 VARCHAR(64)")
        added_sha = True
    if "is_primary" not in existing:
        if dialect == "postgresql":
            stmts.append(
                "ALTER TABLE cv_files ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT false"
            )
        else:
            stmts.append(
                "ALTER TABLE cv_files ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT 0"
            )
    if not stmts:
        return
    with engine.begin() as conn:
        for sql in stmts:
            conn.execute(text(sql))
        if added_sha and dialect == "postgresql":
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_cv_files_content_sha256 ON cv_files (content_sha256)"
                )
            )
        elif added_sha:
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_cv_files_content_sha256 ON cv_files (content_sha256)"
                )
            )


def ensure_interviews_bootstrap_columns() -> None:
    """Colonnes entretiens (scorecards, lien visio, etc.) absentes des vieilles BDD."""
    try:
        insp = inspect(engine)
    except Exception:
        return
    if not insp.has_table("interviews"):
        return
    existing = {c["name"] for c in insp.get_columns("interviews")}
    stmts: list[str] = []
    if "meeting_link" not in existing:
        stmts.append("ALTER TABLE interviews ADD COLUMN meeting_link TEXT")
    if "feedback" not in existing:
        stmts.append("ALTER TABLE interviews ADD COLUMN feedback TEXT")
    if "scorecard_json" not in existing:
        stmts.append("ALTER TABLE interviews ADD COLUMN scorecard_json TEXT")
    if not stmts:
        return
    with engine.begin() as conn:
        for sql in stmts:
            conn.execute(text(sql))


def ensure_applications_tracking_columns() -> None:
    """UTM / referrer sur candidatures (page carrière) si table créée avant ces champs."""
    try:
        insp = inspect(engine)
    except Exception:
        return
    if not insp.has_table("applications"):
        return
    existing = {c["name"] for c in insp.get_columns("applications")}
    stmts: list[str] = []
    for col, ddl in [
        ("utm_source", "VARCHAR(255)"),
        ("utm_medium", "VARCHAR(255)"),
        ("utm_campaign", "VARCHAR(255)"),
        ("utm_content", "VARCHAR(255)"),
        ("utm_term", "VARCHAR(255)"),
        ("referrer_url", "TEXT"),
        ("landing_page", "VARCHAR(512)"),
    ]:
        if col not in existing:
            stmts.append(f"ALTER TABLE applications ADD COLUMN {col} {ddl}")
    if not stmts:
        return
    with engine.begin() as conn:
        for sql in stmts:
            conn.execute(text(sql))


def ensure_job_posts_guide_columns() -> None:
    """Guide d'entretien (JSON) sur offres et modèles — colonnes postérieures à la 1re BDD."""
    try:
        insp = inspect(engine)
    except Exception:
        return
    with engine.begin() as conn:
        if insp.has_table("job_posts"):
            cols = {c["name"] for c in insp.get_columns("job_posts")}
            if "interview_guide_json" not in cols:
                conn.execute(
                    text("ALTER TABLE job_posts ADD COLUMN interview_guide_json TEXT")
                )
        if insp.has_table("job_templates"):
            cols = {c["name"] for c in insp.get_columns("job_templates")}
            if "interview_guide_json" not in cols:
                conn.execute(
                    text("ALTER TABLE job_templates ADD COLUMN interview_guide_json TEXT")
                )


def normalize_null_is_active_flags() -> None:
    """Les lignes avec is_active NULL sont exclues par SQL (is_active = true). Les traiter comme actives."""
    try:
        insp = inspect(engine)
    except Exception:
        return
    with engine.begin() as conn:
        if insp.has_table("candidates"):
            conn.execute(
                text("UPDATE candidates SET is_active = true WHERE is_active IS NULL")
            )
        if insp.has_table("companies"):
            conn.execute(
                text("UPDATE companies SET is_active = true WHERE is_active IS NULL")
            )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
