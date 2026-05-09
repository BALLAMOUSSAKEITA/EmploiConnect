from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.database import (
    engine,
    Base,
    ensure_candidates_vivier_columns,
    ensure_cv_files_bootstrap_columns,
    normalize_null_is_active_flags,
    SessionLocal,
)
from app.models import (
    User,
    Company,
    JobPost,
    JobPostTeamMember,
    Candidate,
    CVFile,
    Application,
    Interview,
    ActivityLog,
    ApplicationComment,
    JobTemplate,
    TalentList,
    CandidateTalentList,
)
from app.routers import auth, companies, jobs, candidates, recruitment, dashboard, activity, export, job_templates, talent_lists, public_careers
from app.auth.jwt import get_password_hash

Base.metadata.create_all(bind=engine)
ensure_candidates_vivier_columns()
ensure_cv_files_bootstrap_columns()
normalize_null_is_active_flags()


def seed_admin():
    db = SessionLocal()
    try:
        from app.models import User as UserModel, UserRole
        admin = db.query(UserModel).filter(UserModel.email == "admin@emploiconnect.gn").first()
        if not admin:
            admin = UserModel(
                email="admin@emploiconnect.gn",
                full_name="Administrateur EmploiConnect",
                hashed_password=get_password_hash("Admin@2024"),
                role=UserRole.admin,
                is_active=True
            )
            db.add(admin)
            db.commit()
            print("Compte admin créé: admin@emploiconnect.gn / Admin@2024")
        else:
            print("Compte admin déjà existant")
    except Exception as e:
        print(f"Erreur seed admin: {e}")
        db.rollback()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_admin()
    yield


app = FastAPI(
    title="EmploiConnect - API",
    description="Plateforme de recrutement de talents en Guinée",
    version="1.0.0",
    lifespan=lifespan,
)

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads/cvs", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router, prefix="/api")
app.include_router(companies.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(candidates.router, prefix="/api")
app.include_router(recruitment.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(activity.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(job_templates.router, prefix="/api")
app.include_router(talent_lists.router, prefix="/api")
app.include_router(public_careers.router, prefix="/api")



@app.get("/")
def root():
    return {"message": "EmploiConnect API - v1.0.0", "docs": "/docs"}
