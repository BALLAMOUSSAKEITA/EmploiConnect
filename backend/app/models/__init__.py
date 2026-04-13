from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Boolean, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    agent = "agent"


class JobStatus(str, enum.Enum):
    draft = "draft"
    open = "open"
    closed = "closed"
    paused = "paused"


class JobType(str, enum.Enum):
    cdi = "CDI"
    cdd = "CDD"
    stage = "Stage"
    freelance = "Freelance"
    temps_partiel = "Temps partiel"


class ApplicationStatus(str, enum.Enum):
    applied = "Candidature reçue"
    screening = "Présélection"
    interview = "Entretien"
    offer = "Offre envoyée"
    hired = "Embauché"
    rejected = "Refusé"


class InterviewType(str, enum.Enum):
    phone = "Téléphone"
    video = "Vidéo"
    onsite = "Présentiel"


class InterviewResult(str, enum.Enum):
    pending = "En attente"
    passed = "Validé"
    failed = "Refusé"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.agent)
    is_active = Column(Boolean, default=True)
    phone = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    job_posts = relationship("JobPost", back_populates="created_by_user")
    interviews = relationship("Interview", back_populates="interviewer")


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    sector = Column(String, nullable=True)
    size = Column(String, nullable=True)
    website = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    logo_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    job_posts = relationship("JobPost", back_populates="company")


class JobPost(Base):
    __tablename__ = "job_posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=False)
    requirements = Column(Text, nullable=True)
    responsibilities = Column(Text, nullable=True)
    location = Column(String, nullable=True)
    city = Column(String, nullable=True)
    job_type = Column(Enum(JobType), default=JobType.cdi)
    salary_min = Column(Float, nullable=True)
    salary_max = Column(Float, nullable=True)
    salary_currency = Column(String, default="GNF")
    experience_years = Column(Integer, nullable=True)
    education_level = Column(String, nullable=True)
    status = Column(Enum(JobStatus), default=JobStatus.open)
    deadline = Column(DateTime(timezone=True), nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company = relationship("Company", back_populates="job_posts")
    created_by_user = relationship("User", back_populates="job_posts")
    applications = relationship("Application", back_populates="job_post")


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    nationality = Column(String, nullable=True)
    date_of_birth = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    skills = Column(Text, nullable=True)
    languages = Column(Text, nullable=True)
    experience_years = Column(Integer, nullable=True)
    education_level = Column(String, nullable=True)
    current_position = Column(String, nullable=True)
    current_company = Column(String, nullable=True)
    linkedin_url = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    cv_files = relationship("CVFile", back_populates="candidate")
    applications = relationship("Application", back_populates="candidate")


class CVFile(Base):
    __tablename__ = "cv_files"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=True)
    is_primary = Column(Boolean, default=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    candidate = relationship("Candidate", back_populates="cv_files")


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    job_post_id = Column(Integer, ForeignKey("job_posts.id"), nullable=False)
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.applied)
    cover_letter = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    score = Column(Integer, nullable=True)
    applied_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    candidate = relationship("Candidate", back_populates="applications")
    job_post = relationship("JobPost", back_populates="applications")
    interviews = relationship("Interview", back_populates="application")


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    interviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    interview_type = Column(Enum(InterviewType), default=InterviewType.onsite)
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, default=60)
    location = Column(String, nullable=True)
    meeting_link = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    feedback = Column(Text, nullable=True)
    result = Column(Enum(InterviewResult), default=InterviewResult.pending)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    application = relationship("Application", back_populates="interviews")
    interviewer = relationship("User", back_populates="interviews")
