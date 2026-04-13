from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas.user import UserCreate, UserResponse, Token, LoginRequest
from app.auth.jwt import verify_password, get_password_hash, create_access_token
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentification"])


@router.post("/register", response_model=UserResponse, status_code=201)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")

    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        phone=user_data.phone,
        role=user_data.role,
        hashed_password=get_password_hash(user_data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Compte désactivé")

    token = create_access_token(data={"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
