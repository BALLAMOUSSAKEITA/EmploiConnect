from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Boolean, Float, UniqueConstraint
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


class JobRecruitmentRole(str, enum.Enum):
    """Rôles co-recrutement sur une offre."""
    lead_recruiter = "lead_recruiter"
    sourcer = "sourcer"
    coordinator = "coordinator"
    hiring_manager = "hiring_manager"


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
    interview_guide_json = Column(Text, nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    company = relationship("Company", back_populates="job_posts")
    created_by_user = relationship("User", back_populates="job_posts")
    applications = relationship("Application", back_populates="job_post")
    team_members = relationship("JobPostTeamMember", back_populates="job_post", cascade="all, delete-orphan")


class JobPostTeamMember(Base):
    __tablename__ = "job_post_team_members"
    __table_args__ = (
        UniqueConstraint("job_post_id", "user_id", "role", name="uq_job_team_user_role"),
    )

    id = Column(Integer, primary_key=True, index=True)
    job_post_id = Column(Integer, ForeignKey("job_posts.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(Enum(JobRecruitmentRole), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    job_post = relationship("JobPost", back_populates="team_members")
    user = relationship("User", backref="job_team_memberships")


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
    tags_json = Column(Text, nullable=True)
    recontact_at = Column(DateTime(timezone=True), nullable=True)
    recontact_note = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    cv_files = relationship("CVFile", back_populates="candidate")
    applications = relationship("Application", back_populates="candidate")
    talent_list_memberships = relationship(
        "CandidateTalentList",
        back_populates="candidate",
        cascade="all, delete-orphan",
    )


class TalentList(Base):
    """Liste nommée du vivier (shortlists, pools)."""
    __tablename__ = "talent_lists"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    created_by_user = relationship("User", backref="talent_lists_created")
    memberships = relationship(
        "CandidateTalentList",
        back_populates="talent_list",
        cascade="all, delete-orphan",
    )


class CandidateTalentList(Base):
    __tablename__ = "candidate_talent_lists"
    __table_args__ = (
        UniqueConstraint("candidate_id", "talent_list_id", name="uq_candidate_talent_list"),
    )

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False, index=True)
    talent_list_id = Column(Integer, ForeignKey("talent_lists.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    candidate = relationship("Candidate", back_populates="talent_list_memberships")
    talent_list = relationship("TalentList", back_populates="memberships")


class CVFile(Base):
    __tablename__ = "cv_files"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    file_name = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=True)
    content_sha256 = Column(String(64), nullable=True, index=True)
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
    utm_source = Column(String(255), nullable=True)
    utm_medium = Column(String(255), nullable=True)
    utm_campaign = Column(String(255), nullable=True)
    utm_content = Column(String(255), nullable=True)
    utm_term = Column(String(255), nullable=True)
    referrer_url = Column(Text, nullable=True)
    landing_page = Column(String(512), nullable=True)
    applied_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    candidate = relationship("Candidate", back_populates="applications")
    job_post = relationship("JobPost", back_populates="applications")
    interviews = relationship("Interview", back_populates="application")
    comments = relationship("ApplicationComment", back_populates="application")


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
    scorecard_json = Column(Text, nullable=True)
    result = Column(Enum(InterviewResult), default=InterviewResult.pending)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    application = relationship("Application", back_populates="interviews")
    interviewer = relationship("User", back_populates="interviews")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    entity_type = Column(String(32), nullable=False, index=True)
    entity_id = Column(Integer, nullable=False, index=True)
    action = Column(String(64), nullable=False)
    meta = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", backref="activity_logs")


class ApplicationComment(Base):
    __tablename__ = "application_comments"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)
    mentioned_user_ids = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    application = relationship("Application", back_populates="comments")
    user = relationship("User")


class JobTemplate(Base):
    __tablename__ = "job_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    title = Column(String, nullable=False)
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
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    interview_guide_json = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company")
    created_by_user = relationship("User")
