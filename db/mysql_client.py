"""
MySQL 연결 + ORM 모델
- users: 회원 정보
- chat_sessions: 대화방 목록
"""
import os
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root:root1234@localhost:3306/relacipe"
)

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password = Column(String(200), nullable=False)  # bcrypt 해시
    created_at = Column(DateTime, default=datetime.utcnow)

    sessions = relationship("ChatSession", back_populates="user")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_id = Column(String(20), unique=True, nullable=False, index=True)  # Redis 세션 키
    persona_name = Column(String(50), nullable=False)
    scenario = Column(String(200), nullable=False)
    chat_type = Column(String(20), default="online")
    persona_json = Column(Text)  # 전체 페르소나 JSON 저장
    profile_image = Column(String(500), nullable=True)  # 프로필 이미지 URL
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="sessions")
    messages = relationship("ChatMessage", back_populates="session", order_by="ChatMessage.id")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(20), ForeignKey("chat_sessions.session_id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)   # "user" or "assistant"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")


class ChatPanel(Base):
    __tablename__ = "chat_panels"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(20), ForeignKey("chat_sessions.session_id"), nullable=False, index=True)
    t_text = Column(Text, nullable=False)
    f_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    """테이블 생성"""
    Base.metadata.create_all(bind=engine)


def get_db():
    """DB 세션 생성 (요청마다 사용)"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
