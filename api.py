import json
import uuid
import os
import sys
import threading

sys.stdout.reconfigure(encoding="utf-8")

def _log(msg):
    print(msg, flush=True)

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import anthropic
from dotenv import load_dotenv

load_dotenv()

from llm.lover import chat_stream_gen
from llm.detector import detect_trigger
from db.redis_client import (
    save_meta, get_meta, append_history, get_history,
    save_state, delete_session as redis_delete_session,
)
from mc.orchestrator import should_summarize, run_summary_and_facts, build_llm_context, run_mc_panel
from llm.panel import run_intro_panel
from auth import router as auth_router, verify_token
from db.mysql_client import init_db, get_db, ChatSession, User
from sqlalchemy.orm import Session

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 인증 라우터 등록
app.include_router(auth_router)

# DB 테이블 생성
@app.on_event("startup")
def on_startup():
    try:
        init_db()
        _log("[DB] MySQL 테이블 초기화 완료")
    except Exception as e:
        _log(f"[DB] MySQL 연결 실패 (Redis만 사용): {repr(e)}")

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

sessions = {}
sessions_lock = threading.Lock()


class SetupRequest(BaseModel):
    name: str
    age: int
    gender: str
    nationality: str = "한국"
    job: str
    personality: str
    speech_style: str
    scenario: str
    user_gender: str = "남성"
    user_name: str = "사용자"
    user_age: int = 25
    user_job: str = ""
    chat_type: str = "online"
    token: Optional[str] = None  # 로그인한 경우 토큰


class ChatRequest(BaseModel):
    session_id: str
    message: str
    camera_emotion: dict = None
    voice_emotion: dict = None


@app.post("/session")
def create_session(req: SetupRequest, db: Session = Depends(get_db)):
    if not (20 <= req.age <= 60):
        raise HTTPException(status_code=400, detail="나이는 20~60 사이여야 합니다.")
    if len(req.name) > 10:
        raise HTTPException(status_code=400, detail="이름은 10자 이내여야 합니다.")
    if len(req.personality) > 20:
        raise HTTPException(status_code=400, detail="성격은 20자 이내여야 합니다.")
    if len(req.speech_style) > 20:
        raise HTTPException(status_code=400, detail="말투는 20자 이내여야 합니다.")
    if len(req.scenario) > 50:
        raise HTTPException(status_code=400, detail="시나리오는 50자 이내여야 합니다.")

    persona = {
        "name": req.name,
        "age": req.age,
        "gender": req.gender,
        "nationality": req.nationality,
        "job": req.job,
        "personality": req.personality,
        "speech_style": req.speech_style,
        "user_gender": req.user_gender,
    }
    init_prompt = f"""
아래 캐릭터와 시나리오를 보고 초기 심리 상태를 JSON으로만 출력해.
다른 텍스트 없이 JSON만.

캐릭터: {persona}
시나리오: {req.scenario}

{{"emotion": "현재 감정 상태 30자 이내", "direction": "행동 방향 30자 이내"}}
"""
    resp = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=128,
        temperature=0.3,
        messages=[{"role": "user", "content": init_prompt}]
    )
    try:
        state = json.loads(resp.content[0].text.strip())
    except Exception:
        state = {"emotion": "설레고 기대되는 상태", "direction": "자연스럽게 대화 이어가려 함"}
    session_id = str(uuid.uuid4())[:8]
    with sessions_lock:
        sessions[session_id] = {
            "persona": persona,
            "scenario": req.scenario,
            "chat_type": req.chat_type,
            "history": [],
            "psychological_state": state,
            "turn_count": 0,
            "user_info": {
                "name": req.user_name,
                "gender": req.user_gender,
                "age": req.user_age,
                "job": req.user_job,
            },
        }
    save_meta(session_id, persona, req.scenario)

    # MySQL에 세션 저장 (로그인한 경우)
    if req.token:
        try:
            payload = verify_token(req.token)
            chat_session = ChatSession(
                user_id=payload["user_id"],
                session_id=session_id,
                persona_name=req.name,
                scenario=req.scenario,
                chat_type=req.chat_type,
                persona_json=json.dumps(persona, ensure_ascii=False),
            )
            db.add(chat_session)
            db.commit()
        except Exception as e:
            _log(f"[DB] 세션 MySQL 저장 실패: {repr(e)}")

    return {"session_id": session_id, "initial_state": state}


@app.get("/sessions")
def list_sessions(token: str = "", db: Session = Depends(get_db)):
    """로그인한 사용자의 대화방 목록"""
    if not token:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")
    payload = verify_token(token)
    user_sessions = db.query(ChatSession).filter(
        ChatSession.user_id == payload["user_id"]
    ).order_by(ChatSession.updated_at.desc()).all()

    return {
        "sessions": [
            {
                "session_id": s.session_id,
                "persona_name": s.persona_name,
                "scenario": s.scenario,
                "chat_type": s.chat_type,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "updated_at": s.updated_at.isoformat() if s.updated_at else None,
            }
            for s in user_sessions
        ]
    }


