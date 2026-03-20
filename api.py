import json
import uuid
import os
import sys
sys.stdout.reconfigure(encoding="utf-8")

def _log(msg):
    print(msg, flush=True)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import anthropic
from dotenv import load_dotenv

load_dotenv()

from llm.lover import chat_stream_gen
from llm.detector import detect_trigger
from db.redis_client import (
    save_meta, append_history, get_history_count,
    delete_session as redis_delete_session,
)
from mc.orchestrator import should_summarize, run_summary_and_facts, build_llm_context, run_mc_panel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

sessions = {}


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
    chat_type: str = "online"


class ChatRequest(BaseModel):
    session_id: str
    message: str


@app.post("/session")
def create_session(req: SetupRequest):
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
    }

    init_prompt = f"""
아래 캐릭터와 시나리오를 보고 초기 심리 상태를 JSON으로만 출력해.
다른 텍스트 없이 JSON만.

캐릭터: {persona}
시나리오: {req.scenario}

{{"emotion": "현재 감정 상태 30자 이내", "direction": "행동 방향 30자 이내"}}
"""
    resp = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=128,
        temperature=0.3,
        messages=[{"role": "user", "content": init_prompt}]
    )
    try:
        state = json.loads(resp.content[0].text.strip())
    except Exception:
        state = {"emotion": "설레고 기대되는 상태", "direction": "자연스럽게 대화 이어가려 함"}

    session_id = str(uuid.uuid4())[:8]
    sessions[session_id] = {
        "persona": persona,
        "scenario": req.scenario,
        "history": [],
        "psychological_state": state,
        "turn_count": 0,
    }
    save_meta(session_id, persona, req.scenario)

    return {"session_id": session_id, "initial_state": state}


@app.post("/chat")
def chat(req: ChatRequest):
    _log(f"[요청] /chat 호출됨 - session={req.session_id} msg={req.message[:20]}")
    session = sessions.get(req.session_id)
    if not session:
        _log(f"[404] 세션 없음 - {req.session_id} / 현재 세션: {list(sessions.keys())}")
        raise HTTPException(status_code=404, detail="세션이 존재하지 않습니다.")

    # MC에서 LLM 컨텍스트 조립 (요약 + fact)
    llm_ctx = build_llm_context(req.session_id)

    def generate():
        history = session["history"]
        state = session["psychological_state"]
        name = session["persona"]["name"]

        _log(f"[유저] {req.message}")

        # 스트리밍 응답
        full_response = ""
        for event_type, value in chat_stream_gen(
            client, req.message, history,
            session["persona"], session["scenario"], state,
            extra_context=llm_ctx["extra_context"],
        ):
            if event_type == "text":
                full_response += value
                yield f"event: text\ndata: {json.dumps(value, ensure_ascii=False)}\n\n"

        _log(f"[{name}] {full_response}")
        session["turn_count"] += 1

        # Redis에 대화 저장
        append_history(req.session_id, "user", req.message)
        append_history(req.session_id, "assistant", full_response)

        # 10메시지마다 요약 + fact 추출
        if should_summarize(req.session_id):
            run_summary_and_facts(client, req.session_id)

        # 감지 Agent
        trigger = detect_trigger(client, history, session["turn_count"], state)

        if trigger.get("new_state"):
            session["psychological_state"].update(trigger["new_state"])

        if trigger.get("trigger"):
            _log(f"[트리거] {trigger.get('reason')} → 패널 생성 중")
            yield f"event: panel_start\ndata: \n\n"
            panel = run_mc_panel(client, req.session_id, trigger["context"])
            _log(f"[MC→패널] {trigger['context'][:80]}...")
            _log(f"[T형] {panel['t_panel']}")
            _log(f"[F형] {panel['f_panel']}")
            payload = json.dumps(
                {"t": panel["t_panel"], "f": panel["f_panel"]},
                ensure_ascii=False
            )
            yield f"event: panel\ndata: {payload}\n\n"

        yield f"event: done\ndata: {{}}\n\n"

    _log(f"[요청] /chat 호출됨 - {req.message[:20]}")
    return StreamingResponse(generate(), media_type="text/event-stream")


@app.delete("/session/{session_id}")
def delete_session(session_id: str):
    sessions.pop(session_id, None)
    redis_delete_session(session_id)
    return {"ok": True}
