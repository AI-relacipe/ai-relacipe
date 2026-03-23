"""
인증 모듈 - 회원가입, 로그인, JWT 토큰
"""
import os
from datetime import datetime, timedelta

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.mysql_client import User, get_db

router = APIRouter(prefix="/auth", tags=["auth"])

JWT_SECRET = os.getenv("JWT_SECRET", "relacipe-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24


# ── 요청/응답 모델 ──

class RegisterRequest(BaseModel):
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    token: str
    username: str


# ── JWT 유틸 ──

def create_token(user_id: int, username: str) -> str:
    payload = {
        "user_id": user_id,
        "username": username,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="토큰이 만료되었습니다.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")


def get_current_user(token: str = None, db: Session = None):
    """Authorization 헤더에서 토큰 추출 → 사용자 반환"""
    if not token:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")
    payload = verify_token(token)
    user = db.query(User).filter(User.id == payload["user_id"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="사용자를 찾을 수 없습니다.")
    return user


# ── 엔드포인트 ──

@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    # 유효성 검사
    if len(req.username) < 2 or len(req.username) > 20:
        raise HTTPException(status_code=400, detail="아이디는 2~20자여야 합니다.")
    if len(req.password) < 4 or len(req.password) > 50:
        raise HTTPException(status_code=400, detail="비밀번호는 4~50자여야 합니다.")

    # 중복 확인
    existing = db.query(User).filter(User.username == req.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="이미 사용 중인 아이디입니다.")

    # 비밀번호 해시
    hashed = bcrypt.hashpw(req.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    # 저장
    user = User(username=req.username, password=hashed)
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_token(user.id, user.username)
    return TokenResponse(token=token, username=user.username)


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user:
        raise HTTPException(status_code=400, detail="아이디 또는 비밀번호가 틀렸습니다.")

    if not bcrypt.checkpw(req.password.encode("utf-8"), user.password.encode("utf-8")):
        raise HTTPException(status_code=400, detail="아이디 또는 비밀번호가 틀렸습니다.")

    token = create_token(user.id, user.username)
    return TokenResponse(token=token, username=user.username)


@router.get("/me")
def get_me(token: str = "", db: Session = Depends(get_db)):
    """현재 로그인한 사용자 정보"""
    user = get_current_user(token, db)
    return {"user_id": user.id, "username": user.username}
