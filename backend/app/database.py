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


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