@app.get("/session/{session_id}/resume")
def resume_session(session_id: str, token: str = "", db: Session = Depends(get_db)):
    """대화 이어하기 - Redis에서 히스토리 복원"""
    if not token:
        raise HTTPException(status_code=401, detail="로그인이 필요합니다.")
    payload = verify_token(token)

    # MySQL에서 세션 확인
    chat_session = db.query(ChatSession).filter(
        ChatSession.session_id == session_id,
        ChatSession.user_id == payload["user_id"],
    ).first()
    if not chat_session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    # Redis에서 메타 + 히스토리 로드
    meta = get_meta(session_id)
    if not meta:
        raise HTTPException(status_code=404, detail="세션 데이터가 만료되었습니다.")

    history = get_history(session_id, last_n=20)
    persona = meta["persona"]

    # 메모리 세션 복원
    if session_id not in sessions:
        sessions[session_id] = {
            "persona": persona,
            "scenario": chat_session.scenario,
            "chat_type": chat_session.chat_type,
            "history": [{"role": m["role"], "content": m["content"]} for m in history],
            "psychological_state": {"emotion": "대화 재개", "direction": "이전 대화 이어가기"},
            "turn_count": len(history) // 2,
            "user_info": {
                "name": "사용자",
                "gender": persona.get("user_gender", "남성"),
                "age": 25,
                "job": "",
            },
        }

    return {
        "persona": persona,
        "history": [{"role": m["role"], "content": m["content"]} for m in history],
    }


@app.post("/chat")
def chat(req: ChatRequest):
    _log(f"[요청] /chat 호출됨 - session={req.session_id} msg={req.message[:20]}")
    if req.camera_emotion:
        _log(f"[카메라 감정] {req.camera_emotion.get('label', '없음')} ({req.camera_emotion.get('score', 0)*100:.0f}%)")
    if req.voice_emotion:
        _log(f"[음성 감정] {req.voice_emotion.get('label', '없음')} ({req.voice_emotion.get('score', 0)*100:.0f}%)")
    with sessions_lock:
        session = sessions.get(req.session_id)
    if not session:
        _log(f"[404] 세션 없음 - {req.session_id} / 현재 세션: {list(sessions.keys())}")
        raise HTTPException(status_code=404, detail="세션이 존재하지 않습니다.")

    llm_ctx = build_llm_context(req.session_id)

    def generate():
        history = session["history"]
        state = session["psychological_state"]
        name = session["persona"]["name"]
        _log(f"[유저] {req.message}")
        full_response = ""

        chat_type = session.get("chat_type", None)
        _log(f"[DEBUG] chat_type={chat_type}, scenario={session['scenario']}")

        try:
            for event_type, value in chat_stream_gen(
                client, req.message, history,
                session["persona"], session["scenario"], state,
                extra_context=llm_ctx["extra_context"],
                user_info=session["user_info"],
                user_camera_emotion=req.camera_emotion,
                user_voice_emotion=req.voice_emotion,
                chat_type=chat_type,
            ):
                if event_type == "text":
                    full_response += value
                    yield f"event: text\ndata: {json.dumps(value, ensure_ascii=False)}\n\n"
        except Exception as e:
            _log(f"[에러] LLM 응답 실패: {repr(e)}")
            yield f"event: error\ndata: {json.dumps({'error': 'LLM 응답 실패'}, ensure_ascii=False)}\n\n"
            yield f"event: done\ndata: {{}}\n\n"
            return

        yield f"event: stream_done\ndata: {{}}\n\n"

        _log(f"[{name}] {full_response}")
        session["turn_count"] += 1

        # ── 인트로 패널 (첫 번째 메시지일 때) ──
        if session["turn_count"] == 1:
            yield f"event: panel_start\ndata: \n\n"
            try:
                persona = session["persona"]
                persona_context = f"""이름: {persona['name']}, 나이: {persona['age']}, 성별: {persona['gender']}
성격: {persona['personality']}, 말투: {persona['speech_style']}
시나리오: {session['scenario']}
"""
                intro = run_intro_panel(client, persona_context)
                payload = json.dumps(
                    {"t": intro["t_panel"], "f": intro["f_panel"]},
                    ensure_ascii=False
                )
                yield f"event: panel\ndata: {payload}\n\n"
            except Exception as e:
                _log(f"[에러] 인트로 패널 실패: {repr(e)}")

        # Redis에 대화 저장
        append_history(req.session_id, "user", req.message)
        append_history(req.session_id, "assistant", full_response)

        if should_summarize(req.session_id):
            run_summary_and_facts(client, req.session_id)

        try:
            trigger = detect_trigger(client, history, session["turn_count"], state)
        except Exception as e:
            _log(f"[에러] 감지 Agent 실패: {repr(e)}")
            trigger = {"trigger": False, "reason": "에러", "context": "", "new_state": None}

        if trigger.get("new_state"):
            session["psychological_state"].update(trigger["new_state"])
            save_state(req.session_id, session["psychological_state"])
        if trigger.get("trigger"):
            _log(f"[트리거] {trigger.get('reason')} → 패널 생성 중")
            yield f"event: panel_start\ndata: \n\n"
            try:
                panel = run_mc_panel(
                    client, req.session_id, trigger["context"],
                    persona_name=session["persona"]["name"],
                    user_name=session["user_info"].get("name", "사용자"),
                )
                _log(f"[MC→패널] {trigger['context'][:80]}...")
                _log(f"[T형] {panel['t_panel']}")
                _log(f"[F형] {panel['f_panel']}")
                payload = json.dumps(
                    {"t": panel["t_panel"], "f": panel["f_panel"]},
                    ensure_ascii=False
                )
                yield f"event: panel\ndata: {payload}\n\n"
            except Exception as e:
                _log(f"[에러] 패널 생성 실패: {repr(e)}")
                yield f"event: error\ndata: {json.dumps({'error': '패널 생성 실패'}, ensure_ascii=False)}\n\n"

        yield f"event: done\ndata: {{}}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.delete("/session/{session_id}")
def delete_session(session_id: str, token: str = "", db: Session = Depends(get_db)):
    sessions.pop(session_id, None)
    redis_delete_session(session_id)
    # MySQL에서도 삭제
    if token:
        try:
            payload = verify_token(token)
            db.query(ChatSession).filter(
                ChatSession.session_id == session_id,
                ChatSession.user_id == payload["user_id"],
            ).delete()
            db.commit()
        except Exception:
            pass
    return {"ok": True}
